import { Component } from '@angular/core';
import { Contacts } from '@capacitor-community/contacts';
import { AlertController, ModalController } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-visitas',
  templateUrl: './visitas.page.html',
  styleUrls: ['./visitas.page.scss'],
  imports: [
    CommonModule,
    FormsModule,   // <- para [(ngModel)]
    IonicModule,   // <- para componentes ion-*
  ],
})

export class VisitasPage {
  visitaName: string = '';
  visitaPhone: string = '';
  visitas: any[] = [];

  constructor(
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {}

  addVisitaForm() {
    if (this.visitaName && this.visitaPhone) {
      this.visitas.push({
        name: this.visitaName,
        phone: this.visitaPhone,
      });
      this.visitaName = '';
      this.visitaPhone = '';
    }
  }
  

async openContacts() {
  try {
    const permission = await Contacts.requestPermissions();

    if (permission.contacts === 'granted') {
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        },
      });

      // 🔥 Filtramos contactos que tengan nombre y al menos un teléfono
      const contactosValidos = result.contacts.filter(
        (c) => c.name?.display && c.phones?.length
      );

      if (contactosValidos.length === 0) {
        const noContacts = await this.alertCtrl.create({
          header: 'Aviso',
          message: 'No se encontraron contactos con número de teléfono.',
          buttons: ['OK'],
        });
        await noContacts.present();
        return;
      }

      // Creamos el Alert con lista de contactos
      const alert = await this.alertCtrl.create({
        header: 'Selecciona un contacto',
        inputs: contactosValidos.map((c) => ({
          type: 'radio',
          label: `${c.name!.display} - ${c.phones![0].number}`,
          value: c,
        })),
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
          },
          {
            text: 'Seleccionar',
            handler: (contact) => {
              this.visitas.push({
                name: contact.name.display,
                phone: contact.phones[0].number,
              });
            },
          },
        ],
      });

      await alert.present();
    } else {
      const noPerms = await this.alertCtrl.create({
        header: 'Permiso denegado',
        message:
          'No se otorgaron permisos para acceder a los contactos. Actívalos en configuración.',
        buttons: ['OK'],
      });
      await noPerms.present();
    }
  } catch (err) {
    console.error('Error al abrir contactos:', err);
    const errorAlert = await this.alertCtrl.create({
      header: 'Error',
      message: 'Ocurrió un problema al acceder a los contactos.',
      buttons: ['OK'],
    });
    await errorAlert.present();
  }
}
}