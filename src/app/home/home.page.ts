import { Component, OnDestroy, OnInit } from '@angular/core';
// ✅ 1. Importa IonRefresher y IonRefresherContent
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, 
  IonMenuButton, IonButtons, IonSpinner, IonIcon,
  IonRefresher, IonRefresherContent // <--- Aquí
} from '@ionic/angular/standalone'; 
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController, ToastController, AlertInput } from '@ionic/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    MatButtonModule, CommonModule,
    IonMenuButton, IonButtons, IonSpinner, IonIcon,
    IonRefresher, IonRefresherContent // ✅ 2. Añádelos a los imports
  ],
})
export class HomePage implements OnInit, OnDestroy {
  // ... (tus propiedades existentes: statusMessage, userProfile, etc.) ...
  statusMessage = '';
  Message = '';
  calling = false;
  buttonColor = '#ffffff';

  userProfile: any = null;
  patenteSeleccionada: string | null = null;
  condominioSeleccionado: any = null;
  misCondominiosCompletos: any[] = [];

  cargandoPerfil = true;
  private profileSubscription: Subscription | null = null;

  phone = '+56921850610';
  message = 'OPEN';

  constructor(
    private http: HttpClient,
    private firestore: BlockiaFirestoreService,
    private auth: AuthService,
    private alertController: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cargandoPerfil = true;
    this.profileSubscription = this.auth.userProfile$.subscribe(profile => {
      this.cargandoPerfil = true; // Reinicia carga al recibir nuevo perfil
      if (profile) {
        this.userProfile = profile;
        this.cargarContextoUsuario(profile);
      } else {
        // Manejo si el perfil se vuelve null (logout)
        this.userProfile = null;
        this.patenteSeleccionada = null;
        this.condominioSeleccionado = null;
        this.misCondominiosCompletos = [];
        this.cargandoPerfil = false;
      }
    });
  }

  ionViewWillEnter() {
    // Ya no es estrictamente necesario llamar a cargarContexto aquí si confías
    // en la suscripción, pero no hace daño si quieres asegurar datos frescos al entrar.
    // Lo comentaremos por ahora para evitar doble carga inicial.
    // if (this.userProfile) {
    //   console.log("Actualizando contexto y horarios (ionViewWillEnter)...");
    //   this.cargarContextoUsuario(this.userProfile);
    // }
  }

  // ✅ 3. Nueva función para manejar el evento de refresco
  async handleRefresh(event: any) {
    console.log('Refrescando datos...');
    if (this.userProfile) {
      try {
        await this.cargarContextoUsuario(this.userProfile); // Espera a que termine la carga
        console.log('Datos refrescados.');
      } catch (error) {
        console.error('Error durante el refresco:', error);
        this.presentToast('No se pudo refrescar la información.', 'danger');
      } finally {
        event.target.complete(); // MUY IMPORTANTE: Oculta el spinner del refresher
      }
    } else {
      console.log('Refresco cancelado: No hay perfil de usuario.');
      event.target.complete(); // Oculta el spinner aunque no haya nada que cargar
    }
  }

