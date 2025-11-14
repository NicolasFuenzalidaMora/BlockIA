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
      }
    });
  }

  async cargarDatosDeFirestore(uid: string) {
    this.cargando = true;
    try {
      const profile: any = await this.bf.getUserById(uid);
      if (profile) {
        // Condominio “legacy” por condominioId,
        // si en el futuro cambias a array de condominios, aquí puedes adaptar.
        if (profile.condominioId) {
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
