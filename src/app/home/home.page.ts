import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonMenuButton, IonButtons, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    MatButtonModule, CommonModule,
    IonMenuButton, IonButtons, IonSpinner, IonIcon
  ],
})
export class HomePage implements OnInit, OnDestroy {
  statusMessage = '';
  Message = '';
  calling = false;
  buttonColor = '#ffffff';

  userProfile: any = null;
  patenteSeleccionada: string | null = null;
  cargandoPerfil = true;
  private authSubscription: Subscription | null = null;

  phone = '+56921850610';
  message = 'OPEN';

  constructor(
    private http: HttpClient,
    private firestore: BlockiaFirestoreService,
    private auth: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // La suscripción se mantiene para la carga inicial de la app
    this.authSubscription = this.auth.user$.subscribe(user => {
      if (user && !this.userProfile) { // Solo carga si no tenemos ya el perfil
        this.cargarDatosUsuario(user.uid);
      } else if (!user) {
        this.cargandoPerfil = false;
        this.userProfile = null;
      }
    });
  }

  // ✅ ¡AÑADIMOS ESTA FUNCIÓN!
  // Se ejecuta cada vez que la página está a punto de mostrarse.
  ionViewWillEnter() {
    // Volvemos a verificar los datos por si han cambiado.
    const user = this.auth.currentUser;
    if (user) {
      this.cargarDatosUsuario(user.uid);
    }
  }

  async cargarDatosUsuario(uid: string) {
    this.cargandoPerfil = true;
    this.userProfile = await this.firestore.getUserById(uid);
    if (this.userProfile && this.userProfile.patentes && this.userProfile.patentes.length > 0) {
      // Si no hay una patente seleccionada, elegimos la primera.
      if (!this.patenteSeleccionada) {
        this.patenteSeleccionada = this.userProfile.patentes[0];
      }
    } else {
      this.patenteSeleccionada = null;
    }
    this.cargandoPerfil = false;
  }

  // ... (El resto de tus funciones: enviarSMS, cambiarPatente, etc., no cambian)
  
  enviarSMS() {
    if (!this.patenteSeleccionada || !this.userProfile) {
      this.statusMessage = '⚠️ No se ha seleccionado una patente.';
      return;
    }
    this.procederConApertura(this.patenteSeleccionada, this.userProfile);
  }

  async cambiarPatente() {
    if (!this.userProfile || !this.userProfile.patentes || this.userProfile.patentes.length <= 1) {
      return;
    }
    const alertInputs = this.userProfile.patentes.map((patente: string) => ({
      type: 'radio',
      label: patente,
      value: patente,
      checked: patente === this.patenteSeleccionada
    }));
    const alert = await this.alertController.create({
      header: 'Selecciona tu Patente',
      inputs: alertInputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: (selectedPatente) => { if (selectedPatente) this.patenteSeleccionada = selectedPatente; } },
      ],
    });
    await alert.present();
  }

  procederConApertura(patenteSeleccionada: string, userProfile: any) {
    this.statusMessage = 'Espere un momento...';
    this.Message = 'Apertura iniciada';
    this.calling = true;
    const url = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';
    this.http.post(url, { to: this.phone, message: this.message }).subscribe({
      next: (res: any) => {
        const historialData = {
          userId: userProfile.id,
          condominioId: userProfile.condominioId,
          patente: patenteSeleccionada,
        };
        this.firestore.addHistorialApertura(historialData);
        this.buttonColor = '#4CAF50';
        setTimeout(() => { this.buttonColor = '#ffffff'; }, 3000);
        this.statusMessage = `Mensaje enviado a ${this.phone}`;
      },
      error: (err) => { this.calling = false; this.statusMessage = '❌ Error al enviar el SMS'; },
      complete: () => { setTimeout(() => { this.statusMessage = ''; this.calling = false; }, 15000); }
    });
  }
  
  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}