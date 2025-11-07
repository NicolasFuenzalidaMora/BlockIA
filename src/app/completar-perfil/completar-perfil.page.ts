// Ruta: src/app/completar-perfil/completar-perfil.page.ts

import { deleteField } from '@angular/fire/firestore';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircle, trash } from 'ionicons/icons';

@Component({
  selector: 'app-completar-perfil',
  templateUrl: './completar-perfil.page.html',
  styleUrls: ['./completar-perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class CompletarPerfilPage implements OnInit {

  nombreCompleto: string = '';
  patenteActual: string = '';
  patentesAgregadas: string[] = [];
  condominiosSeleccionados: string[] = []; // Array de IDs
  departamento: string = ''; // <-- MANTENIDO
  
  condominios: any[] = [];
  userId: string | null = null;
  userPhone: string | null = null; // <-- Necesario para la solicitud
  cargando = true;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ addCircle, trash });
  }

  ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      this.userId = user.uid;
      this.userPhone = user.phoneNumber; // <-- Guardamos el teléfono
      this.cargarCondominios();
    } else {
      this.router.navigate(['/login-phone']);
    }
  }

  async cargarCondominios() {
    this.cargando = true;
    try {
      this.condominios = await this.bf.getCondominios();
      console.log('Condominios cargados:', this.condominios);
    } catch (error) {
      console.error("Error cargando condominios:", error);
      this.presentToast('No se pudieron cargar los condominios.');
    } finally {
      this.cargando = false;
    }
  }

  // ... (agregarPatente y eliminarPatente se quedan igual) ...
  agregarPatente() {
    if (this.patenteActual.trim() === '') {
      return;
    }
    const patenteInput = this.patenteActual.toUpperCase().trim();
    const formatoAuto = /^[A-Z]{4}\d{2}$/;
    const formatoMoto = /^[A-Z]{3}0\d{2}$/;

    if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
      this.presentToast('Formato de patente inválido. Use AAAA11 o AAA011.', 'warning');
      return;
    }
    if (!this.patentesAgregadas.includes(patenteInput)) {
      this.patentesAgregadas.push(patenteInput);
    } else {
       this.presentToast('Esa patente ya ha sido agregada.', 'warning');
    }
    this.patenteActual = '';
  }

  eliminarPatente(index: number) {
    this.patentesAgregadas.splice(index, 1);
  }

  condominiosCambiados(event: any) {
    console.log('Condominios seleccionados:', event.detail.value);
  }

  // ✅ [MODIFICADO] Lógica para enviar solicitud
  async enviarSolicitud() {
    if (!this.userId) return;
    if (this.patenteActual.trim() !== '') {
      this.agregarPatente();
      if (this.patenteActual.trim() !== '') return; // Falló la validación de patente
    }
    if (!this.nombreCompleto || this.patentesAgregadas.length === 0 || this.condominiosSeleccionados.length === 0 || !this.departamento) {
      this.presentToast('Por favor, completa nombre, depto. y agrega al menos una patente y condominio.', 'warning');
      return;
    }

    this.cargando = true;

    try {
      // 1. Actualiza el perfil del usuario (sin condominios)
      const datosParaActualizar = {
        nombre: this.nombreCompleto,
        patentes: this.patentesAgregadas,
        departamento: this.departamento, // Guarda el depto en la raíz
        perfilCompleto: true,
        patente: deleteField(), // Borrar campo viejo
        condominioId: deleteField() // Borrar campo viejo
      };
      console.log('Actualizando perfil de usuario:', datosParaActualizar);
      await this.bf.updateUser(this.userId, datosParaActualizar);

      // 2. Crea una solicitud por cada condominio seleccionado
      const promesasSolicitudes = this.condominiosSeleccionados.map(condoId => {
        const solicitudData = {
          userId: this.userId,
          nombreUsuario: this.nombreCompleto,
          telefonoUsuario: this.userPhone,
          patentes: this.patentesAgregadas,
          condominioId: condoId,
          departamento: this.departamento
        };
        console.log('Creando solicitud:', solicitudData);
        return this.bf.crearSolicitudDeAcceso(solicitudData);
      });
      
      await Promise.all(promesasSolicitudes);

      // 3. Forzar refresco y navegar
      await this.auth.forceProfileRefresh();
      await this.mostrarAlertaExito(); // Mostrar pop-up
      this.router.navigate(['/home'], { replaceUrl: true });

    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      this.mostrarAlertaError();
    } finally {
      this.cargando = false;
    }
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color });
    toast.present();
  }

  async mostrarAlertaError() {
    const alert = await this.alertController.create({
      header: 'Error', message: 'No se pudo guardar tu información.', buttons: ['OK'],
    });
    await alert.present();
  }

  // ✅ NUEVO: Alerta de éxito
  async mostrarAlertaExito() {
    const alert = await this.alertController.create({
      header: '¡Solicitud Enviada!',
      message: 'Tu solicitud de acceso ha sido enviada. Serás notificado cuando el administrador la apruebe.',
      buttons: ['OK'],
    });
    await alert.present();
  }
}