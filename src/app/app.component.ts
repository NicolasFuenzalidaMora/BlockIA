import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { MenuLateralComponent } from './menu-lateral/menu-lateral.component';
import { AuthService } from './services/auth.service';

import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    CommonModule,
    MenuLateralComponent,
  ],
})
export class AppComponent {

  constructor(
    public auth: AuthService,   // 👈 público para usarlo en el template
    private router: Router
  ) {
    // Registramos el icono de logout
    addIcons({ logOutOutline });
    this.initializeApp();
  }

  initializeApp() {
    this.auth.user$
      .pipe(filter(() => !this.auth.isLoading))
      .subscribe(user => {
        if (!user) {
          // Si NO hay usuario, lo enviamos al login.
          this.router.navigateByUrl('/login-phone');
        }
        // Si sí hay usuario, no hacemos nada: se queda donde está.
      });
  }

  async logout() {
    try {
      await this.auth.logout();
      // El propio flujo de auth te redirigirá al login
      // por el subscribe de initializeApp()
    } catch (err) {
      console.error('[APP] Error al cerrar sesión', err);
    }
  }
}
