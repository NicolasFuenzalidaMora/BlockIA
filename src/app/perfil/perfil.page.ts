import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// ✅ Importa ModalController
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { carSportOutline, homeOutline } from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
// ✅ Importa el nuevo componente
import { EditarPerfilComponent } from '../components/editar-perfil/editar-perfil.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  standalone: true,
  imports: [IonicModule, CommonModule, EditarPerfilComponent], // ✅ Añade el componente aquí
})
export class PerfilPage implements OnInit, OnDestroy {
  
  userProfile: any = null;
  cargando = true;
  private authSubscription: Subscription | null = null;

  constructor(
    private auth: AuthService,
    private bf: BlockiaFirestoreService,
    private router: Router,
    private modalCtrl: ModalController // ✅ Inyecta el ModalController
  ) {
    addIcons({ carSportOutline, homeOutline });
  }

  ngOnInit() {
    // ... tu lógica de suscripción no cambia ...
    this.cargando = true;
    this.authSubscription = this.auth.user$.subscribe(user => {
      if (user) {
        this.cargarDatosDeFirestore(user.uid);
      } else {
        this.cargando = false;
        this.userProfile = null;
      }
    });
  }

  async cargarDatosDeFirestore(uid: string) {
    // ... tu lógica de carga de datos no cambia ...
    const profile: any = await this.bf.getUserById(uid);
    if (profile) {
      if (profile.condominioId) {
        const condominio: any = await this.bf.getCondominioById(profile.condominioId);
        profile.nombreCondominio = condominio ? condominio.nombre : 'Condominio no encontrado';
      } else {
        profile.nombreCondominio = 'Sin condominio asignado';
      }
      this.userProfile = profile;
    }
    this.cargando = false;
  }

  // ✅ Lógica para abrir el Modal
  async editarPerfil() {
    const modal = await this.modalCtrl.create({
      component: EditarPerfilComponent,
      componentProps: {
        userProfile: this.userProfile // Pasamos los datos actuales al modal
      }
    });
    await modal.present();

    // Esperamos a que el modal se cierre
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      // Si el usuario guardó, actualizamos en Firestore
      await this.bf.updateUser(this.userProfile.id, data);
      // Volvemos a cargar los datos para refrescar la vista
      this.cargarDatosDeFirestore(this.userProfile.id);
    }
  }
  
  async logout() {
    // ... sin cambios
    await this.auth.logout();
    this.router.navigate(['/login-phone'], { replaceUrl: true });
  }

  ngOnDestroy() {
    // ... sin cambios
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}