import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ IMPORTANTE
import { IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-phone',
  templateUrl: './login-phone.page.html',
  styleUrls: ['./login-phone.page.scss'],
  standalone: true,
  imports: [
    CommonModule, // ✅ agrega esto
    IonContent, IonItem, IonLabel, IonInput, IonButton, FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPhonePage {
  phone = '+569';
  otp = '';
  otpSent = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
  console.log('[LOGIN] ngOnInit: initRecaptcha');
  this.auth.initRecaptcha('recaptcha-container');
  }

async enviarOTP() {
  this.error = '';
  try {
    console.log('[LOGIN] enviarOTP start', { phone: this.phone });
    await this.auth.sendOTP(this.phone);
    console.log('[LOGIN] enviarOTP OK');
    this.otpSent = true;
  } catch (err: any) {
    console.error('[LOGIN] enviarOTP ERROR', {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      raw: err,
    });
    this.error = err?.message || 'Error al enviar OTP';
  }
}

async verificarOTP() {
  this.error = '';
  try {
    console.log('[LOGIN] verificarOTP start', { otp: this.otp });
    await this.auth.verifyOTP(this.otp);
    console.log('[LOGIN] verificarOTP OK → /home');
    this.router.navigate(['/home']);
  } catch (err: any) {
    console.error('[LOGIN] verificarOTP ERROR', {
      code: err?.code,
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      raw: err,
    });
    this.error = err?.message || 'OTP incorrecto';
  }
}

}
