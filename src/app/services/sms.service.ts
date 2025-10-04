import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SmsService {

  // URL de tu función deployada en Firebase
  private firebaseFunctionUrl = 'https://sendsms-cthik5g4da-uc.a.run.app/sendSms';

  constructor(private http: HttpClient) { }

  sendSms(to: string, message: string): Promise<void> {
    return this.http.post(this.firebaseFunctionUrl, { to, message })
      .toPromise()
      .then(() => {
        console.log('SMS enviado con éxito');
      })
      .catch(err => {
        console.error('Error al enviar SMS:', err);
        throw err;
      });
  }
}
