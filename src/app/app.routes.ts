import { Routes } from '@angular/router';
import { AuthGuard } from './guard/auth-guard'
import { LoginRedirectGuard } from './guard/login-redirect-guard';


export const routes: Routes = [
{
    path: '',
    loadComponent: () => import('./login-phone/login-phone.page').then(m => m.LoginPhonePage),
    canActivate: [LoginRedirectGuard] // Verifica si ya hay sesión
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard] 
  },
  {
    path: 'completar-perfil',
    loadComponent: () => import('./completar-perfil/completar-perfil.page').then(m => m.CompletarPerfilPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'completar-perfil',
    loadComponent: () => import('./completar-perfil/completar-perfil.page').then(m => m.CompletarPerfilPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'home-condominios',
    loadComponent: () => import('./home-condominios/home-condominios.page').then(m => m.HomeCondominiosPage),
    canActivate: [AuthGuard]
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
    loadComponent: () => import('./registros/registros.page').then(m => m.RegistrosPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then( m => m.AdminPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'historial',
    loadComponent: () => import('./historial/historial.page').then( m => m.HistorialPage),
    canActivate: [AuthGuard]
  }
];