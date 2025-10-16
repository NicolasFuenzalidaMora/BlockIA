import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ModalController, IonicModule, ActionSheetController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { cameraOutline, trashOutline, addOutline } from 'ionicons/icons';

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
// ✅ LA SOLUCIÓN: Añade la palabra "export" aquí
export class EditarPerfilComponent implements OnInit {

  @Input() userProfile: any;
  @ViewChild('fileInput') fileInput!: ElementRef;

  datosEditables: any = {};
  fotoUrl: string = '';
  nuevaPatente: string = '';

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private auth: AuthService
  ) {
    addIcons({ cameraOutline, trashOutline, addOutline });
  }

  ngOnInit() {
    if (this.userProfile) {
      this.datosEditables.nombre = this.userProfile.nombre;
      this.datosEditables.telefono = this.userProfile.telefono;
      this.datosEditables.departamento = this.userProfile.departamento || '';
      this.datosEditables.patentes = Array.isArray(this.userProfile.patentes) ? [...this.userProfile.patentes] : (this.userProfile.patente ? [this.userProfile.patente] : []);
      this.fotoUrl = this.userProfile.fotoUrl || '';
    }
  }
  
  // ... (el resto de tu código no necesita cambios)
  
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
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      this.fotoUrl = previewUrl;
      this.subirFoto(file);
    }
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

      if (image && image.webPath) {
        this.fotoUrl = image.webPath;
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.subirFoto(blob);
      }
    } catch (error) {
      console.error('Error al seleccionar la foto:', error);
    }
  }

  async subirFoto(file: Blob | File) {
    const user = this.auth.currentUser;
    if (!user) return;

    const storage = getStorage();
    const storageRef = ref(storage, `profile_pictures/${user.uid}.jpg`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      this.datosEditables.fotoUrl = downloadUrl;
      console.log('Foto subida con éxito:', downloadUrl);
    } catch (error) {
      console.error('Error al subir la foto:', error);
    }
  }

  agregarPatente() { 
    if (this.nuevaPatente && !this.datosEditables.patentes.includes(this.nuevaPatente.toUpperCase())) {
      this.datosEditables.patentes.push(this.nuevaPatente.toUpperCase());
      this.nuevaPatente = '';
    }
  }
  eliminarPatente(index: number) { 
    this.datosEditables.patentes.splice(index, 1);
  }
  cancelar() { 
    this.modalCtrl.dismiss(null, 'cancel'); 
  }
  guardarCambios() { 
    this.modalCtrl.dismiss(this.datosEditables, 'confirm'); 
  }
}