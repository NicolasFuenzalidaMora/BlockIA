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

    return this.auth.user$.pipe(
      // Evita depender de un flag externo; espera a que user$ tenga valor (null o usuario)
      filter(u => u !== undefined), // si tu stream arranca en undefined
      take(1),

      switchMap(user => {
        // A. No autenticado → enviar a login con retorno
        if (!user) {
          return of(
            this.router.createUrlTree(
              ['/login-phone'],
              { queryParams: { redirectTo: state.url } }
            )
          );
        }

        // B. Autenticado → verifica perfil en Firestore
        return from(this.bf.getUserById(user.uid)).pipe(
          map((userData: any) => {
            const completo = !!(userData && userData.perfilCompleto);

            // Permite entrar a /completar-perfil si el perfil NO está completo,
            // para evitar bucles si esa ruta también pasa por el guard.
            if (!completo) {
              // Si ya vamos hacia /completar-perfil, deja pasar
              if (state.url.startsWith('/completar-perfil')) {
                return true;
              }
              // Si no, redirige allí
              return this.router.createUrlTree(['/completar-perfil']);
            }

            // Perfil ok → acceso
            return true;
          }),
          // Fallo de red/permisos → envía a completar-perfil (sin navigate)
          catchError(() =>
            of(this.router.createUrlTree(['/completar-perfil']))
          )
        );
      })
    );
  }
}