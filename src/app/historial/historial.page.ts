import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { businessOutline, timeOutline, documentTextOutline, menuOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { LocalDatePipe } from '../pipes/local-date-pipe';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, LocalDatePipe],
})
export class HistorialPage implements OnInit, OnDestroy {

  historial: any[] = [];
  cargando = true;
  // ✅ Usaremos esta suscripción para el perfil completo
  private profileSubscription: Subscription | null = null;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService
  ) {
    addIcons({ businessOutline, timeOutline, documentTextOutline, menuOutline });
  }

  ngOnInit() {
    this.cargando = true;
    // ✅ 1. Nos suscribimos a 'userProfile$' en lugar de 'user$'
    // Esto nos da el documento completo de Firestore con el array de condominios.
    this.profileSubscription = this.auth.userProfile$.subscribe(userProfile => {
      if (userProfile && userProfile.condominios && userProfile.condominios.length > 0) {
        // Si el perfil existe y tiene condominios, cargamos el historial.
        this.cargarHistorialDeFirestore(userProfile);
      } else {
        // Si no hay perfil o no tiene condominios asignados.
        this.cargando = false;
        this.historial = [];
      }
    });
  }

  // ✅ 2. La función ahora recibe el perfil completo
async cargarHistorialDeFirestore(userProfile: any) {
    try {
      const idsDeMisCondominios = userProfile.condominios.map((condo: any) => condo.id);

      // 1. Obtenemos TODOS los registros de MIS condominios (incluye otros usuarios del mismo condo)
      const registrosBaseCondominio = await this.bf.getHistorialDelMesPorCondominios(idsDeMisCondominios);
      console.log('Registros de mis condominios:', registrosBaseCondominio);

      // ✅ 2. FILTRAMOS POR MI USER ID
      // Nos quedamos solo con los registros donde el 'userId' coincide con mi ID.
      const misRegistrosBase = registrosBaseCondominio.filter(
          (registro: any) => registro.userId === userProfile.id
      );
      console.log('Mis registros filtrados:', misRegistrosBase);


      // --- Enriquecimiento (sigue siendo ineficiente, pero funciona) ---
      const [condominios, usuarios]: [any[], any[]] = await Promise.all([
        this.bf.getCondominios(),
        this.bf.getUsers()
      ]);
      const condominiosMap = new Map(condominios.map(c => [c.id, c]));
      const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

      // 3. Enriquecemos SOLO MIS registros
      const historialEnriquecido = misRegistrosBase.map((registro: any) => {
        const condominio = condominiosMap.get(registro.condominioId);
        // Ya sabemos que el usuario es el actual, pero igual lo buscamos para el nombre
        const usuario = usuariosMap.get(registro.userId); 

        return {
          ...registro,
          nombreUsuario: usuario ? usuario.nombre : 'Yo', // Podemos poner "Yo" o buscar el nombre
          // Lógica de patente retrocompatible
          patente: registro.patente || (usuario?.patentes?.[0] || usuario?.patente || 'Sin patente'), 
          nombreCondominio: condominio ? condominio.nombre : 'Condominio Desconocido',
          direccionCondominio: condominio ? condominio.direccion : 'Dirección no disponible'
        };
      });

      this.historial = historialEnriquecido;

    } catch (error) {
      console.error("Error al cargar el historial:", error);
      // Considera mostrar un toast al usuario aquí
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