import { Component, OnDestroy, OnInit } from '@angular/core';
// ✅ THE FIX IS HERE: Change '@angular/angular' to '@ionic/angular'
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { businessOutline, timeOutline, documentTextOutline, menuOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs'; // Important for the subscription
import { LocalDatePipe } from '../pipes/local-date-pipe'; // ✅ 1. Importa tu nuevo pipe
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service'; // We need the Auth service

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, LocalDatePipe ],
})
export class HistorialPage implements OnInit, OnDestroy {

  historial: any[] = [];
  cargando = true;
  private authSubscription: Subscription | null = null; // To manage the subscription

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService // Inject the Auth service
  ) {
    addIcons({ businessOutline, timeOutline, documentTextOutline, menuOutline });
  }

  ngOnInit() {
    this.cargando = true;
    // We subscribe to the user observable.
    // This code will run automatically when Firebase confirms the session state.
    this.authSubscription = this.auth.user$.subscribe(user => {
      if (user) {
        // If the observable gives us a user, we load their history from Firestore.
        console.log('User confirmed by Firebase:', user.uid);
        this.cargarHistorialDeFirestore(user.uid);
      } else {
        // If the observable says there is no user (session closed or not yet loaded).
        console.log('No Auth user, showing empty screen.');
        this.cargando = false;
        this.historial = [];
      }
    });
  }

  // New separate function for more clarity.
  async cargarHistorialDeFirestore(uid: string) {
    try {
      const [registrosBase, condominios, usuarios]: [any[], any[], any[]] = await Promise.all([
        this.bf.getHistorialDelMesPorUsuario(uid), // We use the UID we received.
        this.bf.getCondominios(),
        this.bf.getUsers()
      ]);
      
      console.log('Base records found:', registrosBase);

      const condominiosMap = new Map(condominios.map(c => [c.id, c]));
      const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

      const historialEnriquecido = registrosBase.map((registro: any) => {
        const condominio = condominiosMap.get(registro.condominioId);
        const usuario = usuariosMap.get(registro.userId);

        return {
          ...registro,
          nombreUsuario: usuario ? usuario.nombre : 'Usuario Desconocido',
          patente: registro.patente || (usuario && usuario.patentes && usuario.patentes.length > 0 ? usuario.patentes[0] : 'Sin patente'),
          nombreCondominio: condominio ? condominio.nombre : 'Condominio Desconocido',
          direccionCondominio: condominio ? condominio.direccion : 'Dirección no disponible'
        };
      });

      this.historial = historialEnriquecido;

    } catch (error) {
      console.error("Error al cargar el historial:", error);
    } finally {
      this.cargando = false;
    }
  }

  // Good practice: we unsubscribe when leaving the page.
  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}