import { Routes } from '@angular/router';
import { PerfilCompletoGuard } from './guard/perfil-completo.guard';
import { AuthGuard } from './guard/auth-guard'


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',  // redirige a Home al iniciar la app
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then((m) => m.HomePage),
    
  },
  {
    path: 'login-phone',
    loadComponent: () => import('./login-phone/login-phone.page').then(m => m.LoginPhonePage)
  },
  {
    path: 'completar-perfil',
    loadComponent: () => import('./completar-perfil/completar-perfil.page').then(m => m.CompletarPerfilPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    // ✅ ¡ESTA ES LA LÍNEA CLAVE QUE FALTABA!
    // Pone al guardia en la puerta de la página 'home'.
    canActivate: [PerfilCompletoGuard, AuthGuard ] 
  },
  {
    path: 'home-condominios',
    loadComponent: () => import('./home-condominios/home-condominios.page').then(m => m.HomeCondominiosPage)
  },
  {
    path: 'visitas',
    loadComponent: () => import('./visitas/visitas.page').then(m => m.VisitasPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then(m => m.PerfilPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'registros',
    loadComponent: () => import('./registros/registros.page').then(m => m.RegistrosPage)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then( m => m.AdminPage)
  },
  {
    path: 'historial',
    loadComponent: () => import('./historial/historial.page').then( m => m.HistorialPage),
    canActivate: [AuthGuard]
  }
];