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
    this.auth.initRecaptcha('recaptcha-container');
  }

  async enviarOTP() {
    try {
      await this.auth.sendOTP(this.phone);
      this.otpSent = true;
      this.error = '';
    } catch (err: any) {
      console.error(err);
      this.error = err.message;
    }
  }

  async verificarOTP() {
    try {
      await this.auth.verifyOTP(this.otp);
      this.router.navigate(['/home']);
    } catch (err: any) {
      console.error(err);
      this.error = 'OTP incorrecto';
    }
  }
}
