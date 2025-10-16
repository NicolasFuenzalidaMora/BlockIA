import { ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';

// 🔥 Firebase imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';  // 👈 agrega esto

// ⚙️ Rutas y entorno
import { routes } from './app.routes';
import { environment } from '../environments/environments.api';

export const appConfig: ApplicationConfig = {
  providers: [
    // Routing
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HTTP Client
    provideHttpClient(),

    // ✅ Firebase inicialización
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()), // 👈 habilita autenticación con Firebase
  ],
};
