import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonMenuButton,
  IonButtons,
  IonSpinner,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { AuthService } from '../services/auth.service';
import { AlertController, ToastController, AlertInput } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  hourglassOutline,
  checkmarkCircleOutline,
  personOutline,
  businessOutline,
  carSportOutline,
  homeOutline,
  peopleOutline,
  timeOutline,
  settingsOutline,
} from 'ionicons/icons';

import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    MatButtonModule,
    CommonModule,
    IonMenuButton,
    IonButtons,
    IonSpinner,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonItem,
    IonLabel,
    MenuLateralComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  statusMessage = '';
  Message = '';
  calling = false;
  buttonColor = '#ffffff';

  userProfile: any = null;
  patenteSeleccionada: string | null = null;
  condominioSeleccionado: any = null;
  misCondominiosCompletos: any[] = [];

  cargandoPerfil = true;
  estadoUsuario: 'cargando' | 'aprobado' | 'pendiente' | 'incompleto' = 'cargando';
  private profileSubscription: Subscription | null = null;

  private showingCondoSelector = false;

  phone = '+56921850610';
  message = 'OPEN';

  constructor(
    private http: HttpClient,
    private firestore: BlockiaFirestoreService,
    private auth: AuthService,
    private alertController: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    private changeDetector: ChangeDetectorRef
  ) {
    addIcons({
      hourglassOutline,
      businessOutline,
      carSportOutline,
      homeOutline,
      peopleOutline,
      timeOutline,
      personOutline,
      settingsOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit() {
    console.log('HomePage ngOnInit');
    this.cargandoPerfil = true;
    this.estadoUsuario = 'cargando';

    this.profileSubscription = this.auth.userProfile$.subscribe((profile: any) => {
      console.log(
        'Recibido perfil en Home:',
        profile ? `Perfil ${profile.id}` : 'Perfil NULL'
      );

      if (JSON.stringify(profile) !== JSON.stringify(this.userProfile)) {
        console.log('Perfil diferente detectado, actualizando contexto...');
        this.cargandoPerfil = true;
        this.estadoUsuario = 'cargando';
        this.userProfile = profile;

        if (profile) {
          this.cargarContextoUsuario(profile);
        } else {
          this.patenteSeleccionada = null;
          this.condominioSeleccionado = null;
          this.misCondominiosCompletos = [];
          this.estadoUsuario = 'cargando';
          this.cargandoPerfil = false;
          this.changeDetector.detectChanges();
        }
      } else {
        console.log('Perfil recibido es igual al actual, no se recarga contexto.');
        if (this.cargandoPerfil && !profile) {
          this.cargandoPerfil = false;
          this.changeDetector.detectChanges();
        }
      }
    });
  }

  ngOnDestroy() {
    console.log('HomePage ngOnDestroy: Cancelando suscripción.');
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
    if (this.userProfile && !this.cargandoPerfil) {
      console.log('Actualizando contexto (ionViewWillEnter)...');
      this.cargarContextoUsuario(this.userProfile);
    }
  }

  async handleRefresh(event: any) {
    console.log('Refrescando datos...');
    if (this.userProfile) {
      try {
        await this.cargarContextoUsuario(this.userProfile);
        console.log('Datos refrescados.');
      } catch (error) {
        console.error('Error durante el refresco:', error);
        this.presentToast('No se pudo refrescar la información.', 'danger');
      } finally {
        event.target.complete();
      }
    } else {
      console.log('Refresco cancelado: No hay perfil de usuario.');
      event.target.complete();
    }
  }

  async cargarContextoUsuario(profile: any) {
    console.log('Iniciando cargarContextoUsuario...');

    if (this.estadoUsuario !== 'aprobado') {
      this.cargandoPerfil = true;
    }
    this.statusMessage = '';
    const visitasRecienExpiradas: any[] = [];
    const condominiosHabilitados: any[] = [];

    if (!profile.perfilCompleto) {
      this.estadoUsuario = 'incompleto';
      console.log('Perfil incompleto, redirigiendo...');
      setTimeout(
        () => this.router.navigate(['/completar-perfil'], { replaceUrl: true }),
        0
      );
      this.cargandoPerfil = false;
      this.changeDetector.detectChanges();
      return;
    } else if (!profile.condominios || profile.condominios.length === 0) {
      this.estadoUsuario = 'pendiente';
      console.log('Perfil completo pero sin condominios asignados (pendiente).');
      this.misCondominiosCompletos = [];
      this.condominioSeleccionado = null;
      this.cargandoPerfil = false;
      this.changeDetector.detectChanges();
      return;
    }

    this.estadoUsuario = 'aprobado';
    console.log('Perfil completo y con condominios, procesando acceso...');

    if (profile.patentes && profile.patentes.length > 0) {
      if (
        !this.patenteSeleccionada ||
        !profile.patentes.includes(this.patenteSeleccionada)
      ) {
        this.patenteSeleccionada = profile.patentes[0];
      }
    } else {
      this.patenteSeleccionada = null;
    }
    console.log('Patente seleccionada:', this.patenteSeleccionada);

    const userCondoArray: any[] = profile.condominios || [];
    if (userCondoArray.length > 0) {
      const promesasDetalles = userCondoArray.map((c: any) =>
        this.firestore.getCondominioById(c.id)
      );
      const condominiosConDetalles: any[] = (await Promise.all(promesasDetalles)).filter(
        Boolean
      );

      const condominiosPorRolFijo = condominiosConDetalles.filter((condo: any) =>
        userCondoArray.find(
          (c: any) =>
            c.id === condo.id &&
            (c.rol === 'RESIDENTE' ||
              c.rol === 'CONSERJERIA' ||
              c.rol === 'conserjeria')
        )
      );
      condominiosHabilitados.push(...condominiosPorRolFijo);
      console.log(
        `Condominios habilitados por rol RESIDENTE/CONSERJERIA: ${condominiosPorRolFijo.length}`
      );

      const condominiosDondeEsVisitaRefs = userCondoArray.filter(
        (c: any) => c.rol === 'VISITANTE'
      );
      if (condominiosDondeEsVisitaRefs.length > 0) {
        try {
          const visitasDeHoy: any[] =
            await this.firestore.getTodaysVisitsByPhone(profile.telefono);
          const ahora = new Date();
          console.log(
            `Visitas encontradas para hoy: ${visitasDeHoy?.length || 0}`
          );

          if (Array.isArray(visitasDeHoy)) {
            condominiosDondeEsVisitaRefs.forEach((visitaRef: any) => {
              const condo = condominiosConDetalles.find(
                (cd: any) => cd.id === visitaRef.id
              );
              if (!condo) return;

              const visitaCorrespondiente = visitasDeHoy.find(
                (v: any) => v.condominioId === condo.id
              );
              if (
                !visitaCorrespondiente ||
                !visitaCorrespondiente['horaInicio'] ||
                !visitaCorrespondiente['horaFin']
              ) {
                console.log(
                  `No se encontró visita válida o con horarios para ${condo.nombre}`
                );
                return;
              }

              try {
                const [horaInicio, minInicio] =
                  visitaCorrespondiente['horaInicio'].split(':');
                const [horaFin, minFin] =
                  visitaCorrespondiente['horaFin'].split(':');

                const fechaInicio = new Date(
                  ahora.getFullYear(),
                  ahora.getMonth(),
                  ahora.getDate(),
                  parseInt(horaInicio, 10),
                  parseInt(minInicio, 10)
                );
                const fechaFin = new Date(
                  ahora.getFullYear(),
                  ahora.getMonth(),
                  ahora.getDate(),
                  parseInt(horaFin, 10),
                  parseInt(minFin, 10)
                );
                const fechaFinMasDosHoras = new Date(
                  fechaFin.getTime() + 2 * 60 * 60 * 1000
                );

                if (ahora >= fechaInicio && ahora <= fechaFin) {
                  condominiosHabilitados.push(condo);
                  console.log(`Visita a ${condo.nombre} HABILITADA.`);
                } else if (ahora > fechaFin && ahora <= fechaFinMasDosHoras) {
                  visitasRecienExpiradas.push(condo);
                  console.log(`Visita a ${condo.nombre} RECIÉN EXPIRADA.`);
                } else {
                  console.log(`Visita a ${condo.nombre} FUERA DE HORARIO.`);
                }
              } catch (timeError) {
                console.error(
                  `Error procesando horarios para ${condo.nombre}:`,
                  timeError
                );
              }
            });
          } else {
            console.warn('getTodaysVisitsByPhone no devolvió un array.');
          }
        } catch (visitError) {
          console.error('Error al obtener o procesar visitas:', visitError);
        }
      }
    }

    this.misCondominiosCompletos = [
      ...new Map(
        condominiosHabilitados.map((item: any) => [item.id, item])
      ).values(),
    ];
    console.log(
      `Total condominios HABILITADOS (final): ${this.misCondominiosCompletos.length
      }`,
      this.misCondominiosCompletos.map((c: any) => c.nombre)
    );

    if (this.misCondominiosCompletos.length === 1) {
      this.condominioSeleccionado = this.misCondominiosCompletos[0];
      console.log(
        'Condominio único seleccionado:',
        this.condominioSeleccionado?.nombre
      );
    } else if (this.misCondominiosCompletos.length > 1) {
      const seleccionadoSigueValido = this.misCondominiosCompletos.some(
        (c: any) => c.id === this.condominioSeleccionado?.id
      );
      if (!seleccionadoSigueValido || !this.condominioSeleccionado) {
        this.condominioSeleccionado = null;
        console.log(
          'Pidiendo elegir condominio (múltiples disponibles o selección inválida).'
        );
        if (!this.showingCondoSelector) {
          this.showingCondoSelector = true;
          setTimeout(() => this.cambiarCondominio(), 50);
        }
      } else {
        console.log(
          'Selección actual sigue válida:',
          this.condominioSeleccionado.nombre
        );
      }
    } else {
      this.condominioSeleccionado = null;
      this.estadoUsuario = 'pendiente';
      console.log("No hay condominios habilitados. Estado cambiado a 'pendiente'.");
      if (!this.patenteSeleccionada) {
        this.statusMessage = 'No tienes patente asignada.';
      } else if (visitasRecienExpiradas.length > 0) {
        this.statusMessage = `Tu invitación para ${visitasRecienExpiradas[0]?.nombre} expiró.`;
      } else {
        this.statusMessage = 'No tienes acceso activo a condominios.';
      }
    }

    this.cargandoPerfil = false;
    console.log('Fin cargarContextoUsuario. Estado final:', this.estadoUsuario);
    this.changeDetector.detectChanges();
  }

  async cambiarCondominio() {
    console.log('Mostrando selector de condominio...');
    if (!this.misCondominiosCompletos || this.misCondominiosCompletos.length <= 1) {
      this.showingCondoSelector = false;
      console.log('No hay múltiples condominios habilitados para elegir.');
      return;
    }

    const alertInputs: AlertInput[] = this.misCondominiosCompletos.map(
      (condo: any) => ({
        type: 'radio',
        label: condo.nombre,
        value: condo,
        checked: this.condominioSeleccionado?.id === condo.id,
      })
    );

    const alert = await this.alertController.create({
      header: 'Selecciona Condominio',
      inputs: alertInputs,
      backdropDismiss: false,
      cssClass: 'blockia-alert blockia-alert--condo',
      buttons: [
        {
          text: 'Confirmar',
          handler: (selectedCondo: any) => {
            this.showingCondoSelector = false;
            if (!selectedCondo) {
              this.presentToast('Debes seleccionar un condominio.', 'warning');
              return false;
            }
            this.condominioSeleccionado = selectedCondo;
            console.log('Condominio cambiado a:', selectedCondo.nombre);
            this.changeDetector.detectChanges();
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async cambiarPatente() {
    console.log('Mostrando selector de patente...');
    const patentes: string[] = this.userProfile?.patentes || [];
    if (patentes.length <= 1) return;

    const alertInputs: AlertInput[] = patentes.map((p: string) => ({
      type: 'radio',
      label: p,
      value: p,
      checked: p === this.patenteSeleccionada,
    }));

    const alert = await this.alertController.create({
      header: 'Selecciona tu Patente',
      inputs: alertInputs,
      cssClass: 'blockia-alert blockia-alert--plate',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (p: string) => {
            if (p) this.patenteSeleccionada = p;
            console.log('Patente cambiada a:', p);
            this.changeDetector.detectChanges();
          },
        },
      ],
    });

    await alert.present();
  }

  enviarSMS() {
    console.log('Intentando enviar SMS...');
    if (!this.patenteSeleccionada) {
      this.presentToast('Selecciona una patente.', 'warning');
      return;
    }
    if (!this.condominioSeleccionado) {
      this.presentToast('Selecciona un condominio.', 'warning');
      return;
    }
    if (this.calling) {
      console.log('Llamada ya en progreso.');
      return;
    }
    this.procederConApertura();
  }

  procederConApertura() {
    console.log(
      `Iniciando apertura para ${this.condominioSeleccionado.nombre} con patente ${this.patenteSeleccionada}`
    );
    this.statusMessage = 'Activando...';
    this.Message = 'Activando';
    this.calling = true;
    this.buttonColor = '#ffcc00';

    const url = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';
    const body = { to: this.phone, message: this.message };

    this.http.post(url, body).subscribe({
      next: (res: any) => {
        console.log('Respuesta SMS:', res);
        const historialData = {
          userId: this.userProfile.id,
          condominioId: this.condominioSeleccionado.id,
          patente: this.patenteSeleccionada,
        };
        this.firestore
          .addHistorialApertura(historialData)
          .then(() => console.log('Historial guardado.'))
          .catch((err) => console.error('Error guardando historial:', err));

        this.buttonColor = '#4caf50';
        this.statusMessage = 'Acceso Activado';
        this.Message = 'Activado';
        setTimeout(() => {
          this.buttonColor = '#ffffff';
          this.Message = 'Abrir';
        }, 3000);
      },
      error: (err: any) => {
        console.error('Error al enviar SMS:', err);
        this.calling = false;
        this.buttonColor = '#f44336';
        this.statusMessage = '❌ Error al activar';
        this.Message = 'Error';
        setTimeout(() => {
          this.buttonColor = '#ffffff';
          this.Message = 'Abrir';
          this.statusMessage = '';
        }, 5000);
      },
      complete: () => {
        console.log('Llamada SMS completada.');
        setTimeout(() => {
          if (this.Message !== 'Error') {
            this.statusMessage = '';
          }
          this.calling = false;
        }, 8000);
      },
    });
  }

  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'dark' = 'dark'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    toast.present();
  }
}
