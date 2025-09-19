import { Routes } from '@angular/router';

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
    path: 'visitas',
    loadComponent: () => import('./visitas/visitas.page').then( m => m.VisitasPage)
  },  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then( m => m.PerfilPage)
  },



  

];
