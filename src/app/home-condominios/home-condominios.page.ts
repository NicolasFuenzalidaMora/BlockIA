// Ruta: src/app/home-condominios/home-condominios.page.ts
// VERSIÓN COMPLETA Y CORREGIDA

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonButton, AlertController, ToastController // Importado AlertController y ToastController
} from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';

@Component({
  selector: 'app-home-condominios',
  templateUrl: 'home-condominios.page.html',
  styleUrls: ['home-condominios.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonButton, MatButtonModule, CommonModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeCondominiosPage implements OnInit {
  condominios: any[] = [];
  usuarios: any[] = [];
  cargandoCondominios = true;
  cargandoUsuarios = true;

  constructor(
    private bf: BlockiaFirestoreService,
    private alertController: AlertController,
    // Inyectamos ToastController si vamos a usar presentToast
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await Promise.all([this.cargarCondominios(), this.cargarUsuarios()]);
  }

  // =======================
  // 🔹 Condominios
  // =======================
  async cargarCondominios() {
    this.cargandoCondominios = true; // Iniciar carga
    try {
      this.condominios = await this.bf.getCondominios();
      console.log('Condominios obtenidos:', this.condominios);
    } catch (err) {
      console.error('Error al consultar condominios:', err);
      await this.presentToast('Error al cargar condominios', 'danger'); // Mostrar error
    } finally {
      this.cargandoCondominios = false; // Finalizar carga
    }
  }

  // =======================
  // 🔹 Usuarios
  // =======================
  async cargarUsuarios() {
    this.cargandoUsuarios = true; // Iniciar carga
    try {
      this.usuarios = await this.bf.getUsers();
      console.log('Usuarios obtenidos:', this.usuarios);
    } catch (err) {
      console.error('Error al consultar usuarios:', err);
      await this.presentToast('Error al cargar usuarios', 'danger'); // Mostrar error
    } finally {
      this.cargandoUsuarios = false; // Finalizar carga
    }
  }

  // ===================================
  // ✨ FUNCIÓN PARA CREAR CONDOMINIOS (CORREGIDA)
  // ===================================
  async crearNuevoCondominio() {
    const alert = await this.alertController.create({
      header: 'Nuevo Condominio',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre del condominio',
          attributes: { required: true }
        },
        {
          name: 'direccion',
          type: 'text',
          placeholder: 'Dirección del condominio',
          attributes: { required: true }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: async (data) => {
            // Validamos que AMBOS campos tengan valor y no sean solo espacios
            const nombreValido = data.nombre && data.nombre.trim() !== '';
            const direccionValida = data.direccion && data.direccion.trim() !== '';

            if (nombreValido && direccionValida) {
              try {
                // Creamos el objeto SÓLO con nombre y dirección
                const nuevoCondo = {
                  nombre: data.nombre.trim(),
                  direccion: data.direccion.trim()
                };

                await this.bf.addCondominio(nuevoCondo);
                await this.presentToast('Condominio creado con éxito', 'success');
                await this.cargarCondominios(); // Recarga la lista

              } catch (error) {
                console.error("Error al crear el condominio:", error);
                await this.presentToast('Error al crear condominio', 'danger');
              }
            } else {
                 // Si faltan datos, mostramos un mensaje
                 await this.presentToast('Debe ingresar nombre y dirección válidos', 'warning');
                 // NO retornamos false, para que el alert se cierre siempre
            }
          } // Fin handler
        } // Fin botón Crear
      ] // Fin buttons
    }); // Fin create

    await alert.present();
  } // Fin crearNuevoCondominio

  // Helper para mostrar mensajes Toast
  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color: color });
    toast.present();
  }
} // Fin clase