import { Component } from '@angular/core';
import { IonicModule, MenuController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common'; // ✅ CommonModule ya está importado
import { addIcons } from 'ionicons';
import {
  homeOutline, peopleOutline, timeOutline, personOutline,
  personCircleOutline, logOutOutline, logInOutline // ✅ logInOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  // ✅ Usamos userProfile$ con el pipe async para obtener el nombre
  imports: [IonicModule, RouterModule, CommonModule],
  template: `
    <ion-list>
      <ion-item button routerLink="/home" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="home-outline" slot="start"></ion-icon>
        <ion-label>Principal</ion-label>
      </ion-item>

      <ion-item button routerLink="/visitas" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="people-outline" slot="start"></ion-icon>
        <ion-label>Visitas</ion-label>
      </ion-item>

      <ion-item button routerLink="/historial" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="time-outline" slot="start"></ion-icon>
        <ion-label>Historial</ion-label>
      </ion-item>

       <ion-item button routerLink="/perfil" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="person-outline" slot="start"></ion-icon>
        <ion-label>Perfil</ion-label>
      </ion-item>

      <ion-item-divider></ion-item-divider>

      <ion-item button *ngIf="!(auth.userProfile$ | async)" routerLink="/login-phone" routerDirection="root" (click)="closeMenu()">
        <ion-icon slot="start" name="log-in-outline"></ion-icon>
        <ion-label>Iniciar sesión</ion-label>
      </ion-item>

      <ion-item *ngIf="auth.userProfile$ | async as profile">
        <ion-icon slot="start" name="person-circle-outline"></ion-icon>
        <ion-label>
          <h2>{{ profile.nombre || 'Usuario' }}</h2>
          <p style="font-size: 0.8em; color: gray;">{{ profile.telefono || 'Sin teléfono' }}</p>
        </ion-label>
        <ion-button fill="clear" color="danger" (click)="logout()">
           <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
        </ion-button>
      </ion-item>

    </ion-list>
  `
})
export class MenuLateralComponent {
  constructor(
    public auth: AuthService,
    private menu: MenuController
  ) {
    addIcons({
      homeOutline, peopleOutline, timeOutline, personOutline,
      personCircleOutline, logOutOutline, logInOutline
    });
  }

  closeMenu() {
    this.menu.close();
  }

  async logout() {
    try {
      await this.auth.logout();
      this.menu.close();
      // Opcional: Redirigir
      // this.router.navigate(['/login-phone'], { replaceUrl: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }
}