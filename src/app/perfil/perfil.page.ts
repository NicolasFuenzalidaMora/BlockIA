import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  homeOutline,
  businessOutline,
  logOutOutline,
  createOutline,
  personCircleOutline,
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { EditarPerfilComponent } from '../components/editar-perfil/editar-perfil.component';
import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, EditarPerfilComponent, MenuLateralComponent],
})
export class PerfilPage implements OnInit, OnDestroy {
  userProfile: any = null;
  cargando = true;
  private authSubscription: Subscription | null = null;

  constructor(
    private auth: AuthService,
    private bf: BlockiaFirestoreService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({
      carSportOutline,
      homeOutline,
      businessOutline,
      logOutOutline,
      createOutline,
      personCircleOutline,
    });
  }

  ngOnInit() {
    this.cargando = true;
    this.authSubscription = this.auth.user$.subscribe((user) => {
      if (user) {
        this.cargarDatosDeFirestore(user.uid);
      } else {
        this.cargando = false;
        this.userProfile = null;
         this.router.navigate(['/login-phone'], { replaceUrl: true });
      }
    });
  }
async cargarDatosDeFirestore(uid: string) {
  this.cargando = true;
  try {
    const profile: any = await this.bf.getUserById(uid);

    if (profile) {

      if (Array.isArray(profile.condominios) && profile.condominios.length > 0) {
        const detalles = await Promise.all(
          profile.condominios.map(async (c: any) => {
            const condo = await this.bf.getCondominioById(c.id);
            return {
              id: c.id,
              rol: (c.rol || '').toUpperCase(),
              nombre: (condo as any)?.nombre || `ID: ${c.id}`,
            };
          })
        );

        // 👇 Filtramos visitantes: solo RESIDENTE / CONSERJERIA
        const soloResidencia = detalles.filter(d =>
          d.rol === 'RESIDENTE' || d.rol === 'CONSERJERIA'
        );

        // Si hay al menos un condominio "real", usamos esos; si no, mostramos todos (solo visitantes)
        const listaParaMostrar = soloResidencia.length > 0 ? soloResidencia : detalles;

        profile.condominiosDetallados = listaParaMostrar;

        if (listaParaMostrar.length === 1) {
          profile.nombreCondominio = listaParaMostrar[0].nombre;
        } else {
          const [primero, ...resto] = listaParaMostrar;
          profile.nombreCondominio = `${primero.nombre} (+${resto.length} más)`;
        }

      } else if (profile.condominioId) {
        const condominio: any = await this.bf.getCondominioById(profile.condominioId);
        profile.nombreCondominio = condominio?.nombre || 'Condominio no encontrado';

      } else {
        profile.nombreCondominio = 'Sin condominio asignado';
      }

      this.userProfile = profile;
    } else {
      this.userProfile = null;
    }
  } catch (e) {
    console.error('Error al cargar perfil:', e);
    this.userProfile = null;
  } finally {
    this.cargando = false;
  }
}

  async editarPerfil() {
    if (!this.userProfile) return;

    const modal = await this.modalCtrl.create({
      component: EditarPerfilComponent,
      componentProps: { userProfile: this.userProfile },
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      await this.bf.updateUser(this.userProfile.id, data);
      this.cargarDatosDeFirestore(this.userProfile.id);
    }
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login-phone'], { replaceUrl: true });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }
}
