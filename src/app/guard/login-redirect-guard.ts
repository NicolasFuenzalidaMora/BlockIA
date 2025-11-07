// src/app/guard/login-redirect.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, switchMap, take, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class LoginRedirectGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

 canActivate(): Observable<boolean | UrlTree> {
  return this.auth.authReady$.pipe(
    filter(ready => ready),
    take(1),
    switchMap(() => this.auth.user$.pipe(
      take(1),
      map(user => {
        if (user) {
          // Redirige a home si ya hay sesión
          return this.router.createUrlTree(['/home']);
        }
        // Si no hay sesión, queda en '/'
        return true;
      })
    ))
  );
  }
}