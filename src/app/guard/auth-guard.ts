import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, skipWhile, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.auth.user$.pipe(
      // 1. Ignora respuestas mientras Firebase aún está cargando la sesión.
      skipWhile(() => this.auth.isLoading),
      // 2. Toma la primera respuesta definitiva (user o null).
      take(1),
      // 3. Decide qué hacer.
      map(user => {
        if (user) {
          // Si hay un usuario, permite el acceso.
          return true;
        } else {
          // Si no hay usuario, lo redirige al login y bloquea el paso.
          this.router.navigate(['/login-phone']);
          return false;
        }
      })
    );
  }
}