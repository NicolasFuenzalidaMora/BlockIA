// home-condominios.page.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonSelect, IonSelectOption, IonButton, IonLabel, IonList, IonItem } from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'registros',
  templateUrl: './registros.page.html',
  styleUrls: ['./registros.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonInput, IonSelect, IonSelectOption, IonButton,
    IonLabel, IonList, IonItem,
    MatButtonModule, ReactiveFormsModule, CommonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegistrosPage {
  condominios: any[] = [];
  cargando = true;

  userForm = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required]),
    rol: new FormControl('residente', [Validators.required]),
    departamento: new FormControl('', [Validators.required]),
    condominioId: new FormControl('', [Validators.required])
  });

  constructor(private bf: BlockiaFirestoreService) {}

  async ngOnInit() {
    await this.cargarCondominios();
  }

  async cargarCondominios() {
    try {
      this.condominios = await this.bf.getCondominios();
      console.log('Condominios obtenidos:', this.condominios);
    } catch (err) {
      console.error('Error al consultar condominios:', err);
    } finally {
      this.cargando = false;
    }
  }

  async registrarUsuario() {
    if (this.userForm.invalid) {
      alert('Por favor complete todos los campos correctamente.');
      return;
    }

    const usuario = {
      ...this.userForm.value,
      creadoEn: new Date()
    };

    try {
      await this.bf.addUser(usuario);
      alert('Usuario registrado correctamente ✅');
      this.userForm.reset();
    } catch (err) {
      console.error('Error al registrar usuario:', err);
      alert('Error al registrar usuario ❌');
    }
  }
}
