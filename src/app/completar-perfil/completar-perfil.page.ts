// En: src/app/completar-perfil/completar-perfil.page.ts

import { deleteField } from '@angular/fire/firestore';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons'; // Importar addIcons
import { addCircle, trash } from 'ionicons/icons'; // Importar los iconos necesarios

@Component({
  selector: 'app-completar-perfil',
  templateUrl: './completar-perfil.page.html', // Corresponde al HTML con arrays
  styleUrls: ['./completar-perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class CompletarPerfilPage implements OnInit {

  nombreCompleto: string = '';

  // ✅ Propiedades CORRECTAS para manejar arrays
  patenteActual: string = '';
  patentesAgregadas: string[] = [];
  condominiosSeleccionados: string[] = []; // Array de IDs

  condominios: any[] = [];
  userId: string | null = null;
  cargando = true;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastCtrl: ToastController
  ) {
    // Registrar iconos para el HTML
    addIcons({ addCircle, trash });
  }

  ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      this.userId = user.uid;
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

  // ✅ Funciones CORRECTAS para manejar arrays
// ✅ FUNCIÓN CON VALIDACIÓN DE PATENTE CORRECTA
  agregarPatente() {
    if (this.patenteActual.trim() === '') {
      return; // No agregar patentes vacías
    }

    const patenteInput = this.patenteActual.toUpperCase().trim();

    // --- Validación con Expresiones Regulares ---
    // Formato Auto: 4 letras seguidas de 2 números
    const formatoAuto = /^[A-Z]{4}\d{2}$/;
    // Formato Moto: 3 letras seguidas de 3 números, el primero SIEMPRE 0
    const formatoMoto = /^[A-Z]{3}0\d{2}$/;

    // Verificamos si cumple alguno de los dos formatos
    if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
      // Si no cumple ninguno, mostramos error y detenemos
      this.presentToast('Formato de patente inválido. Use AAAA11 o AAA011.', 'warning');
      return; // Detiene la función aquí si el formato es inválido
    }

    // Si el formato es válido, la agregamos (si no está ya en la lista)
    if (!this.patentesAgregadas.includes(patenteInput)) {
      this.patentesAgregadas.push(patenteInput);
      console.log('Patente agregada:', patenteInput, ' | Array actual:', this.patentesAgregadas);
    } else {
       console.log('Patente ya existe:', patenteInput);
       this.presentToast('Esa patente ya ha sido agregada.', 'warning');
    }

    this.patenteActual = ''; // Limpiar el input después de agregar o si ya existía
  }

  eliminarPatente(index: number) {
    this.patentesAgregadas.splice(index, 1);
  }

  condominiosCambiados(event: any) {
    console.log('Condominios seleccionados:', event.detail.value);
  }

  async guardarPerfil() {
    if (!this.userId) return;
    if (this.patenteActual.trim() !== '') {
      this.agregarPatente();
    }
    if (!this.nombreCompleto || this.patentesAgregadas.length === 0 || this.condominiosSeleccionados.length === 0) {
      this.presentToast('Por favor, completa nombre y agrega al menos una patente y condominio.', 'warning');
      return;
    }

    const datosParaActualizar = {
      nombre: this.nombreCompleto,
      patentes: this.patentesAgregadas, // Array
      condominios: this.condominiosSeleccionados.map(id => ({ id: id, rol: 'RESIDENTE' })), // Array
      perfilCompleto: true,
      patente: deleteField(), // Borrar campo viejo
      condominioId: deleteField() // Borrar campo viejo
      // rol: deleteField() // Descomenta si necesitas borrar 'rol'
    };

    try {
      console.log('DATOS A GUARDAR:', JSON.stringify(datosParaActualizar, null, 2));
      await this.bf.updateUser(this.userId, datosParaActualizar);
      await this.auth.forceProfileRefresh();
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      this.mostrarAlertaError();
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
}