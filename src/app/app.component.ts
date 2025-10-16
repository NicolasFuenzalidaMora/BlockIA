import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';

import { MenuLateralComponent } from './menu-lateral/menu-lateral.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html', // Asegúrate de que tu HTML principal esté aquí
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    MenuLateralComponent,
  ],
})
export class AppComponent {

  // ✅ AÑADE ESTE CONSTRUCTOR CON LA LÓGICA DE REDIRECCIÓN
  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    this.initializeApp();
  }

 initializeApp() {
    this.auth.user$.pipe(
      filter(() => !this.auth.isLoading),
    ).subscribe(user => {
      if (!user) {
        // Si NO hay usuario, lo enviamos al login.
        this.router.navigateByUrl('/login-phone');
      }
      // Si SÍ hay usuario, no hacemos nada y dejamos que la navegación a /home continúe.
    });
  }
}