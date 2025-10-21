import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { carSportOutline, homeOutline } from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { EditarPerfilComponent } from '../components/editar-perfil/editar-perfil.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  standalone: true,
  imports: [IonicModule, CommonModule, EditarPerfilComponent],
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
    addIcons({ carSportOutline, homeOutline });
  }

  ngOnInit() {
    this.cargando = true;
    this.authSubscription = this.auth.user$.subscribe(user => {
      if (user) this.cargarDatosDeFirestore(user.uid);
      else { this.cargando = false; this.userProfile = null; }
    });
  }

  async cargarDatosDeFirestore(uid: string) {
    const profile: any = await this.bf.getUserById(uid);
    if (profile) {
      if (profile.condominioId) {
        const condominio: any = await this.bf.getCondominioById(profile.condominioId);
        profile.nombreCondominio = condominio?.nombre || 'Condominio no encontrado';
      } else {
        profile.nombreCondominio = 'Sin condominio asignado';
      }
      this.userProfile = profile;
    }
    this.cargando = false;
  }

  async editarPerfil() {
    const modal = await this.modalCtrl.create({
      component: EditarPerfilComponent,
      componentProps: { userProfile: this.userProfile }
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
