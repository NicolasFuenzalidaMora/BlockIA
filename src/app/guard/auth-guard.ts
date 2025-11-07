// src/app/guard/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private bf: BlockiaFirestoreService,
    private router: Router
  ) {}

canActivate(
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> {

  return this.auth.authReady$.pipe(
    filter(ready => ready), // Espera hasta que Firebase termine la inicialización
    take(1),
    switchMap(() => this.auth.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          // No logueado → login
          return of(this.router.createUrlTree(
            ['/login-phone'],
            { queryParams: { redirectTo: state.url } }
          ));
        }

        // Logueado → verifica perfil
return from(this.bf.getUserById(user.uid)).pipe(
  map(userData => {
    const data: any = userData; // 👈 Fuerza el tipo
    const completo = !!(data && data.perfilCompleto);
    if (!completo) {
      if (state.url.startsWith('/completar-perfil')) return true;
      return this.router.createUrlTree(['/completar-perfil']);
    }
    return true;
  }),
  catchError(() => of(this.router.createUrlTree(['/completar-perfil'])))
);
      })
    ))
  );
}}