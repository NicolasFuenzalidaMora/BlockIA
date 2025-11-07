import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular';

import { Subscription } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { BlockiaFirestoreService } from 'src/app/services/blockia-firestore.service';
import { AuthService } from 'src/app/services/auth.service';

// Modal del historial
import { HistorialInvitacionesComponent } from '../components/historial-invitaciones/historial-invitaciones.component';

@Component({
  standalone: true,
  selector: 'app-visitas',
  templateUrl: './visitas.page.html',
  styleUrls: ['./visitas.page.scss'],
  imports: [CommonModule, FormsModule, IonicModule, HistorialInvitacionesComponent],
})
export class VisitasPage implements OnInit, OnDestroy {
  visitaName = '';
  visitaPhone = '';
  visitaPatente = '';
  visitaHoraInicio = '';
  visitaHoraFin = '';
  visitas: any[] = [];

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
  ) {}

  ngOnInit() {
    this.cargando = true;
    this.profileSubscription = this.authService.userProfile$.subscribe(userData => {
      if (!userData) {
        this.cargando = false;
        this.misCondominios = [];
        this.condominioSeleccionado = null;
        this.presentToast('Sesión cerrada.', 'warning');
        return;
      }
      this.cargarCondominios(userData);
    });
  }

  async cargarCondominios(userData: any) {
    const condominiosInfoUsuario = userData?.condominios || [];
    const condominiosDondeEsResidenteInfo = condominiosInfoUsuario.filter(
      (condoInfo: any) => condoInfo.rol === 'RESIDENTE'
    );

    if (condominiosDondeEsResidenteInfo.length === 0) {
      this.presentToast('No tienes un condominio asignado como residente para enviar invitaciones.', 'warning');
      this.cargando = false;
      this.misCondominios = [];
      this.condominioSeleccionado = null;
      return;
    }

    try {
      const promesas = condominiosDondeEsResidenteInfo.map((condoInfo: any) =>
        this.firestoreService.getCondominioById(condoInfo.id)
      );
      const condominiosCompletos = (await Promise.all(promesas)).filter(c => c);
      this.misCondominios = condominiosCompletos;

      if (this.misCondominios.length > 0) {
        const stillValid = this.misCondominios.some(c => c.id === this.condominioSeleccionado?.id);
        if (!stillValid) this.condominioSeleccionado = this.misCondominios[0];
      } else {
        this.presentToast('No se encontraron los detalles de tus condominios de residencia.', 'danger');
        this.condominioSeleccionado = null;
      }
    } catch (error) {
      console.error('Error al cargar condominios de residencia:', error);
      this.presentToast('Error al cargar la información de condominios.', 'danger');
      this.condominioSeleccionado = null;
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy() {
    this.profileSubscription?.unsubscribe();
  }

  async cambiarCondominio() {
    if (this.misCondominios.length <= 1) return;

    const alert = await this.alertCtrl.create({
      header: 'Seleccionar Condominio',
      inputs: this.misCondominios.map(condo => ({
        name: 'condominio',
        type: 'radio',
        label: condo.nombre,
        value: condo,
        checked: this.condominioSeleccionado?.id === condo.id,
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aceptar', handler: (data) => { if (data) this.condominioSeleccionado = data; } },
      ],
    });
    await alert.present();
  }

  async addVisitaForm() {
    const anfitrionId = this.authService.currentUser?.uid;
    if (!anfitrionId) return this.presentToast('Error: No se pudo identificar al anfitrión.', 'danger');

    try {
      if (!this.visitaName || !this.visitaPhone || !this.visitaPatente || !this.visitaHoraInicio || !this.visitaHoraFin) {
        return this.presentToast('Completa todos los campos.', 'warning');
      }
      if (!this.condominioSeleccionado) {
        return this.presentToast('Selecciona un condominio válido.', 'warning');
      }
      if (this.visitaHoraFin <= this.visitaHoraInicio) {
        return this.presentToast('La hora de salida debe ser mayor que la de entrada.', 'warning');
      }

      // Teléfono
      let phone = this.visitaPhone.replace(/\s+/g, '');
      if (phone.startsWith('9') && phone.length === 9) phone = '+56' + phone;
      else if (!(phone.startsWith('+569') && phone.length === 12))
        return this.presentToast('Formato de teléfono inválido. Usa +569xxxxxxxx o 9xxxxxxxx.', 'warning');

      // Patente
      const patenteInput = this.visitaPatente.toUpperCase().trim();
      const formatoAuto = /^[A-Z]{4}\d{2}$/;
      const formatoMoto = /^[A-Z]{3}0\d{2}$/;
      if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
        return this.presentToast('Formato de patente inválido. Usa AAAA11 o AAA011.', 'warning');
      }

      const visitanteId = await this.firestoreService.findOrCreateVisitante(
        this.visitaName, phone, patenteInput, this.condominioSeleccionado.id
      );

      const visitaData = {
        anfitrionId,
        visitanteId,
        nombre: this.visitaName,
        telefono: phone,
        patente: patenteInput,
        horaInicio: this.visitaHoraInicio,
        horaFin: this.visitaHoraFin,
        condominioId: this.condominioSeleccionado.id,
        fecha: Timestamp.now()
      };

      await this.firestoreService.registrarVisita(visitaData);

      const mensaje =
        `Hola ${this.visitaName}, has sido invitado a SafeCard 🏡.\n` +
        `Tu acceso es válido desde ${this.visitaHoraInicio} hasta ${this.visitaHoraFin}.\n` +
        `Patente registrada: ${patenteInput}.\n` +
        `Condominio: ${this.condominioSeleccionado.nombre}`;
      const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(mensaje)}`;
      window.open(whatsappUrl, '_blank');

      this.presentToast('Invitación enviada correctamente ✅', 'success');
      this.resetForm();
    } catch (error) {
      console.error('Error al registrar visita:', error);
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

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color });
    toast.present();
  }

  async verHistorialInvitaciones() {
    const user = this.authService.currentUser;
    if (!user) return this.presentToast('No se pudo obtener tu información de usuario.', 'danger');

    const modal = await this.modalCtrl.create({
      component: HistorialInvitacionesComponent,
      componentProps: { userId: user.uid }
    });
    await modal.present();
  }
}
