// Ruta: src/app/components/menu-lateral/menu-lateral.component.ts
// VERSIÓN CON TEMPLATE INLINE Y OPCIÓN ADMIN CONDICIONAL

import { Component } from '@angular/core';
import { IonicModule, MenuController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  homeOutline, peopleOutline, timeOutline, personOutline,
  personCircleOutline, logOutOutline, logInOutline,
  settingsOutline // <-- Importar el nuevo icono
} from 'ionicons/icons';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [IonicModule, RouterModule, CommonModule],
  // Template inline con la nueva opción
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

      <ng-container *ngIf="auth.userProfile$ | async as profile">
        <ion-item *ngIf="tienePermisosAdmin(profile)" button routerLink="/admin" routerDirection="root" (click)="closeMenu()">
          <ion-icon name="settings-outline" slot="start"></ion-icon>
          <ion-label>Administración</ion-label>
        </ion-item>
      </ng-container>
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
  // No necesitamos styleUrls si no hay CSS específico aquí
})
export class MenuLateralComponent {
  constructor(
    public auth: AuthService,
    private menu: MenuController
  ) {
    // Registramos TODOS los iconos necesarios
    addIcons({
      homeOutline, peopleOutline, timeOutline, personOutline,
      personCircleOutline, logOutOutline, logInOutline,
      settingsOutline // <-- Añadir icono al registro
    });
  }

  closeMenu() {
    this.menu.close();
  }

  async logout() {
    try {
      await this.auth.logout();
      this.menu.close();
      // Opcional: Redirigir si es necesario
      // import { Router } from '@angular/router';
      // constructor(..., private router: Router) {}
      // this.router.navigate(['/login-phone'], { replaceUrl: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  /**
   * Verifica si el perfil actual tiene permisos de Admin o Conserje.
   * @param profile El objeto del perfil de usuario.
   * @returns boolean True si tiene permisos, false si no.
   */
  tienePermisosAdmin(profile: any): boolean {
    if (!profile) return false; // Sin perfil, sin permisos

    // Opción 1: Rol raíz es 'administrador'
    if (profile.rol === 'administrador') {
      console.log("[MenuLateral] Permiso Admin: Rol raíz 'administrador'");
      return true;
    }

    // Opción 2: Tiene rol 'administrador' o 'conserjeria' DENTRO del array condominios
    if (Array.isArray(profile.condominios) && profile.condominios.length > 0) {
      const tieneRolAdminEnCondo = profile.condominios.some(
          (c: any) => c.rol === 'administrador' || c.rol === 'conserjeria'
      );
      if (tieneRolAdminEnCondo) {
          console.log("[MenuLateral] Permiso Admin: Rol 'administrador' o 'conserjeria' en array condominios");
          return true;
      }
    }

    // Si no cumple ninguna, no tiene permisos
    console.log("[MenuLateral] Permiso Admin: Denegado");
    return false;
  }
}