import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

// ✅ Importaciones necesarias
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-completar-perfil',
  templateUrl: './completar-perfil.page.html',
  styleUrls: ['./completar-perfil.page.scss'],
  standalone: true, // ✅ Asegúrate que sea standalone
  imports: [
    IonicModule,    // ✅ Para todos los componentes <ion-...>
    FormsModule,    // ✅ Para que funcione [(ngModel)]
    CommonModule    // ✅ Para que funcione *ngFor
  ]
})
export class CompletarPerfilPage implements OnInit {

  nombreCompleto: string = '';
  patente: string = '';
  condominioIdSeleccionado: string = '';
  
  condominios: any[] = [];
  userId: string | null = null;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService,
    private router: Router,
    private alertController: AlertController
  ) { }

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
    this.condominios = await this.bf.getCondominios();
  }

  async guardarPerfil() {
    if (!this.userId) {
      console.error("No hay ID de usuario, imposible guardar.");
      return;
    }

    // Validación simple
    if (!this.nombreCompleto || !this.patente || !this.condominioIdSeleccionado) {
      console.log('Faltan datos');
      return;
    }

    const datosParaActualizar = {
      nombre: this.nombreCompleto,
      patente: this.patente,
      condominioId: this.condominioIdSeleccionado,
      perfilCompleto: true
    };

    try {
      await this.bf.updateUser(this.userId, datosParaActualizar);
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      this.mostrarAlertaError();
    }
  }

  async mostrarAlertaError() {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'No se pudo guardar tu información. Por favor, intenta de nuevo.',
      buttons: ['OK'],
    });
    await alert.present();
  }
}