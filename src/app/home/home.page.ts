// Ruta: src/app/home/home.page.ts
// VERSIÓN COMPLETA FINAL: INCLUYE CONSERJE + ESTADOS + CORRECCIÓN DOBLE POPUP

import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonMenuButton, IonButtons, IonSpinner, IonIcon,
  IonRefresher, IonRefresherContent, IonItem, IonLabel // Añadidos IonItem, IonLabel
} from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController, ToastController, AlertInput } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { hourglassOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    MatButtonModule, CommonModule,
    IonMenuButton, IonButtons, IonSpinner, IonIcon,
    IonRefresher, IonRefresherContent, IonItem, IonLabel
  ],
})
export class HomePage implements OnInit, OnDestroy {
  statusMessage = '';
  Message = '';
  calling = false;
  buttonColor = '#ffffff';

  userProfile: any = null;
  patenteSeleccionada: string | null = null;
  condominioSeleccionado: any = null;
  misCondominiosCompletos: any[] = []; // Lista FINAL de condominios habilitados

  cargandoPerfil = true;
  estadoUsuario: 'cargando' | 'aprobado' | 'pendiente' | 'incompleto' = 'cargando';
  private profileSubscription: Subscription | null = null;

  // Flag para evitar doble popup de selección de condominio
  private showingCondoSelector = false;

  // Datos para SMS (ajusta según necesites)
  phone = '+56921850610';
  message = 'OPEN';

