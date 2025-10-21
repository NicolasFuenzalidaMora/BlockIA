// En: src/app/components/historial-invitaciones/historial-invitaciones.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { BlockiaFirestoreService } from '../../services/blockia-firestore.service';
// ✅ 1. Importa addIcons y los íconos necesarios
import { addIcons } from 'ionicons';
import { close, closeCircleOutline, documentTextOutline } from 'ionicons/icons';

@Component({
  selector: 'app-historial-invitaciones',
  templateUrl: './historial-invitaciones.component.html',
  styleUrls: ['./historial-invitaciones.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HistorialInvitacionesComponent implements OnInit {

  @Input() userId: string = '';
  invitaciones: any[] = [];
  cargando = true;

  constructor(
    private bf: BlockiaFirestoreService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    // ✅ 2. Registra los íconos
    addIcons({ close, closeCircleOutline, documentTextOutline });
  }

  // ... (El resto de tu componente: ngOnInit, cargarHistorial, etc. se mantienen igual) ...
  ngOnInit() {
    if (this.userId) {
      this.cargarHistorial();
    } else {
      console.error("HistorialInvitacionesModal: No se recibió userId.");
      this.cargando = false;
    }
  }

  async cargarHistorial() {
    this.cargando = true;
    try {
      this.invitaciones = await this.bf.getInvitacionesEnviadasPorUsuario(this.userId);
      console.log('Invitaciones cargadas:', this.invitaciones);
    } catch (error) {
      console.error("Error al cargar historial de invitaciones:", error);
      this.presentToast('Error al cargar el historial.', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async cancelarInvitacion(invitacion: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Cancelación',
      message: `¿Estás seguro de que deseas cancelar la invitación para ${invitacion.nombre}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'No, mantener', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'confirm',
          handler: async () => {
            try {
              await this.bf.deleteInvitacionById(invitacion.id);
              this.invitaciones = this.invitaciones.filter(inv => inv.id !== invitacion.id);
              this.presentToast('Invitación cancelada con éxito.', 'success');
            } catch (error) {
              console.error('Error en handler de cancelación:', error);
              this.presentToast('No se pudo cancelar la invitación.', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: color 
    });
    toast.present();
  }
}