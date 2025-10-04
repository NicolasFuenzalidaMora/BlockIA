import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MatButtonModule } from '@angular/material/button';
import { SmsService } from '../services/sms.service';
import { FirebaseTestService } from '../services/firebase-test.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage {
  statusMessage = '';
  Message = '';
  calling = false;
  buttonColor = '#ffffff'; // color inicial del botón
  router: any;

  // Número destino
  phone = '+56921850610'; // tu número verificado
  message = 'OPEN';

  constructor(
    private http: HttpClient,
    private firebaseTest: FirebaseTestService
  ) {}

  ngOnInit() {
    this.firebaseTest.testWrite();
    this.firebaseTest.testRead();
  }

  enviarSMS() {
    this.statusMessage = 'Espere un momento...';
    this.Message = 'Apertura iniciada';
    this.calling = true;

    // URL de tu función HTTP en Firebase
    const url = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';

    this.http.post(url, { to: this.phone, message: this.message }).subscribe({
      next: (res: any) => {
        console.log('SMS enviado con éxito', res);

        // Cambiar color del botón a verde por 3 segundos
        this.buttonColor = '#4CAF50';
        setTimeout(() => {
          this.buttonColor = '#ffffff';
        }, 3000);
      },
      error: (err) => {
        console.error('Error al enviar SMS:', err);
        this.statusMessage = 'Error al enviar el SMS';
      },
      complete: () => {
        // Limpiar status después de 15 segundos
        setTimeout(() => {
          this.statusMessage = '';
          this.calling = false;
        }, 15000);
      }
    });
  }

  irAVisitas() {
    this.router.navigate(['/visitas']);
  }
}


  // Opcional: Llamada con SIM800L
  /*
  makeCall() {
    this.statusMessage = '📞 Llamando...';
    this.Message = 'Apertura iniciada';
    this.calling = true;
    this.callNumber.callNumber(this.simnumber, true)
      .then(res => console.log('Llamada realizada con éxito', res))
      .catch(err => console.log('Error al realizar la llamada', err));

    setTimeout(() => {
      this.statusMessage = '';
      this.calling = false;
    }, 15000);
  }
  */

