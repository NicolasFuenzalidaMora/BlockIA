import { Component } from '@angular/core';
import { IonicModule, MenuController, IonList, IonItem, IonIcon, IonLabel, IonButton } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service'; // 🔹 Importa tu AuthService

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [IonicModule, RouterModule],
  template: `
    <ion-list>
      <ion-item routerLink="/home" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="home-outline" slot="start"></ion-icon>
        <ion-label>Principal</ion-label>
      </ion-item>

      <ion-item routerLink="/visitas" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="people-outline" slot="start"></ion-icon>
        <ion-label>Visitas</ion-label>
      </ion-item>

      <ion-item routerLink="/historial" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="time-outline" slot="start"></ion-icon>
        <ion-label>Historial</ion-label>
      </ion-item>


      <ion-item routerLink="/login-phone" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="time-outline" slot="start"></ion-icon>
        <ion-label>intentosesion</ion-label>
      </ion-item>

      <!-- 🔹 Usuario logueado o login -->
      <ion-item *ngIf="!auth.isLoggedIn" routerLink="/login-phone" routerDirection="forward">
        <ion-icon slot="start" name="clipboard-outline"></ion-icon>
        <ion-label>Iniciar sesión</ion-label>
      </ion-item>

   <ion-item *ngIf="auth.isLoggedIn">
  <ion-icon slot="start" name="person-circle-outline"></ion-icon>
  <ion-label>{{ auth.currentUserData?.telefono || 'Usuario' }}</ion-label>
  <ion-button fill="clear" color="danger" (click)="logout()">Cerrar sesión</ion-button>
</ion-item>


      <ion-item routerLink="/perfil" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="person-outline" slot="start"></ion-icon>
        <ion-label>Perfil</ion-label>
      </ion-item>
    </ion-list>
  `
})
export class MenuLateralComponent {
  constructor(public auth: AuthService, private menu: MenuController) {}

  closeMenu() {
    this.menu.close();
  }

  logout() {
    this.auth.logout();
    this.menu.close();
  }
}
