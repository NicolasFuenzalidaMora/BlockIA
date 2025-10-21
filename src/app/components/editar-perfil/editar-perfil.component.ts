import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { cameraOutline, trashOutline, addOutline } from 'ionicons/icons';
import { ModalController, IonicModule, ActionSheetController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.component.html',
  standalone: true,
  imports: [IonicModule, FormsModule],
})
export class EditarPerfilComponent implements OnInit {

  @Input() userProfile: any;
  @ViewChild('fileInput') fileInput!: ElementRef;

  datosEditables: any = {};
  fotoUrl: string = '';
  nuevaPatente: string = '';
  subiendoFoto = false;

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private auth: AuthService,
    private toastCtrl: ToastController
  ) {
    addIcons({ cameraOutline, trashOutline, addOutline });
  }

  ngOnInit() {
    if (this.userProfile) {
      this.datosEditables.nombre = this.userProfile.nombre;
      this.datosEditables.telefono = this.userProfile.telefono;
      this.datosEditables.departamento = this.userProfile.departamento || '';
      this.datosEditables.patentes = Array.isArray(this.userProfile.patentes) 
        ? [...this.userProfile.patentes] 
        : (this.userProfile.patente ? [this.userProfile.patente] : []);
      this.fotoUrl = this.userProfile.fotoUrl || '';
      this.datosEditables.fotoUrl = this.userProfile.fotoUrl || '';
    }
  }

  async cambiarFoto() {
    if (Capacitor.isNativePlatform()) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Seleccionar Foto',
        buttons: [
          { text: 'Tomar Foto con Cámara', handler: () => this.seleccionarFuenteNativa(CameraSource.Camera) },
          { text: 'Elegir de la Galería', handler: () => this.seleccionarFuenteNativa(CameraSource.Photos) },
          { text: 'Cancelar', role: 'cancel' },
        ],
      });
      await actionSheet.present();
    } else {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'image/jpeg') {
      this.presentToast('Solo se permiten archivos JPG');
      return;
    }

    this.fotoUrl = URL.createObjectURL(file);
    this.subirFoto(file);
  }

  async seleccionarFuenteNativa(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 75,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: source,
        width: 1024,
        height: 1024,
      });

      if (image?.webPath) {
        this.fotoUrl = image.webPath;
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.subirFoto(blob);
      }
    } catch (error) {
      console.error('Error al seleccionar la foto:', error);
      this.presentToast('Error al seleccionar la foto');
    }
  }

  async subirFoto(file: Blob | File) {
    const user = this.auth.currentUser;
    if (!user) return this.presentToast('Usuario no autenticado');

    this.subiendoFoto = true;
    const storage = getStorage();
    const filePath = `profile_pictures/${user.uid}/perfil.jpg`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      this.datosEditables.fotoUrl = downloadUrl;
      this.fotoUrl = downloadUrl;
    } catch (error) {
      console.error('Error al subir la foto:', error);
      this.presentToast('Error al subir la foto');
    } finally {
      this.subiendoFoto = false;
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'warning'
    });
    toast.present();
  }

agregarPatente(): void {
    if (!this.nuevaPatente.trim()) return;

    const patenteInput = this.nuevaPatente.toUpperCase().trim();
    const formatoAuto = /^[A-Z]{4}\d{2}$/; 
    const formatoMoto = /^[A-Z]{3}0\d{2}$/; 

    if (!formatoAuto.test(patenteInput) && !formatoMoto.test(patenteInput)) {
      this.presentToast('Formato de patente inválido. Use AAAA11 o AAA011.');
      return;
    }

    if (!this.datosEditables.patentes.includes(patenteInput)) {
      this.datosEditables.patentes.push(patenteInput);
    } else {
      this.presentToast('Esa patente ya ha sido agregada.');
    }

    this.nuevaPatente = '';
}

  eliminarPatente(index: number) { this.datosEditables.patentes.splice(index, 1); }
  cancelar() { this.modalCtrl.dismiss(null, 'cancel'); }
  guardarCambios() { this.modalCtrl.dismiss(this.datosEditables, 'confirm'); }
}
