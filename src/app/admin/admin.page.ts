// Ruta: src/app/admin/admin.page.ts
// VERSIÓN COMPLETA FINAL: MODAL FUNCIONAL + PERMISOS COMPLETOS + SOLICITUDES INTEGRADAS (SIN PLACEHOLDERS)

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonItem, IonInput, IonLabel, IonList, IonSelect,
  IonSelectOption, IonSpinner, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonIcon,
  ToastController,
  IonAccordion, IonAccordionGroup,
  ModalController,
  IonButtons, IonMenuButton,
  IonBadge // Importado para solicitudes
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { addIcons } from 'ionicons';
// Importamos todos los iconos necesarios
import { searchOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { EditUserModalComponent } from 'src/app/components/edit-user-modal/edit-user-modal.component';
import { Subscription } from 'rxjs'; // Importado Subscription

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonInput, IonLabel, IonList,
    IonSelect, IonSelectOption, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon,
    IonAccordion, IonAccordionGroup, IonButtons, IonMenuButton, IonBadge, // Añadido IonBadge
    ReactiveFormsModule, CommonModule, EditUserModalComponent
  ]
})
export class AdminPage implements OnInit, OnDestroy {

  // Formularios
  condominioForm = new FormGroup({
      nombre: new FormControl('', [Validators.required]),
      direccion: new FormControl('', [Validators.required])
  });
  userForm = new FormGroup({
      nombre: new FormControl('', [Validators.required]),
      telefono: new FormControl('', [Validators.required, Validators.pattern(/^(9\d{8}|\+569\d{8})$/)]),
      patente: new FormControl(''),
      rol: new FormControl('residente', [Validators.required]),
      departamento: new FormControl('', [Validators.required]),
      condominioId: new FormControl('', [Validators.required])
  });
  telefonoBusquedaForm = new FormGroup({
      telefono: new FormControl('', [
          Validators.required,
          Validators.pattern(/^(9\d{8}|\+569\d{8})$/)
      ])
  });

  // Estados de carga y datos
  cargandoBusqueda = false;
  condominios: any[] = []; // Lista COMPLETA de todos los condominios
  cargandoCondominios = true;
  solicitudes: any[] = [];
  cargandoSolicitudes = true;
  // Lista filtrada para el dropdown de registro
  condominiosParaSelect: any[] = [];

  // Permisos y Rol
  esSuperAdmin = false;
  condominiosDelAdmin: string[] = []; // IDs que administra
  rolActualDetectado: string = 'Cargando...';
  private profileSubscription: Subscription | null = null;

  constructor(
    private bf: BlockiaFirestoreService,
    private auth: AuthService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private changeDetector: ChangeDetectorRef
  ) {
    addIcons({ searchOutline, checkmarkCircleOutline, closeCircleOutline });
    console.log('[AdminPage Final Completo] Constructor');
  }

  ngOnInit() {
    console.log('[AdminPage Final Completo] ngOnInit iniciado');
    // Suscripción al perfil para actualizar rol Y recargar solicitudes
    this.profileSubscription = this.auth.userProfile$.subscribe(perfil => {
        console.log('[AdminPage Final Completo] Perfil recibido via observable:', perfil ? 'OK' : 'NULL');
        this.determinarRolUsuario(perfil); // Actualiza 'esSuperAdmin' y 'condominiosDelAdmin'
        // Actualiza la lista filtrada para el select
        this.actualizarCondominiosParaSelect();
        // Solo cargamos solicitudes si ya determinamos el rol
        if (this.rolActualDetectado !== 'Cargando...' && this.rolActualDetectado !== 'Perfil no disponible') {
            this.cargarSolicitudes(); // Recarga solicitudes con la info de rol actualizada
        }
        this.changeDetector.detectChanges(); // Actualiza HTML
    });
    // Carga inicial de condominios (para selects)
    this.cargarCondominios(); // Esta llamada también actualizará condominiosParaSelect al terminar
    console.log('[AdminPage Final Completo] ngOnInit: Suscripción y carga inicial de condominios listas.');
  }

  ngOnDestroy() {
      console.log('[AdminPage Final Completo] ngOnDestroy: Cancelando suscripción.');
      if (this.profileSubscription) {
          this.profileSubscription.unsubscribe();
      }
  }

