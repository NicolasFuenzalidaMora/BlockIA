// Ruta: src/app/components/edit-user-modal/edit-user-modal.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule
} from '@angular/forms';
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
    ReactiveFormsModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel,
    IonList, IonSelect, IonSelectOption, IonIcon, IonInput, IonListHeader,
    IonRadio, IonRadioGroup
  ]
})
export class EditUserModalComponent implements OnInit {

  @Input() usuario: any;
  @Input() condominiosEditablesPorAdmin: string[] | null = null; // IDs de condominios que el admin puede gestionar

  editForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    departamento: new FormControl(''),
  });

  // Patentes
  patenteActual: string = '';
  patentesAgregadas: string[] = [];

  // Edición de rol en condominios existentes
  condominioSeleccionadoId: string | null = null;
  rolCondominioControl = new FormControl('');
  condominiosEditablesDelUsuario: any[] = []; // { id, rol, nombre }

  // Agregar a nuevo condominio
  condominiosDisponiblesParaAgregar: any[] = []; // { id, nombre, ... }
  nuevoCondominioId: string | null = null;
  nuevoCondominioRol: string = 'RESIDENTE';

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

    // Form inicial
    this.editForm.patchValue({
      nombre: this.usuario.nombre || '',
      departamento: this.usuario.departamento || ''
    });

    this.patentesAgregadas = [...(this.usuario.patentes || [])];

    // Cargar condominios donde YA está el usuario
    await this.cargarYFiltrarCondominiosUsuario();

    // Cargar condominios donde AÚN NO está el usuario (pero el admin los puede gestionar)
    await this.cargarCondominiosDisponiblesParaAgregar();

    // Si solo hay uno editable, lo seleccionamos
    if (this.condominiosEditablesDelUsuario.length === 1) {
      this.seleccionarCondominioParaEditar(this.condominiosEditablesDelUsuario[0].id);
    }
  }

  /** Carga condominios actuales del usuario, filtrados por lo que el admin puede editar */
  async cargarYFiltrarCondominiosUsuario() {
    this.condominiosEditablesDelUsuario = [];
    if (!this.usuario.condominios || this.usuario.condominios.length === 0) return;

    console.log('Condominios editables por admin:', this.condominiosEditablesPorAdmin);

    try {
      const promesas = this.usuario.condominios.map(async (condoRef: any) => {
        const esEditable =
          this.condominiosEditablesPorAdmin === null ||
          this.condominiosEditablesPorAdmin.includes(condoRef.id);

        if (!esEditable) return null;

        const condoDetalle = await this.bf.getCondominioById(condoRef.id);
        return {
          id: condoRef.id,
          rol: condoRef.rol,
          nombre: (condoDetalle as any)?.nombre || `ID: ${condoRef.id}`
        };
      });

      const condominiosConNulos = await Promise.all(promesas);
      this.condominiosEditablesDelUsuario =
        condominiosConNulos.filter(c => c !== null) as any[];

      console.log('Condominios editables para este usuario:', this.condominiosEditablesDelUsuario);
    } catch (error) {
      console.error('Error cargando/filtrando detalles de condominios:', error);
      this.condominiosEditablesDelUsuario = this.usuario.condominios
        .filter(
          (c: any) =>
            this.condominiosEditablesPorAdmin === null ||
            this.condominiosEditablesPorAdmin.includes(c.id)
        )
        .map((c: any) => ({ ...c, nombre: 'ID: ' + c.id }));
    }
  }

  /** Carga condominios donde el usuario AÚN NO está y que el admin puede editar */
  async cargarCondominiosDisponiblesParaAgregar() {
    try {
      const todos = await this.bf.getCondominios();

      const idsActualesUsuario: string[] = Array.isArray(this.usuario.condominios)
        ? this.usuario.condominios.map((c: any) => c.id)
        : [];

      this.condominiosDisponiblesParaAgregar = todos.filter((condo: any) => {
        const adminPuedeEditar =
          this.condominiosEditablesPorAdmin === null ||
          this.condominiosEditablesPorAdmin.includes(condo.id);
        const usuarioYaEsta = idsActualesUsuario.includes(condo.id);
        return adminPuedeEditar && !usuarioYaEsta;
      });

      console.log(
        'Condominios disponibles para agregar a este usuario:',
        this.condominiosDisponiblesParaAgregar
      );
    } catch (error) {
      console.error('Error al cargar condominios disponibles para agregar:', error);
      this.condominiosDisponiblesParaAgregar = [];
    }
  }

  /** Seleccionar condominio existente para editar rol */
  seleccionarCondominioParaEditar(condominioId: string) {
    this.condominioSeleccionadoId = condominioId;
    const condo = this.condominiosEditablesDelUsuario.find(c => c.id === condominioId);
    this.rolCondominioControl.setValue(condo ? (condo.rol || 'indefinido') : '');
    console.log(
      `Condominio ${condominioId} seleccionado. Rol actual: ${this.rolCondominioControl.value}`
    );
  }

  getNombreCondominioSeleccionado(): string {
    if (!this.condominioSeleccionadoId) return 'Condominio Seleccionado';
    const condo = this.condominiosEditablesDelUsuario.find(
      c => c.id === this.condominioSeleccionadoId
    );
    return condo?.nombre || 'ID Desconocido';
  }

  /** Patentes */
  agregarPatente() {
    if (!this.patenteActual.trim()) return;

    const patenteInput = this.patenteActual.toUpperCase().trim();
    const formatoAuto = /^[A-Z]{4}\d{2}$/;
    const formatoMoto = /^[A-Z]{3}0\d{2}$/;

    if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
      this.presentToast('Formato de patente inválido (AAAA11 o AAA011).', 'warning');
      return;
    }

    if (!this.patentesAgregadas.includes(patenteInput)) {
      this.patentesAgregadas.push(patenteInput);
      this.patenteActual = '';
    } else {
      this.presentToast('Patente ya agregada.', 'warning');
    }
  }

  eliminarPatente(index: number) {
    this.patentesAgregadas.splice(index, 1);
  }

  /** Agregar usuario a nuevo condominio */
  async agregarCondominioAlUsuario() {
    if (!this.nuevoCondominioId) {
      this.presentToast('Selecciona un condominio para agregar.', 'warning');
      return;
    }

    const rolElegido = (this.nuevoCondominioRol || 'RESIDENTE').toUpperCase();

    try {
      // ⚠️ Este método debes implementarlo en BlockiaFirestoreService
      // async addUserToCondominio(userId: string, condominioId: string, nuevoRol: string)
      await this.bf.addUserToCondominio(this.usuario.id, this.nuevoCondominioId, rolElegido);

      // Actualizar en memoria el usuario
      if (!Array.isArray(this.usuario.condominios)) {
        this.usuario.condominios = [];
      }
      this.usuario.condominios.push({ id: this.nuevoCondominioId, rol: rolElegido });

      // Agregar a la lista de "editables"
      const detalle = await this.bf.getCondominioById(this.nuevoCondominioId);
      this.condominiosEditablesDelUsuario.push({
        id: this.nuevoCondominioId,
        rol: rolElegido,
        nombre: (detalle as any)?.nombre || `ID: ${this.nuevoCondominioId}`
      });

      // Sacarlo de la lista de "disponibles para agregar"
      this.condominiosDisponiblesParaAgregar =
        this.condominiosDisponiblesParaAgregar.filter(
          c => c.id !== this.nuevoCondominioId
        );

      // Preseleccionar el que acabamos de agregar
      this.seleccionarCondominioParaEditar(this.nuevoCondominioId);

      // Limpiar selects
      this.nuevoCondominioId = null;
      this.nuevoCondominioRol = 'RESIDENTE';

      this.presentToast('Condominio agregado al usuario.', 'success');
    } catch (error: any) {
      console.error('Error al agregar condominio al usuario:', error);
      this.presentToast(
        error?.message || 'No se pudo agregar el condominio.',
        'danger'
      );
    }
  }

  /** Guardar cambios generales (nombre, depto, patentes, rol en condominio seleccionado) */
  async guardarCambios() {
    if (this.editForm.invalid) {
      return this.presentToast('Revisa los campos requeridos (Nombre).', 'warning');
    }

    if (this.patenteActual.trim()) {
      this.agregarPatente();
      if (this.patenteActual.trim()) return; // si no se limpió, hubo error de formato
    }

    const updates: any = {};
    const formValues = this.editForm.value;

    // Datos básicos
    if (formValues.nombre !== this.usuario.nombre) {
      updates.nombre = formValues.nombre?.trim();
    }
    if (formValues.departamento !== this.usuario.departamento) {
      updates.departamento = formValues.departamento?.trim();
    }

    // Patentes
    const originales = (this.usuario.patentes || []).slice().sort();
    const nuevas = this.patentesAgregadas.slice().sort();
    if (JSON.stringify(originales) !== JSON.stringify(nuevas)) {
      updates.patentes = this.patentesAgregadas;
    }

    // Cambio de rol en condominio seleccionado
    const rolCondoOriginalObj = this.condominiosEditablesDelUsuario.find(
      c => c.id === this.condominioSeleccionadoId
    );
    const rolCondoOriginal = rolCondoOriginalObj?.rol;
    const rolCondoNuevoDelSelect = this.rolCondominioControl.value;

    let rolCambiado = false;
    let rolParaGuardar = '';

    if (
      this.condominioSeleccionadoId &&
      rolCondoNuevoDelSelect &&
      (rolCondoNuevoDelSelect as string).toLowerCase() !==
        (rolCondoOriginal || '').toLowerCase()
    ) {
      rolCambiado = true;
      rolParaGuardar = (rolCondoNuevoDelSelect as string).toUpperCase();
    }

    if (Object.keys(updates).length === 0 && !rolCambiado) {
      this.presentToast('No se realizaron cambios.', 'dark');
      this.modalCtrl.dismiss();
      return;
    }

    const confirmacion = confirm(
      `¿Guardar los cambios para "${updates.nombre || this.usuario.nombre}"?`
    );
    if (!confirmacion) return;

    try {
      if (Object.keys(updates).length > 0) {
        console.log('Actualizando datos básicos:', updates);
        await this.bf.updateUser(this.usuario.id, updates);
      }

      if (rolCambiado) {
        console.log(
          `Actualizando rol en condominio ${this.condominioSeleccionadoId} a ${rolParaGuardar}`
        );
        await this.bf.updateUserCondominioRol(
          this.usuario.id,
          this.condominioSeleccionadoId!,
          rolParaGuardar
        );
      }

      this.presentToast('✅ Datos actualizados correctamente.', 'success');
      this.modalCtrl.dismiss({ actualizado: true });
    } catch (err: any) {
      console.error('Error al guardar cambios:', err);
      this.presentToast(
        `❌ Error al guardar: ${err.message || 'No se pudo guardar.'}`,
        'danger'
      );
    }
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'dark' = 'dark'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    toast.present();
  }
}
