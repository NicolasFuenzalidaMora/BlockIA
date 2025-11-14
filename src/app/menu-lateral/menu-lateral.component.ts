// Ruta: src/app/menu-lateral/menu-lateral.component.ts
// BARRA INFERIOR TIPO TABS, REUTILIZABLE EN TODAS LAS VISTAS

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  peopleOutline,
  timeOutline,
  personOutline,
  settingsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    RouterLink,
    RouterLinkActive,
  ],
  template: `
    <nav class="bottom-nav">
      <div class="bottom-nav-inner">

        <!-- Inicio -->
        <a
          routerLink="/home"
          routerLinkActive="nav-item--active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-item"
        >
          <ion-icon name="home-outline"></ion-icon>
          <span>Inicio</span>
        </a>

        <!-- Visitas -->
        <a
          routerLink="/visitas"
          routerLinkActive="nav-item--active"
          class="nav-item"
        >
          <ion-icon name="people-outline"></ion-icon>
          <span>Visitas</span>
        </a>

        <!-- Historial -->
        <a
          routerLink="/historial"
          routerLinkActive="nav-item--active"
          class="nav-item"
        >
          <ion-icon name="time-outline"></ion-icon>
          <span>Historial</span>
        </a>

        <!-- Perfil -->
        <a
          routerLink="/perfil"
          routerLinkActive="nav-item--active"
          class="nav-item"
        >
          <ion-icon name="person-outline"></ion-icon>
          <span>Perfil</span>
        </a>

        <!-- Admin solo si tiene permisos -->
        <ng-container *ngIf="auth.userProfile$ | async as profile">
          <a
            *ngIf="tienePermisosAdmin(profile)"
            routerLink="/admin"
            routerLinkActive="nav-item--active"
            class="nav-item"
          >
            <ion-icon name="settings-outline"></ion-icon>
            <span>Admin</span>
          </a>
        </ng-container>

      </div>
    </nav>
  `,
  styleUrls: ['./menu-lateral.component.scss'],
})
export class MenuLateralComponent {
  constructor(public auth: AuthService) {
    addIcons({
      homeOutline,
      peopleOutline,
      timeOutline,
      personOutline,
      settingsOutline,
    });
  }

  /**
   * Verifica si el perfil actual tiene permisos de Admin o Conserje.
   */
  tienePermisosAdmin(profile: any): boolean {
    if (!profile) return false;

    // Opción 1: Rol raíz es 'administrador'
    if (profile.rol === 'administrador') {
      return true;
    }

    // Opción 2: Rol 'administrador' o 'conserjeria' en alguno de los condominios
    if (Array.isArray(profile.condominios) && profile.condominios.length > 0) {
      const tieneRolAdminEnCondo = profile.condominios.some(
        (c: any) => c.rol === 'administrador' || c.rol === 'conserjeria'
      );
      if (tieneRolAdminEnCondo) {
        return true;
      }
    }
    return false;
  }
}
