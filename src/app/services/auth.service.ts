// Ruta: src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
// ✅ Importa 'onAuthStateChanged' en lugar de 'authState'
import { Auth, getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User, onAuthStateChanged } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { BlockiaFirestoreService } from './blockia-firestore.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  // ✅ Usamos un BehaviorSubject para controlar el estado del usuario
  private userSubject = new BehaviorSubject<User | null>(null);
  public readonly user$ = this.userSubject.asObservable();
  
  private verifier!: RecaptchaVerifier;
  private confirmationResult: ConfirmationResult | null = null;
// ✅ 1. INICIALIZA LA BANDERA EN 'true'
  public isLoading = true;
constructor(private bf: BlockiaFirestoreService) {
    this.auth = getAuth();
    onAuthStateChanged(this.auth, user => {
      // ✅ 2. ACTUALIZA EL ESTADO DEL USUARIO
      this.userSubject.next(user);
      // ✅ 3. INDICA QUE LA CARGA INICIAL HA TERMINADO
      this.isLoading = false;
    });
  }
  
  initRecaptcha(containerId: string) {
    if (this.verifier) return;
    this.verifier = new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' });
    this.verifier.render().catch(err => console.error('Error renderizando reCAPTCHA:', err));
  }

  async sendOTP(phone: string) {
    this.confirmationResult = await signInWithPhoneNumber(this.auth, phone, this.verifier);
  }

  async verifyOTP(code: string) {
    if (!this.confirmationResult) throw new Error('Debes solicitar un código OTP primero.');
    
    const userCredential = await this.confirmationResult.confirm(code);
    const user = userCredential.user;
    await this.checkAndCreateUserProfile(user);
    return user;
  }

  private async checkAndCreateUserProfile(user: User) {
    const existingUser = await this.bf.getUserById(user.uid);
    if (!existingUser) {
      const newUserProfile = {
        id: user.uid,
        nombre: 'RESIDENTE',
        telefono: user.phoneNumber,
        rol: 'RESIDENTE', // Cambiado a minúsculas para consistencia
        creadoEn: serverTimestamp(),
        perfilCompleto: false
      };
      await this.bf.addUser(newUserProfile);
    }
  }

  get currentUser(): User | null {
    // Obtenemos el valor actual del Subject
    return this.userSubject.getValue();
  }

  get currentUserData() {
    const user = this.currentUser;
    if (!user) return null;
    return {
      uid: user.uid,
      telefono: user.phoneNumber
    };
  }

  async logout() {
    await this.auth.signOut();
  }
}