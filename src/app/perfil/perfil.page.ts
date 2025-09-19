import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule], // 👈 AGREGA ESTO

})
export class PerfilPage {
  // 🔹 Datos simulados de usuario
  user = {
    nombre: 'Juan',
    apellido: 'Pérez',
    comunidad: 'COMINIDAD',
    foto: 'https://ionicframework.com/docs/img/demos/avatar.svg'
  };

  constructor(private alertCtrl: AlertController) {}

  async cambiarPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar Contraseña',
      inputs: [
        {
          name: 'actual',
          type: 'password',
          placeholder: 'Contraseña actual'
        },
        {
          name: 'nueva',
          type: 'password',
          placeholder: 'Nueva contraseña'
        },
        {
          name: 'confirmar',
          type: 'password',
          placeholder: 'Confirmar contraseña'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', handler: (data) => {
            if (data.nueva !== data.confirmar) {
              console.log('⚠️ Las contraseñas no coinciden');
              return false; // no cierra el alert
            }
            console.log('✅ Contraseña cambiada:', data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  logout() {
    console.log('🚪 Sesión cerrada');
    // Aquí más adelante puedes redirigir al login
  }
}
