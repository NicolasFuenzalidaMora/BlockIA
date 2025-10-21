// En: src/app/visitas/visitas.page.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { BlockiaFirestoreService } from 'src/app/services/blockia-firestore.service';
import { Timestamp } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular'; // Import all needed Ionic controllers
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { addIcons } from 'ionicons';
import { clipboardOutline } from 'ionicons/icons'; // Import the icon for the FAB button

// Import the component for the history modal
import { HistorialInvitacionesComponent } from '../components/historial-invitaciones/historial-invitaciones.component';

@Component({
  standalone: true,
  selector: 'app-visitas',
  templateUrl: './visitas.page.html',
  styleUrls: ['./visitas.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HistorialInvitacionesComponent // Import the modal component if opening from here
  ],
})
export class VisitasPage implements OnInit, OnDestroy {
  visitaName = '';
  visitaPhone = '';
  visitaPatente = '';
  visitaHoraInicio = '';
  visitaHoraFin = '';
  visitas: any[] = []; // Assuming this might be used later? Currently unused in provided logic.

  misCondominios: any[] = [];
  condominioSeleccionado: any = null;
  cargando = true;
  private profileSubscription: Subscription | null = null;

  constructor(
    private firestoreService: BlockiaFirestoreService,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {
    // Register icons used in this component (including the FAB button)
    addIcons({ clipboardOutline });
  }

  ngOnInit() {
    this.cargando = true;
    this.profileSubscription = this.authService.userProfile$.subscribe(userData => {
      if (!userData) {
        this.cargando = false;
        // Optionally show a message or redirect if user logs out while on this page
        this.misCondominios = [];
        this.condominioSeleccionado = null;
        this.presentToast('Sesión cerrada.', 'warning');
        return;
      }
      this.cargarCondominios(userData);
    });
  }

async cargarCondominios(userData: any) {
    // Obtenemos el array de objetos {id, rol} del perfil del usuario
    const condominiosInfoUsuario = userData?.condominios || [];

    // ✅ 1. FILTRAMOS para quedarnos solo con los condominios donde es RESIDENTE
    const condominiosDondeEsResidenteInfo = condominiosInfoUsuario.filter(
      (condoInfo: any) => condoInfo.rol === 'RESIDENTE'
    );

    // Si después de filtrar no queda ninguno, no puede enviar invitaciones
    if (condominiosDondeEsResidenteInfo.length === 0) {
      this.presentToast('No tienes un condominio asignado como residente para enviar invitaciones.', 'warning');
      this.cargando = false;
      this.misCondominios = []; // Lista vacía
      this.condominioSeleccionado = null;
      // Aquí podrías deshabilitar el formulario si quieres
      return;
    }

    // Ahora cargamos los detalles COMPLETOS solo de los condominios donde es residente
    try {
      // ✅ 2. Mapeamos solo los IDs de los condominios filtrados
      const promesas = condominiosDondeEsResidenteInfo.map((condoInfo: any) =>
        this.firestoreService.getCondominioById(condoInfo.id)
      );
      const condominiosCompletos = (await Promise.all(promesas)).filter(c => c);

      // ✅ 3. Asignamos la lista filtrada y completa a 'misCondominios'
      this.misCondominios = condominiosCompletos;

      if (this.misCondominios.length > 0) {
        // Mantenemos la selección actual si sigue siendo válida en la nueva lista, si no, ponemos el primero
        const currentSelectionStillValid = this.misCondominios.some(c => c.id === this.condominioSeleccionado?.id);
        if (!currentSelectionStillValid) {
             this.condominioSeleccionado = this.misCondominios[0];
        }
      } else {
        // Esto podría pasar si los IDs en el perfil no coinciden con condominios reales
        this.presentToast('No se encontraron los detalles de tus condominios de residencia.', 'danger');
        this.condominioSeleccionado = null;
      }
    } catch (error) {
      console.error("Error al cargar condominios de residencia:", error);
      this.presentToast('Error al cargar la información de condominios.', 'danger');
      this.condominioSeleccionado = null;
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy() {
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  async cambiarCondominio() {
    if (this.misCondominios.length <= 1) return; // No need if only one

    const alert = await this.alertCtrl.create({
      header: 'Seleccionar Condominio',
      inputs: this.misCondominios.map(condo => ({
        name: 'condominio',
        type: 'radio',
        label: condo.nombre,
        value: condo,
        checked: this.condominioSeleccionado?.id === condo.id, // Safer check
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aceptar', handler: (data) => { if (data) this.condominioSeleccionado = data; } },
      ],
    });
    await alert.present();
  }

  // ✅ Función addVisitaForm con todas las validaciones
  async addVisitaForm() {
    const anfitrionId = this.authService.currentUser?.uid;
    if (!anfitrionId) {
        return this.presentToast('Error: No se pudo identificar al anfitrión.', 'danger');
    }

    try {
      // --- VALIDACIONES INICIALES ---
      if (!this.visitaName || !this.visitaPhone || !this.visitaPatente || !this.visitaHoraInicio || !this.visitaHoraFin) {
        return this.presentToast('Completa todos los campos.', 'warning');
      }
      if (!this.condominioSeleccionado) {
        return this.presentToast('Selecciona un condominio válido.', 'warning');
      }
      if (this.visitaHoraFin <= this.visitaHoraInicio) {
        return this.presentToast('La hora de salida debe ser mayor que la de entrada.', 'warning');
      }

      // --- VALIDACIÓN DE TELÉFONO ---
      let phone = this.visitaPhone.replace(/\s+/g, ''); // Quitar espacios
      if (phone.startsWith('9') && phone.length === 9) {
          phone = '+56' + phone; // Convertimos a formato E.164
      } else if (phone.startsWith('+569') && phone.length === 12) {
          // Ya está en formato E.164
      } else {
          return this.presentToast('Formato de teléfono inválido. Usa +569xxxxxxxx o 9xxxxxxxx.', 'warning');
      }

      // --- VALIDACIÓN DE PATENTE ---
      const patenteInput = this.visitaPatente.toUpperCase().trim();
      const formatoAuto = /^[A-Z]{4}\d{2}$/;
      const formatoMoto = /^[A-Z]{3}0\d{2}$/;

      if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
        return this.presentToast('Formato de patente inválido. Usa AAAA11 o AAA011.', 'warning');
      }

      // --- Si todas las validaciones pasan, continuamos ---

      // Buscar o crear visitante
      const visitanteId = await this.firestoreService.findOrCreateVisitante(
        this.visitaName, phone, patenteInput, this.condominioSeleccionado.id
      );

      // Registrar la visita
      const visitaData = {
        anfitrionId: anfitrionId,
        visitanteId,
        nombre: this.visitaName,
        telefono: phone, // Usamos el número formateado
        patente: patenteInput, // Usamos la patente formateada
        horaInicio: this.visitaHoraInicio,
        horaFin: this.visitaHoraFin,
        condominioId: this.condominioSeleccionado.id,
        fecha: Timestamp.now()
      };

      await this.firestoreService.registrarVisita(visitaData);

      // Enviar mensaje por WhatsApp
      const mensaje = `Hola ${this.visitaName}, has sido invitado a SafeCard 🏡.\nTu acceso es válido desde ${this.visitaHoraInicio} hasta ${this.visitaHoraFin}.\nPatente registrada: ${patenteInput}.\nCondominio: ${this.condominioSeleccionado.nombre}`;
      const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');

      this.presentToast('Invitación enviada correctamente ✅', 'success');
      this.resetForm();

    } catch (error) {
      console.error("Error al registrar visita:", error);
      this.presentToast('Error al registrar la visita ❌', 'danger');
    }
  }

  resetForm() {
    this.visitaName = '';
    this.visitaPhone = '';
    this.visitaPatente = '';
    this.visitaHoraInicio = '';
    this.visitaHoraFin = '';
  }

  // ✅ presentToast con colores
  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') { // Permitimos 'dark' por defecto
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  openContacts() {
    this.presentToast('Función "Invitar desde contactos" en desarrollo.', 'warning');
  }

  // ✅ Función para abrir el modal de historial
  async verHistorialInvitaciones() {
    const user = this.authService.currentUser;
    if (!user) {
      return this.presentToast('No se pudo obtener tu información de usuario.', 'danger');
    }

    const modal = await this.modalCtrl.create({
      component: HistorialInvitacionesComponent,
      componentProps: {
        userId: user.uid
      }
    });
    await modal.present();
  }
}