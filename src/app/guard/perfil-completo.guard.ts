// src/app/guard/perfil-completo.guard.ts

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take, filter } from 'rxjs/operators'; // ✅ Importa las herramientas necesarias

import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';

@Injectable({
  providedIn: 'root'
})
export class PerfilCompletoGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private bf: BlockiaFirestoreService,
    private router: Router
  ) {}

  // ✅ REEMPLAZA TU FUNCIÓN canActivate CON ESTA
  canActivate(): Observable<boolean> {
    return this.auth.user$.pipe(
      // 1. Espera a que Firebase termine su carga inicial
      filter(user => !this.auth.isLoading),
      take(1), // Toma solo el primer valor después de la carga
      // 2. Con el usuario ya confirmado, cambia a una nueva tarea: buscar el perfil en Firestore
      switchMap(user => {
        if (!user) {
          // Si NO hay usuario, redirige a login
          console.warn('[Guard] Usuario no autenticado → login');
          this.router.navigate(['/login-phone']);
          return of(false); // Emite 'false' para detener la navegación
        }
        
        // Si SÍ hay usuario, busca su perfil en la base de datos
        return this.bf.getUserById(user.uid).then(userData => {
          if (userData && (userData as any).perfilCompleto) {
            // Si el perfil está completo, permite el acceso
            console.log('[Guard] ✅ Perfil completo, acceso permitido a /home');
            return true;
          } else {
            // Si el perfil está incompleto, redirige al formulario
            console.warn('[Guard] ⚠️ Perfil incompleto → completar perfil');
            this.router.navigate(['/completar-perfil']);
            return false;
          }
        });
      })
    );
  }
}