  constructor(
    private http: HttpClient,
    private firestore: BlockiaFirestoreService,
    private auth: AuthService,
    private alertController: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    private changeDetector: ChangeDetectorRef
  ) {
      addIcons({ hourglassOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    console.log("HomePage ngOnInit");
    this.cargandoPerfil = true;
    this.estadoUsuario = 'cargando';

    this.profileSubscription = this.auth.userProfile$.subscribe(profile => {
      console.log("Recibido perfil en Home:", profile ? `Perfil ${profile.id}` : 'Perfil NULL');
      // Solo recarga si el perfil recibido es REALMENTE diferente al actual
      // (Evita bucles si Firestore emite el mismo objeto varias veces)
      if (JSON.stringify(profile) !== JSON.stringify(this.userProfile)) {
          console.log("Perfil diferente detectado, actualizando contexto...");
          this.cargandoPerfil = true; // Reinicia carga
          this.estadoUsuario = 'cargando'; // Vuelve a cargando
          this.userProfile = profile; // Actualiza perfil local

          if (profile) {
            this.cargarContextoUsuario(profile); // Procesa el nuevo perfil
          } else {
            // Manejo si el perfil se vuelve null (logout)
            this.patenteSeleccionada = null;
            this.condominioSeleccionado = null;
            this.misCondominiosCompletos = [];
            this.estadoUsuario = 'cargando'; // O 'no_logueado'
            this.cargandoPerfil = false;
            this.changeDetector.detectChanges();
          }
      } else {
          console.log("Perfil recibido es igual al actual, no se recarga contexto.");
          // Si estaba cargando pero el perfil sigue null, marca como no cargando
          if(this.cargandoPerfil && !profile){
              this.cargandoPerfil = false;
              this.changeDetector.detectChanges();
          }
      }
    });
  }

  ngOnDestroy() {
    console.log("HomePage ngOnDestroy: Cancelando suscripción.");
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
     // Intenta recargar solo si no está ya cargando y tiene un perfil
     // Útil si vienes de editar perfil, por ejemplo
     if (this.userProfile && !this.cargandoPerfil) {
       console.log("Actualizando contexto (ionViewWillEnter)...");
       this.cargarContextoUsuario(this.userProfile);
     }
  }

  async handleRefresh(event: any) {
    console.log('Refrescando datos...');
    if (this.userProfile) {
      try {
        await this.cargarContextoUsuario(this.userProfile); // Recarga todo
        console.log('Datos refrescados.');
      } catch (error) {
         console.error('Error durante el refresco:', error);
         this.presentToast('No se pudo refrescar la información.', 'danger');
      } finally { event.target.complete(); }
    } else {
      console.log('Refresco cancelado: No hay perfil de usuario.');
      event.target.complete();
    }
  }

  /** Función principal que procesa el perfil y determina el estado */
  async cargarContextoUsuario(profile: any) {
    console.log("Iniciando cargarContextoUsuario...");
    // Mantenemos cargandoPerfil=false si ya estaba aprobado para evitar parpadeo
    // Solo lo ponemos a true si el estado NO era 'aprobado' antes
    if(this.estadoUsuario !== 'aprobado') {
        this.cargandoPerfil = true;
    }
    this.statusMessage = '';
    let visitasRecienExpiradas: any[] = [];
    let condominiosHabilitados: any[] = [];

    // --- Determinar Estado General ---
    if (!profile.perfilCompleto) {
        this.estadoUsuario = 'incompleto';
        console.log("Perfil incompleto, redirigiendo...");
        setTimeout(() => this.router.navigate(['/completar-perfil'], { replaceUrl: true }), 0);
        this.cargandoPerfil = false; this.changeDetector.detectChanges(); return;
    }
    else if (!profile.condominios || profile.condominios.length === 0) {
        this.estadoUsuario = 'pendiente';
        console.log("Perfil completo pero sin condominios asignados (pendiente).");
        this.misCondominiosCompletos = []; this.condominioSeleccionado = null;
        this.cargandoPerfil = false; this.changeDetector.detectChanges(); return;
    }
    this.estadoUsuario = 'aprobado'; // Asumimos aprobado y filtramos
    console.log("Perfil completo y con condominios, procesando acceso...");

    // --- Lógica de Patente ---
    if (profile.patentes && profile.patentes.length > 0) {
      if (!this.patenteSeleccionada || !profile.patentes.includes(this.patenteSeleccionada)) {
        this.patenteSeleccionada = profile.patentes[0];
      }
    } else { this.patenteSeleccionada = null; }
    console.log("Patente seleccionada:", this.patenteSeleccionada);

    // --- Lógica de Condominios Habilitados ---
    const userCondoArray = profile.condominios || [];
    if (userCondoArray.length > 0) {
      const promesasDetalles = userCondoArray.map((c: any) => this.firestore.getCondominioById(c.id));
      const condominiosConDetalles = (await Promise.all(promesasDetalles)).filter(Boolean);

      // 1. Añadir RESIDENTE o CONSERJERIA
      const condominiosPorRolFijo = condominiosConDetalles.filter(condo =>
          userCondoArray.find((c: any) => c.id === condo.id &&
              (c.rol === 'RESIDENTE' || c.rol === 'CONSERJERIA' || c.rol === 'conserjeria') // Incluye Conserje
          )
      );
      condominiosHabilitados.push(...condominiosPorRolFijo);
      console.log(`Condominios habilitados por rol RESIDENTE/CONSERJERIA: ${condominiosPorRolFijo.length}`);

      // 2. Añadir VISITA (con validación de horario)
      const condominiosDondeEsVisitaRefs = userCondoArray.filter((c: any) => c.rol === 'VISITANTE');
      if (condominiosDondeEsVisitaRefs.length > 0) {
          try {
              const visitasDeHoy = await this.firestore.getTodaysVisitsByPhone(profile.telefono);
              const ahora = new Date();
              console.log(`Visitas encontradas para hoy: ${visitasDeHoy?.length || 0}`);

              // Asegura que visitasDeHoy sea un array antes de iterar
              if(Array.isArray(visitasDeHoy)){
                  condominiosDondeEsVisitaRefs.forEach((visitaRef: any) => {
                      const condo = condominiosConDetalles.find(cd => cd.id === visitaRef.id);
                      if (!condo) return;
                      const visitaCorrespondiente = visitasDeHoy.find((v: any) => v.condominioId === condo.id);

                      if (!visitaCorrespondiente || !visitaCorrespondiente['horaInicio'] || !visitaCorrespondiente['horaFin']) {
                          console.log(`No se encontró visita válida o con horarios para ${condo.nombre}`); return;
                      }
                      try {
                          const [horaInicio, minInicio] = visitaCorrespondiente['horaInicio'].split(':');
                          const [horaFin, minFin] = visitaCorrespondiente['horaFin'].split(':');
                          const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaInicio), parseInt(minInicio));
                          const fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaFin), parseInt(minFin));
                          const fechaFinMasDosHoras = new Date(fechaFin.getTime() + 7200000);

                          if (ahora >= fechaInicio && ahora <= fechaFin) { condominiosHabilitados.push(condo); console.log(`Visita a ${condo.nombre} HABILITADA.`); }
                          else if (ahora > fechaFin && ahora <= fechaFinMasDosHoras) { visitasRecienExpiradas.push(condo); console.log(`Visita a ${condo.nombre} RECIÉN EXPIRADA.`); }
                          else { console.log(`Visita a ${condo.nombre} FUERA DE HORARIO.`); }
                      } catch (timeError) { console.error(`Error procesando horarios para ${condo.nombre}:`, timeError); }
                  });
              } else {
                   console.warn("getTodaysVisitsByPhone no devolvió un array.");
              }
          } catch (visitError) { console.error("Error al obtener o procesar visitas:", visitError); }
      }
    }

    // Eliminamos duplicados
    this.misCondominiosCompletos = [...new Map(condominiosHabilitados.map(item => [item.id, item])).values()];
    console.log(`Total condominios HABILITADOS (final): ${this.misCondominiosCompletos.length}`, this.misCondominiosCompletos.map(c=>c.nombre));

    // --- Lógica de Selección y Mensajes ---
    if (this.misCondominiosCompletos.length === 1) {
      this.condominioSeleccionado = this.misCondominiosCompletos[0];
      console.log("Condominio único seleccionado:", this.condominioSeleccionado?.nombre);
    } else if (this.misCondominiosCompletos.length > 1) {
      const seleccionadoSigueValido = this.misCondominiosCompletos.some(c => c.id === this.condominioSeleccionado?.id);
      if (!seleccionadoSigueValido || !this.condominioSeleccionado) {
        this.condominioSeleccionado = null;
        console.log("Pidiendo elegir condominio (múltiples disponibles o selección inválida).");
        // Solo llama a cambiar si no se está mostrando ya
        if (!this.showingCondoSelector) {
            this.showingCondoSelector = true; // Marca que lo vamos a mostrar
            setTimeout(() => this.cambiarCondominio(), 50); // Llama con delay
        }
      } else { console.log("Selección actual sigue válida:", this.condominioSeleccionado.nombre); }
    } else { // Cero habilitados
      this.condominioSeleccionado = null;
      this.estadoUsuario = 'pendiente'; // Cambia estado
      console.log("No hay condominios habilitados. Estado cambiado a 'pendiente'.");
      if (!this.patenteSeleccionada) { this.statusMessage = 'No tienes patente asignada.'; }
      else if (visitasRecienExpiradas.length > 0) { this.statusMessage = `Tu invitación para ${visitasRecienExpiradas[0]?.nombre} expiró.`; }
      else { this.statusMessage = 'No tienes acceso activo a condominios.'; }
    }

    this.cargandoPerfil = false; // Fin carga
    console.log("Fin cargarContextoUsuario. Estado final:", this.estadoUsuario);
    this.changeDetector.detectChanges(); // Actualiza HTML
  }


  /** Muestra alerta para cambiar de condominio */
  async cambiarCondominio() {
    console.log("Mostrando selector de condominio...");
    if (!this.misCondominiosCompletos || this.misCondominiosCompletos.length <= 1) {
        this.showingCondoSelector = false; // Asegura resetear flag
        console.log("No hay múltiples condominios habilitados para elegir.");
        return;
    }
    const alertInputs: AlertInput[] = this.misCondominiosCompletos.map((condo: any) => ({
      type: 'radio', label: condo.nombre, value: condo, checked: this.condominioSeleccionado?.id === condo.id
    }));
    const alert = await this.alertController.create({
      header: 'Selecciona Condominio', inputs: alertInputs, backdropDismiss: false,
      buttons: [{
        text: 'Confirmar',
        handler: (selectedCondo) => {
          this.showingCondoSelector = false; // Resetea flag al confirmar
          if (!selectedCondo) { this.presentToast('Debes seleccionar un condominio.', 'warning'); return false; }
          this.condominioSeleccionado = selectedCondo;
          console.log("Condominio cambiado a:", selectedCondo.nombre);
          this.changeDetector.detectChanges(); // Actualiza vista
          return true;
        }
      }],
      // Opcional: Si quieres botón cancelar o backdropDismiss: true
      // buttons: [ { text: 'Cancelar', role: 'cancel', handler: () => { this.showingCondoSelector = false; } }, /* Botón Confirmar */ ]
      // backdropDismiss: true,
    });
    // Si usas backdropDismiss: true, añade esto:
    // alert.onDidDismiss().then(() => { this.showingCondoSelector = false; });
    await alert.present();
  }

  /** Muestra alerta para cambiar de patente */
  async cambiarPatente() {
      console.log("Mostrando selector de patente...");
      const patentes = this.userProfile?.patentes || [];
      if (patentes.length <= 1) return;
      const alertInputs: AlertInput[] = patentes.map((patente: string) => ({ type: 'radio', label: patente, value: patente, checked: patente === this.patenteSeleccionada }));
      const alert = await this.alertController.create({
        header: 'Selecciona tu Patente', inputs: alertInputs,
        buttons: [ { text: 'Cancelar', role: 'cancel' }, { text: 'Confirmar', handler: (p) => { if (p) this.patenteSeleccionada = p; console.log("Patente cambiada a:", p); this.changeDetector.detectChanges();} }, ]
      });
      await alert.present();
  }

  /** Inicia el proceso de apertura validando selección */
  enviarSMS() {
      console.log("Intentando enviar SMS...");
      if (!this.patenteSeleccionada) { this.presentToast('Selecciona una patente.', 'warning'); return; }
      if (!this.condominioSeleccionado) { this.presentToast('Selecciona un condominio.', 'warning'); return; }
      if (this.calling) { console.log("Llamada ya en progreso."); return; }
      this.procederConApertura();
  }

  /** Llama al servicio SMS y registra en historial */
  procederConApertura() {
      console.log(`Iniciando apertura para ${this.condominioSeleccionado.nombre} con patente ${this.patenteSeleccionada}`);
      this.statusMessage = 'Activando...'; this.Message = 'Activando'; this.calling = true; this.buttonColor = '#ffcc00';
      const url = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';
      const body = { to: this.phone, message: this.message };
      this.http.post(url, body).subscribe({
        next: (res: any) => {
          console.log("Respuesta SMS:", res);
          const historialData = { userId: this.userProfile.id, condominioId: this.condominioSeleccionado.id, patente: this.patenteSeleccionada };
          this.firestore.addHistorialApertura(historialData).then(() => console.log("Historial guardado.")).catch(err => console.error("Error guardando historial:", err));
          this.buttonColor = '#4CAF50'; this.statusMessage = `Acceso Activado`; this.Message = 'Activado';
          setTimeout(() => { this.buttonColor = '#ffffff'; this.Message = 'Abrir'; }, 3000);
        },
        error: (err: any) => {
          console.error("Error al enviar SMS:", err); this.calling = false; this.buttonColor = '#f44336'; this.statusMessage = '❌ Error al activar'; this.Message = 'Error';
          setTimeout(() => { this.buttonColor = '#ffffff'; this.Message = 'Abrir'; this.statusMessage = ''; }, 5000);
        },
        complete: () => {
          console.log("Llamada SMS completada.");
          setTimeout(() => { if (this.Message !== 'Error') { this.statusMessage = ''; } this.calling = false; }, 8000);
        }
      });
  }

  /** Muestra mensajes Toast */
  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
      const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color });
      toast.present();
  }

} // <-- Fin de la clase HomePage