// Ruta: src/app/components/edit-user-modal/edit-user-modal.component.ts
// VERSIÓN COMPLETA Y CORREGIDA

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importamos FormsModule y las otras herramientas de formularios
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonIcon,
  ModalController, ToastController, IonInput, IonListHeader, IonRadio, IonRadioGroup
} from '@ionic/angular/standalone';
import { BlockiaFirestoreService } from 'src/app/services/blockia-firestore.service';
import { addIcons } from 'ionicons';
import { closeOutline, addCircle, trash } from 'ionicons/icons';

@Component({
  selector: 'app-edit-user-modal',
  templateUrl: './edit-user-modal.component.html',
  styleUrls: ['./edit-user-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Para FormGroup
    FormsModule,         // Para [(ngModel)]
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel,
    IonList, IonSelect, IonSelectOption, IonIcon, IonInput, IonListHeader,
    IonRadio, IonRadioGroup
  ]
})
export class EditUserModalComponent implements OnInit {

  @Input() usuario: any;
  @Input() condominiosEditablesPorAdmin: string[] | null = null; // IDs que puede editar

  editForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    departamento: new FormControl(''),
  });

  patenteActual: string = ''; // Para [(ngModel)]
  patentesAgregadas: string[] = [];
  condominioSeleccionadoId: string | null = null;
  rolCondominioControl = new FormControl('');
  condominiosEditablesDelUsuario: any[] = []; // Lista filtrada con nombres

  constructor(
    private modalCtrl: ModalController,
    private bf: BlockiaFirestoreService,
    private toastCtrl: ToastController
  ) {
    addIcons({ closeOutline, addCircle, trash });
  }

  async ngOnInit() {
    if (!this.usuario) {
      this.presentToast('Error: No se recibieron datos del usuario.', 'danger');
      this.cerrarModal();
      return;
    }

    // Llenar formulario inicial
    this.editForm.patchValue({
      nombre: this.usuario.nombre || '',
      departamento: this.usuario.departamento || ''
    });
    this.patentesAgregadas = [...(this.usuario.patentes || [])]; // Copiar array

    // Cargar y filtrar condominios
    await this.cargarYFiltrarCondominiosUsuario();

    // Preseleccionar si solo hay uno editable
    if (this.condominiosEditablesDelUsuario.length === 1) {
      this.seleccionarCondominioParaEditar(this.condominiosEditablesDelUsuario[0].id);
    }
  }

  /** Carga detalles y filtra según permisos del admin/conserje */
  async cargarYFiltrarCondominiosUsuario() {
      this.condominiosEditablesDelUsuario = [];
      if (!this.usuario.condominios || this.usuario.condominios.length === 0) return;

      console.log("Condominios editables por admin:", this.condominiosEditablesPorAdmin);

      try {
          const promesas = this.usuario.condominios.map(async (condoRef: any) => {
              const esEditable = this.condominiosEditablesPorAdmin === null || this.condominiosEditablesPorAdmin.includes(condoRef.id);
              if (esEditable) {
                  const condoDetalle = await this.bf.getCondominioById(condoRef.id);
                  return {
                      id: condoRef.id,
                      rol: condoRef.rol, // Guardamos el rol original (probablemente mayúsculas)
                      nombre: (condoDetalle as any)?.nombre || `ID: ${condoRef.id}`
                  };
              } else { return null; }
          });
          const condominiosConNulos = await Promise.all(promesas);
          this.condominiosEditablesDelUsuario = condominiosConNulos.filter(c => c !== null);
          console.log("Condominios editables para este usuario:", this.condominiosEditablesDelUsuario);
      } catch (error) {
          console.error("Error cargando/filtrando detalles de condominios:", error);
          this.condominiosEditablesDelUsuario = this.usuario.condominios
                .filter((c:any) => this.condominiosEditablesPorAdmin === null || this.condominiosEditablesPorAdmin.includes(c.id))
                .map((c:any) => ({...c, nombre: 'ID: '+c.id}));
      }
  }

  /** Se llama cuando se selecciona un condominio editable */
  seleccionarCondominioParaEditar(condominioId: string) {
    this.condominioSeleccionadoId = condominioId;
    const condo = this.condominiosEditablesDelUsuario.find(c => c.id === condominioId);
    // Setea el control con el valor exacto (para comparación correcta luego)
    this.rolCondominioControl.setValue(condo ? (condo.rol || 'indefinido') : '');
    console.log(`Condominio ${condominioId} seleccionado. Rol actual: ${this.rolCondominioControl.value}`);
  }

  /** Helper para obtener el nombre del condominio seleccionado */
  getNombreCondominioSeleccionado(): string {
      if (!this.condominioSeleccionadoId) return 'Condominio Seleccionado';
      const condo = this.condominiosEditablesDelUsuario.find(c => c.id === this.condominioSeleccionadoId);
      return condo?.nombre || 'ID Desconocido';
  }

  /** Añade patente a la lista temporal */
  agregarPatente() {
    if (!this.patenteActual.trim()) return;
    const patenteInput = this.patenteActual.toUpperCase().trim();
    const formatoAuto = /^[A-Z]{4}\d{2}$/;
    const formatoMoto = /^[A-Z]{3}0\d{2}$/;
    if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
       this.presentToast('Formato de patente inválido (AAAA11 o AAA011).', 'warning');
       return; // Importante retornar aquí para void
    }
    if (!this.patentesAgregadas.includes(patenteInput)) {
      this.patentesAgregadas.push(patenteInput);
      this.patenteActual = '';
    } else {
      this.presentToast('Patente ya agregada.', 'warning');
    }
  }

  /** Elimina patente de la lista temporal */
  eliminarPatente(index: number) {
    this.patentesAgregadas.splice(index, 1);
  }

  /** Cierra el modal */
  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  /** Guarda todos los cambios realizados en el modal */
  async guardarCambios() {
    if (this.editForm.invalid) {
        return this.presentToast('Revisa los campos requeridos (Nombre).', 'warning');
    }
    if (this.patenteActual.trim()) {
        this.agregarPatente();
        // Si agregarPatente falló, el input no se limpió, detenemos.
        if(this.patenteActual.trim()) return;
    }

    const updates: any = {};
    const formValues = this.editForm.value;

    // Comprobar cambios en datos básicos
    if (formValues.nombre !== this.usuario.nombre) updates.nombre = formValues.nombre?.trim(); // Trim para limpiar
    if (formValues.departamento !== this.usuario.departamento) updates.departamento = formValues.departamento?.trim(); // Trim
    if (JSON.stringify(this.patentesAgregadas.sort()) !== JSON.stringify((this.usuario.patentes || []).sort())) updates.patentes = this.patentesAgregadas;

    // Comprobar cambio de rol en condominio seleccionado
    const rolCondoOriginalObj = this.condominiosEditablesDelUsuario.find(c => c.id === this.condominioSeleccionadoId);
    const rolCondoOriginal = rolCondoOriginalObj?.rol; // Rol actual en BD
    // Rol seleccionado en el select (puede ser minúsculas o mixto dependiendo del value en HTML)
    let rolCondoNuevoDelSelect = this.rolCondominioControl.value;

    let rolCambiado = false;
    let rolParaGuardar = ''; // Variable para guardar la versión en MAYÚSCULAS

    // Comparamos ignorando mayúsculas/minúsculas para detectar el cambio de INTENCIÓN
    if (this.condominioSeleccionadoId && rolCondoNuevoDelSelect &&
        rolCondoNuevoDelSelect.toLowerCase() !== (rolCondoOriginal || '').toLowerCase())
    {
        rolCambiado = true;
        // Convertimos a MAYÚSCULAS para guardar consistentemente
        rolParaGuardar = rolCondoNuevoDelSelect.toUpperCase();
    }

    // Si no cambió nada, no hacemos nada
    if (Object.keys(updates).length === 0 && !rolCambiado) {
        this.presentToast('No se realizaron cambios.', 'dark');
        this.modalCtrl.dismiss(); // Cerramos el modal
        return;
    }

    // Confirmación
    const confirmacion = confirm(`¿Guardar los cambios para "${updates.nombre || this.usuario.nombre}"?`);
    if (!confirmacion) return;

    // Procedemos a guardar
    try {
      // 1. Actualizar datos básicos (si cambiaron)
      if (Object.keys(updates).length > 0) {
        console.log("Actualizando datos básicos:", updates);
        await this.bf.updateUser(this.usuario.id, updates);
      }

      // 2. Actualizar rol del condominio (si cambió)
      if (rolCambiado) {
        console.log(`Actualizando rol en condominio ${this.condominioSeleccionadoId} a ${rolParaGuardar}`);
        await this.bf.updateUserCondominioRol(this.usuario.id, this.condominioSeleccionadoId!, rolParaGuardar);
      }

      this.presentToast('✅ Datos actualizados correctamente.', 'success');
      this.modalCtrl.dismiss({ actualizado: true }); // Cerramos indicando éxito

    } catch (err: any) {
      console.error('Error al guardar cambios:', err);
      this.presentToast(`❌ Error al guardar: ${err.message || 'No se pudo guardar.'}`, 'danger');
      // No cerramos el modal en caso de error para que el usuario pueda reintentar
    }
  }

  /** Muestra mensajes Toast */
  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toastCtrl.create({
      message, duration: 3000, position: 'bottom', color: color
    });
    toast.present();
  }

} // <-- Fin clase