  /** Determina rol y guarda IDs de condominios administrados */
  determinarRolUsuario(perfil: any) {
      this.condominiosDelAdmin = []; // Limpiar por defecto
      if (!perfil) {
          this.esSuperAdmin = false;
          this.rolActualDetectado = 'Perfil no disponible';
          console.log('[AdminPage Final Completo] Perfil no disponible al determinar rol.');
          return;
      }
      if (perfil.rol === 'administrador') { // Comprueba rol RAÍZ
          this.esSuperAdmin = true;
          this.rolActualDetectado = 'Administrador General';
          console.log('[AdminPage Final Completo] Rol detectado: Super Administrador.');
      } else {
          this.esSuperAdmin = false;
          this.rolActualDetectado = 'Usuario (Rol: ' + (perfil.rol || 'No definido') + ')';
          console.log(`[AdminPage Final Completo] Rol detectado: ${this.rolActualDetectado} (No Super Admin).`);
          // Calcula condominios administrados (si aplica)
          if (perfil.condominios) {
              this.condominiosDelAdmin = perfil.condominios
                  .filter((c: any) => c.rol === 'administrador' || c.rol === 'conserjeria')
                  .map((c: any) => c.id);
              if (this.condominiosDelAdmin.length > 0) {
                 this.rolActualDetectado = 'Admin/Conserje de Condominio';
              }
              console.log('[AdminPage Final Completo] Condominios administrados:', this.condominiosDelAdmin);
          } else { console.log('[AdminPage Final Completo] No se encontraron condominios administrados.'); }
      }
  }

  /** Carga la lista COMPLETA de condominios desde Firestore */
  async cargarCondominios() {
    console.log("[AdminPage Final Completo] Iniciando carga de TODOS los condominios...");
    this.cargandoCondominios = true;
    try {
      this.condominios = await this.bf.getCondominios();
      console.log(`[AdminPage Final Completo] Condominios cargados: ${this.condominios?.length || 0}`);
      if (!Array.isArray(this.condominios)) {
           console.error("[AdminPage Final Completo] ERROR CRÍTICO: getCondominios no devolvió un array!", this.condominios);
           this.condominios = [];
      }
      // Actualiza la lista para el select DESPUÉS de cargar
      this.actualizarCondominiosParaSelect();
    } catch (err) {
        console.error('[AdminPage Final Completo] Error en cargarCondominios:', err);
        this.presentToast('❌ Error al cargar lista de condominios', 'danger');
        this.condominios = [];
        this.actualizarCondominiosParaSelect(); // Asegura lista vacía también en error
    } finally {
      this.cargandoCondominios = false;
      console.log("[AdminPage Final Completo] Finalizada carga de condominios.");
    }
  }

  /** Actualiza la lista 'condominiosParaSelect' según el rol */
  actualizarCondominiosParaSelect() {
      if (this.esSuperAdmin) {
          // El Super Admin ve TODOS los condominios disponibles
          this.condominiosParaSelect = [...this.condominios];
          console.log("[AdminPage Final Completo] Select mostrará TODOS los condominios.");
      } else {
          // El Conserje/Admin de Condominio ve SÓLO los que administra
          this.condominiosParaSelect = this.condominios.filter(condo =>
              this.condominiosDelAdmin.includes(condo.id)
          );
          console.log("[AdminPage Final Completo] Select mostrará condominios filtrados:", this.condominiosParaSelect.map(c=>c.id));
      }
      this.changeDetector.detectChanges(); // Actualiza el select en HTML
  }

  // Crear condominio (Usa this.esSuperAdmin)
  async crearCondominio() {
    if (!this.esSuperAdmin) {
        return this.presentToast('No tienes permiso para crear condominios.', 'danger');
    }
    if (this.condominioForm.invalid) {
        return this.presentToast('⚠️ Complete nombre y dirección', 'warning');
    }
    try {
        const dataToSend = {
            nombre: this.condominioForm.value.nombre || '',
            direccion: this.condominioForm.value.direccion || ''
        };
        await this.bf.addCondominio(dataToSend);
        this.presentToast(`✅ Condominio "${dataToSend.nombre}" creado`, 'success');
        this.condominioForm.reset();
        await this.cargarCondominios(); // Recarga ambas listas (completa y filtrada)
    } catch (err) {
        console.error('Error al crear condominio:', err);
        this.presentToast('❌ Error al crear condominio', 'danger');
    }
  }