  async cargarContextoUsuario(profile: any) {
    // ... (Esta función se mantiene EXACTAMENTE IGUAL que antes) ...
    // ... (Con la lógica de patentes, condominios habilitados, visitas, etc.) ...
    this.cargandoPerfil = true;
    // 1. Reseteamos el mensaje y la nueva lista de expirados
    this.statusMessage = '';
    let visitasRecienExpiradas: any[] = []; // Guardará condominios expirados hace < 2 horas

    // --- Lógica de Patente (Retrocompatible) ---
    if (profile.patentes && profile.patentes.length > 0) {
      if (!this.patenteSeleccionada || !profile.patentes.includes(this.patenteSeleccionada)) {
        this.patenteSeleccionada = profile.patentes[0];
      }
    } else if (profile.patente) {
      this.patenteSeleccionada = profile.patente;
    } else {
      this.patenteSeleccionada = null;
    }

    // --- Lógica de Condominios HabilitADOS y EXPIRADOS ---
    let condominiosHabilitados: any[] = [];
    const userCondoArray = profile.condominios || (profile.condominioId ? [{ id: profile.condominioId, rol: 'RESIDENTE' }] : []);

    if (userCondoArray.length > 0) {
      const promesas = userCondoArray.map((c: any) => this.firestore.getCondominioById(c.id));
      const misCondominiosCompletos = (await Promise.all(promesas)).filter(c => c);

      // 1. Lógica de RESIDENTE (Siempre habilitado)
      const condominiosDeResidente = misCondominiosCompletos.filter(condo =>
        userCondoArray.find((c: any) => c.id === condo.id && c.rol === 'RESIDENTE')
      );
      condominiosHabilitados.push(...condominiosDeResidente);

      // 2. Lógica de VISITA (Validación de horario)
      try { // Añadimos try/catch aquí por si falla la obtención de visitas
        const visitasDeHoy = await this.firestore.getTodaysVisitsByPhone(profile.telefono);
        const ahora = new Date();

        const condominiosDeVisita = misCondominiosCompletos.filter(condo =>
          userCondoArray.find((c: any) => c.id === condo.id && c.rol === 'VISITANTE')
        );

        condominiosDeVisita.forEach(condo => {
            if (!condo) return;
            const visitaCorrespondiente = visitasDeHoy.find((v: any) => v.condominioId === condo.id);
            if (!visitaCorrespondiente) return;

            const [horaInicio, minInicio] = visitaCorrespondiente['horaInicio'].split(':');
            const [horaFin, minFin] = visitaCorrespondiente['horaFin'].split(':');

            const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaInicio), parseInt(minInicio)); // Usar parseInt
            const fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaFin), parseInt(minFin)); // Usar parseInt

            const fechaFinMasDosHoras = new Date(fechaFin.getTime() + 7200000);

            if (ahora >= fechaInicio && ahora <= fechaFin) {
              condominiosHabilitados.push(condo);
            } else if (ahora > fechaFin && ahora <= fechaFinMasDosHoras) {
              visitasRecienExpiradas.push(condo);
            }
        });
      } catch (visitError) {
          console.error("Error al obtener o procesar visitas:", visitError);
          // Decide si quieres mostrar un mensaje aquí o dejar que el flujo continúe
          // this.statusMessage = 'Error al verificar visitas.';
      }
    }

    // La lista de "condominios completos" ahora solo contiene los HABILITADOS
    this.misCondominiosCompletos = [...new Map(condominiosHabilitados.map(item => [item.id, item])).values()];

    // --- Lógica de Selección y Mensajes de Estado ---
    if (this.misCondominiosCompletos.length === 1) {
      this.condominioSeleccionado = this.misCondominiosCompletos[0];
    } else if (this.misCondominiosCompletos.length > 1) {
      const seleccionadoSigueValido = this.misCondominiosCompletos.some(c => c.id === this.condominioSeleccionado?.id);
      if (!seleccionadoSigueValido) {
        this.condominioSeleccionado = null; // Resetea si ya no es válido
        // Ya no llamamos a cambiarCondominio automáticamente aquí,
        // el usuario puede hacerlo manualmente si lo necesita.
      } else if (!this.condominioSeleccionado){
        // Si no hay ninguno seleccionado (ej. al inicio), pide elegir
        this.cambiarCondominio();
      }
    } else {
      this.condominioSeleccionado = null; // No hay habilitados
      if (!this.patenteSeleccionada) {
         this.statusMessage = 'No tienes una patente asignada. Revisa tu perfil.';
      } else if (visitasRecienExpiradas.length > 0) {
         this.statusMessage = `Tu invitación para ${visitasRecienExpiradas[0].nombre} ha expirado recientemente.`;
      } else {
         this.statusMessage = 'No tienes condominios con acceso activo en este momento.';
      }
    }
    this.cargandoPerfil = false; // Marcamos como cargado al final
  }


  // ... (cambiarCondominio, cambiarPatente, enviarSMS, procederConApertura, presentToast, ngOnDestroy se mantienen igual) ...
  async cambiarCondominio() {
    if (this.misCondominiosCompletos.length <= 1) return;
    const alertInputs: AlertInput[] = this.misCondominiosCompletos.map((condo: any) => ({
      type: 'radio', label: condo.nombre, value: condo, checked: this.condominioSeleccionado && condo.id === this.condominioSeleccionado.id
    }));
    const alert = await this.alertController.create({
      header: 'Selecciona Condominio', inputs: alertInputs, backdropDismiss: false,
      buttons: [{
        text: 'Confirmar',
        handler: (selectedCondo) => {
          if (!selectedCondo) { this.presentToast('Debes seleccionar un condominio.'); return false; }
          this.condominioSeleccionado = selectedCondo; return true;
        }
      }],
    });
    await alert.present();
  }

  async cambiarPatente() {
    const patentes = this.userProfile?.patentes || (this.userProfile?.patente ? [this.userProfile.patente] : []);
    if (patentes.length <= 1) return;
    const alertInputs: AlertInput[] = patentes.map((patente: string) => ({
      type: 'radio', label: patente, value: patente, checked: patente === this.patenteSeleccionada
    }));
    const alert = await this.alertController.create({
      header: 'Selecciona tu Patente', inputs: alertInputs, buttons: [
        { text: 'Cancelar', role: 'cancel' }, { text: 'Confirmar', handler: (p) => { if (p) this.patenteSeleccionada = p; } },
      ]
    });
    await alert.present();
  }

  enviarSMS() {
    if (!this.patenteSeleccionada) { this.presentToast('No se ha seleccionado una patente.'); return; }
    if (!this.condominioSeleccionado) { this.presentToast('No se ha seleccionado un condominio.'); return; }
    this.procederConApertura();
  }

  procederConApertura() {
    this.statusMessage = 'Espere un momento...';
    this.Message = 'Apertura iniciada'; this.calling = true;
    const url = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';
    this.http.post(url, { to: this.phone, message: this.message }).subscribe({
      next: () => {
        const historialData = {
          userId: this.userProfile.id,
          condominioId: this.condominioSeleccionado.id,
          patente: this.patenteSeleccionada,
        };
        this.firestore.addHistorialApertura(historialData);
        this.buttonColor = '#4CAF50';
        setTimeout(() => { this.buttonColor = '#ffffff'; }, 3000);
        this.statusMessage = `Apertura registrada para ${this.condominioSeleccionado.nombre}`;
      },
      error: () => { this.calling = false; this.statusMessage = '❌ Error al enviar el SMS'; },
      complete: () => { setTimeout(() => { this.statusMessage = ''; this.calling = false; }, 15000); }
    });
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') { // Added color param back
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color });
    toast.present();
  }

  ngOnDestroy() {
    if (this.profileSubscription) { this.profileSubscription.unsubscribe(); }
  }
}