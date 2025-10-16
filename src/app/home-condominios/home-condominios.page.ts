import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonButton,
  AlertController // <-- AÑADIDO: Importa AlertController
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
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonButton, 
    MatButtonModule, 
    CommonModule,
    // No es necesario agregar AlertController aquí en las versiones modernas de Ionic Standalone
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeCondominiosPage {
  condominios: any[] = [];
  usuarios: any[] = [];
  cargandoCondominios = true;
  cargandoUsuarios = true;

  // MODIFICADO: Inyectamos AlertController para usarlo
  constructor(
    private bf: BlockiaFirestoreService,
    private alertController: AlertController 
  ) {}

  async ngOnInit() {
    // Se mantienen tus funciones de carga inicial
    await Promise.all([this.cargarCondominios(), this.cargarUsuarios()]);
  }

  // =======================
  // 🔹 Condominios
  // =======================
  async cargarCondominios() {
    try {
      this.condominios = await this.bf.getCondominios();
      console.log('Condominios obtenidos:', this.condominios);
    } catch (err) {
      console.error('Error al consultar condominios:', err);
    } finally {
      this.cargandoCondominios = false;
    }
  }

  // =======================
  // 🔹 Usuarios
  // =======================
  async cargarUsuarios() {
    try {
      this.usuarios = await this.bf.getUsers();
      console.log('Usuarios obtenidos:', this.usuarios);
    } catch (err) {
      console.error('Error al consultar usuarios:', err);
    } finally {
      this.cargandoUsuarios = false;
    }
  }

  // ===================================
  // ✨ NUEVA FUNCIÓN PARA CREAR CONDOMINIOS
  // ===================================
  async crearNuevoCondominio() {
    const alert = await this.alertController.create({
      header: 'Nuevo Condominio',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre del condominio'
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
            if (data.nombre && data.nombre.trim() !== '') {
              try {
                const nuevoCondo = {
                  nombre: data.nombre,
                  creadoEn: new Date()
                };
                // Llama al método del servicio que ya tienes
                await this.bf.addCondominio(nuevoCondo);
                // Recarga la lista para mostrar el nuevo condominio al instante
                this.cargarCondominios();
              } catch (error) {
                console.error("Error al crear el condominio:", error);
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }
}