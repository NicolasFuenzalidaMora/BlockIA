import { Component } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';
import { MatButtonModule } from '@angular/material/button';

// 👇 Importamos nuestro servicio
import { FirebaseTestService } from '../services/firebase-test.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [CallNumber]
})
export class HomePage {
  simnumber = '+56997089807';//número de teléfono a marcar
  statusMessage = '';
  Message = '';
  calling = false;
  router: any;
  constructor(private callNumber: CallNumber, private firebaseTest: FirebaseTestService) {}

  ngOnInit() {
    // 🔥 Probar escritura y lectura en Firestore
    this.firebaseTest.testWrite();
    this.firebaseTest.testRead();
  }
  

irAVisitas() {
  console.log("Botón clickeado, navegando a visitas...");
  this.router.navigate(['/visitas']);
} 

  makeCall() {
    this.statusMessage = '📞 Llamando...';
    this.Message = 'Apertura iniciada'; // Mostrar mensaje al presionar
    this.calling = true;
    this.callNumber.callNumber(this.simnumber, true)
      .then(res => console.log('La llamada se realizó con éxito', res))
      .catch(err => console.log('Error al realizar la llamada', err));

    // Limpiar el status después de 15 segundos
    setTimeout(() => {
      this.statusMessage = '';
      this.calling = false;
    }, 15000);
  }
}
