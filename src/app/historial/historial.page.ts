import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  timeOutline,
  documentTextOutline,
  menuOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { LocalDatePipe } from '../pipes/local-date-pipe';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';

// 👇 barra inferior reutilizable
import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    LocalDatePipe,
    MenuLateralComponent, // 👈 AQUÍ se registra el componente
  ],
})
export class HistorialPage implements OnInit, OnDestroy {
  historial: any[] = [];
  cargando = true;

  private profileSubscription: Subscription | null = null;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService
  ) {
    addIcons({ businessOutline, timeOutline, documentTextOutline, menuOutline });
  }

  ngOnInit() {
    this.cargando = true;

    this.profileSubscription = this.auth.userProfile$.subscribe((userProfile: any) => {
      if (userProfile && userProfile.condominios && userProfile.condominios.length > 0) {
        this.cargarHistorialDeFirestore(userProfile);
      } else {
        this.cargando = false;
        this.historial = [];
      }
    });
  }

  async cargarHistorialDeFirestore(userProfile: any) {
    try {
      const idsDeMisCondominios = userProfile.condominios.map(
        (condo: any) => condo.id
      );

      // 1. Registros de mis condominios
      const registrosBaseCondominio =
        await this.bf.getHistorialDelMesPorCondominios(idsDeMisCondominios);
      console.log('Registros de mis condominios:', registrosBaseCondominio);

      // 2. Filtrar solo mis registros
      const misRegistrosBase = registrosBaseCondominio.filter(
        (registro: any) => registro.userId === userProfile.id
      );
      console.log('Mis registros filtrados:', misRegistrosBase);

      // 3. Enriquecer con datos de condominio y usuario
      const [condominios, usuarios]: [any[], any[]] = await Promise.all([
        this.bf.getCondominios(),
        this.bf.getUsers(),
      ]);

      const condominiosMap = new Map(condominios.map((c) => [c.id, c]));
      const usuariosMap = new Map(usuarios.map((u) => [u.id, u]));

      const historialEnriquecido = misRegistrosBase.map((registro: any) => {
        const condominio = condominiosMap.get(registro.condominioId);
        const usuario = usuariosMap.get(registro.userId);

        return {
          ...registro,
          nombreUsuario: usuario ? usuario.nombre : 'Yo',
          patente:
            registro.patente ||
            usuario?.patentes?.[0] ||
            usuario?.patente ||
            'Sin patente',
          nombreCondominio: condominio ? condominio.nombre : 'Condominio desconocido',
          direccionCondominio: condominio
            ? condominio.direccion
            : 'Dirección no disponible',
        };
      });

      this.historial = historialEnriquecido;
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy() {
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }
}