  // Registrar usuario (CON VALIDACIÓN DE PATENTE y usa lista filtrada)
  async registrarUsuario() {
    // Verifica la lista FILTRADA
    if (!this.condominiosParaSelect || this.condominiosParaSelect.length === 0) {
        this.presentToast('No tienes condominios asignados para registrar usuarios.', 'warning'); return;
    }
    if (this.userForm.invalid) {
        if (this.userForm.get('telefono')?.errors) { this.presentToast('Formato de teléfono inválido (Use +569).', 'warning'); }
        else { this.presentToast('⚠️ Complete todos los campos requeridos.', 'warning'); }
        return;
    }

    try {
      const formValue = this.userForm.value;
      let patentesArray: string[] = [];
      if (formValue.patente && formValue.patente.trim() !== '') {
          const patenteInput = formValue.patente.toUpperCase().trim();
          const formatoAuto = /^[A-Z]{4}\d{2}$/;
          const formatoMoto = /^[A-Z]{3}0\d{2}$/;
          if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
              this.presentToast('Formato de patente inválido. Use AAAA11 o AAA011.', 'warning'); return;
          }
          patentesArray = [patenteInput];
      }
      const condoId = formValue.condominioId || '';
      const rolEnCondo = formValue.rol || 'residente';
      const condominiosArray = [{ id: condoId, rol: rolEnCondo }];
      const datosTransformados = {
        nombre: formValue.nombre, telefono: formValue.telefono, departamento: formValue.departamento,
        rol: rolEnCondo, // Rol raíz
        patentes: patentesArray, condominios: condominiosArray,
      };
      if (!datosTransformados.condominios[0].id) { throw new Error("ID de condominio no seleccionado."); }

      await this.bf.registerUserFromAdmin(datosTransformados);
      this.presentToast('✅ Usuario registrado correctamente', 'success');
      this.userForm.reset();
      this.userForm.patchValue({ rol: 'residente' });

    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      this.presentToast(`❌ Error al registrar usuario: ${err.message || 'Error desconocido'}`, 'danger');
    }
  }

  // Buscar usuario y abrir modal (CON PERMISOS DE EDICIÓN)
  async buscarUsuario(event?: Event) {
    event?.preventDefault();
    const telefonoValue = this.telefonoBusquedaForm.get('telefono')!.value;
    if (!telefonoValue || this.telefonoBusquedaForm.invalid) {
        return this.presentToast('Formato de teléfono inválido.', 'warning');
    }
    this.cargandoBusqueda = true;
    let phone = telefonoValue.replace(/\s+/g, '');
    if (phone.startsWith('9') && phone.length === 9) phone = '+56' + phone;

    try {
      const user: any = await this.bf.getUserByPhone(phone);
      if (!user) {
          this.presentToast('Usuario no encontrado.', 'warning');
          this.cargandoBusqueda = false; return;
      }

      // --- VERIFICACIÓN DE PERMISOS DE EDICIÓN ---
      let puedeEditar = false;
      console.log(`[Permisos Check] Buscando usuario. esSuperAdmin = ${this.esSuperAdmin}`);
      if (this.esSuperAdmin) {
          console.log("[Permisos Check] Es Super-Admin, permiso concedido.");
          puedeEditar = true;
      } else {
          console.log(`[Permisos Check] Condominios administrados (guardados): ${this.condominiosDelAdmin.join(', ')}`);
          if (this.condominiosDelAdmin.length > 0) {
              const condominiosUsuarioBuscado = (user.condominios || []).map((c: any) => c.id);
              const tieneCondominioCompartido = this.condominiosDelAdmin.some((idAdmin: string) =>
                  condominiosUsuarioBuscado.includes(idAdmin)
              );
              if (tieneCondominioCompartido) {
                  console.log("[Permisos Check] Conserje/Admin compartido, permiso concedido.");
                  puedeEditar = true;
              } else { console.log("[Permisos Check] No comparten condominio."); }
          } else { console.log("[Permisos Check] No es Super-Admin ni administra condominios."); }
      }
      // --- FIN VERIFICACIÓN ---

      if (!puedeEditar) {
          this.presentToast('No tienes permiso para editar este usuario.', 'danger');
          this.cargandoBusqueda = false; return;
      }

      await this.abrirModalEdicion(user);
      this.telefonoBusquedaForm.reset();

    } catch (err) {
        console.error('[AdminPage Final Completo] Error general buscarUsuario:', err);
        this.presentToast('❌ Error inesperado al buscar usuario', 'danger');
    } finally {
      this.cargandoBusqueda = false;
    }
  }

  async abrirModalEdicion(usuario: any) {
        try {
            console.log('[AdminPage Final] Crear modal con usuario:', usuario);
            console.log('[AdminPage Final] Pasando condominios administrados al modal:', this.condominiosDelAdmin); // LOG

            const modal = await this.modalCtrl.create({
                component: EditUserModalComponent,
                componentProps: {
                    usuario: usuario,
                    // 👇👇👇 ¡NUEVA PROPIEDAD PASADA! 👇👇👇
                    condominiosEditablesPorAdmin: this.esSuperAdmin ? null : this.condominiosDelAdmin
                    // Si es SuperAdmin, pasamos null (puede editar todo).
                    // Si no, pasamos la lista de IDs que administra.
                    // 👆👆👆 ¡NUEVA PROPIEDAD PASADA! 👆👆👆
                },
            });
            console.log('[AdminPage Final] Presentando modal...');
            await modal.present();
            console.log('[AdminPage Final] Modal presentado.');
            const { data } = await modal.onDidDismiss();
            console.log('[AdminPage Final] Modal cerrado, data:', data);
            if (data?.actualizado) { console.log('[AdminPage Final] Datos actualizados via modal.'); }
        } catch (err) {
            console.error('[AdminPage Final] Error abrirModalEdicion:', err);
            this.presentToast('❌ Error al abrir el modal de edición.', 'danger');
        }
    }
  // =============================================
  // === FUNCIONES PARA SOLICITUDES =============
  // =============================================

  async cargarSolicitudes() {
    console.log("[AdminPage Final Completo] Iniciando carga de solicitudes...");
    this.cargandoSolicitudes = true;
    this.solicitudes = []; // Limpiar siempre

    try {
      // Usamos las propiedades 'esSuperAdmin' y 'condominiosDelAdmin' actualizadas por determinarRolUsuario
      console.log(`[Solicitudes] Cargando con esSuperAdmin = ${this.esSuperAdmin}, Condos Admin: ${this.condominiosDelAdmin.join(',')}`);
      if (this.esSuperAdmin) {
          console.log('[Solicitudes] Llamando a getAllSolicitudesPendientes...');
          this.solicitudes = await this.bf.getAllSolicitudesPendientes();
      } else {
          // Si no es super admin, verificamos si administra condominios
          if (this.condominiosDelAdmin && this.condominiosDelAdmin.length > 0) {
              console.log('[Solicitudes] Llamando a getSolicitudesPendientes para:', this.condominiosDelAdmin);
              this.solicitudes = await this.bf.getSolicitudesPendientes(this.condominiosDelAdmin);
          } else {
              console.warn('[Solicitudes] No es Super-Admin y no administra condominios. No se cargarán solicitudes.');
              // solicitudes ya está como []
          }
      }
      console.log(`[Solicitudes] Carga finalizada, ${this.solicitudes?.length || 0} encontradas.`);

    } catch (err) {
      console.error('[AdminPage Final Completo] Error cargando solicitudes:', err);
      this.presentToast('❌ Error al cargar solicitudes.', 'danger');
      this.solicitudes = []; // Asegura array vacío en error
    } finally {
      this.cargandoSolicitudes = false;
      console.log("[AdminPage Final Completo] Finalizada carga de solicitudes.");
      this.changeDetector.detectChanges(); // Forzar actualización por si acaso
    }
  }

  // Aprobar Solicitud
  async aprobarSolicitud(solicitud: any) {
    try {
      await this.bf.aprobarSolicitud(solicitud);
      this.presentToast('Solicitud Aprobada ✅', 'success');
      await this.cargarSolicitudes(); // Recargar
    } catch (err: any) {
      console.error('Error al aprobar:', err);
      this.presentToast(`❌ Error al aprobar: ${err.message || 'Error desconocido'}`, 'danger');
    }
  }

  // Rechazar Solicitud
  async rechazarSolicitud(solicitud: any) {
    try {
      await this.bf.rechazarSolicitud(solicitud.id);
      this.presentToast('Solicitud Rechazada ❌', 'dark');
      await this.cargarSolicitudes(); // Recargar
    } catch (err: any) {
      console.error('Error al rechazar:', err);
      this.presentToast(`❌ Error al rechazar: ${err.message || 'Error desconocido'}`, 'danger');
    }
  }

  // Helper getNombreCondominio
  getNombreCondominio(id: string): string {
    if (!this.condominios || this.condominios.length === 0) { return `ID: ${id}`; }
    const condo = this.condominios.find(c => c.id === id);
    return condo?.nombre || `ID: ${id}`;
  }

  // Helper de Toast
  async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color: color });
    toast.present();
  }

} // <-- Fin de la clase AdminPage