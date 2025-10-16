// Ruta: src/app/admin/admin.page.ts

import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonInput, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonItem, IonInput, IonLabel, IonList,
    IonSelect, IonSelectOption,
    ReactiveFormsModule, CommonModule
  ]
})
export class AdminPage implements OnInit {

  // ============== CONDOMINIOS ==============
  condominioForm = new FormGroup({
    // id: new FormControl('', [Validators.required]), // <-- ELIMINADO
    nombre: new FormControl('', [Validators.required]),
    direccion: new FormControl('', [Validators.required])
  });

  // ============== USUARIOS ==============
  userForm = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required]),
    rol: new FormControl('residente', [Validators.required]),
    departamento: new FormControl('', [Validators.required]),
    condominioId: new FormControl('', [Validators.required])
  });

  condominios: any[] = [];
  cargando = true;

  constructor(private bf: BlockiaFirestoreService) {}

  async ngOnInit() {
    await this.cargarCondominios();
  }

  // 🔹 Crear nuevo condominio (CORREGIDO)
  async crearCondominio() {
    if (this.condominioForm.invalid) {
      alert('⚠️ Complete el nombre y la dirección del condominio.');
      return;
    }

    try {
      // Usamos el método del servicio que ya genera el ID automáticamente
      await this.bf.addCondominio(this.condominioForm.value);
      alert(`✅ Condominio "${this.condominioForm.value.nombre}" creado`);
      this.condominioForm.reset();
      await this.cargarCondominios(); // Refrescar lista
    } catch (err) {
      console.error(err);
      alert('❌ Error al crear condominio');
    }
  }

  // 🔹 Cargar condominios desde Firestore
  async cargarCondominios() {
    try {
      this.cargando = true;
      this.condominios = await this.bf.getCondominios();
      console.log('✅ Condominios cargados:', this.condominios);
    } catch (err) {
      console.error('Error al cargar condominios:', err);
    } finally {
      this.cargando = false;
    }
  }

  // 🔹 Registrar usuario (CORREGIDO)
  async registrarUsuario() {
    if (this.userForm.invalid) {
      alert('⚠️ Complete todos los campos del usuario.');
      return;
    }

    try {
      // Llamamos a la nueva función del servicio que maneja la creación de ID
      await this.bf.registerUserFromAdmin(this.userForm.value);
      alert('✅ Usuario registrado correctamente');
      this.userForm.reset();
    } catch (err) {
      console.error(err);
      alert('❌ Error al registrar usuario');
    }
  }
}