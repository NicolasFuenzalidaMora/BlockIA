import { Component } from '@angular/core';
import { IonicModule, MenuController, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular';
import { RouterModule } from '@angular/router';

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

      <ion-item routerLink="/perfil" routerDirection="root" (click)="closeMenu()">
        <ion-icon name="person-outline" slot="start"></ion-icon>
        <ion-label>Perfil</ion-label>
      </ion-item>
    </ion-list>
  `
})
export class MenuLateralComponent {
  constructor(private menu: MenuController) {}
  closeMenu() {
    this.menu.close();
  }
}
