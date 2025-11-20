// Ruta: src/app/services/auth.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { 
  Auth, getAuth, RecaptchaVerifier, signInWithPhoneNumber, 
  ConfirmationResult, User, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Firestore, doc, onSnapshot, Unsubscribe, serverTimestamp 
} from '@angular/fire/firestore';
import { BlockiaFirestoreService } from './blockia-firestore.service';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  confirmCode(otp: string) {
    throw new Error('Method not implemented.');
  }
  mapError(e: any): string {
    throw new Error('Method not implemented.');
  }
  sendCode(phone: string) {
    throw new Error('Method not implemented.');
  }
  private auth: Auth;

  // === STREAMS PRINCIPALES ===
  private userSubject = new BehaviorSubject<User | null>(null);
  public readonly user$ = this.userSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<any | null>(null);
  public readonly userProfile$ = this.userProfileSubject.asObservable();

  // === CONTROL DE ESTADO ===
  public isLoading = true;
  private verifier!: RecaptchaVerifier;
  private confirmationResult: ConfirmationResult | null = null;
  private profileUnsubscribe: Unsubscribe | null = null;

  // === BANDERA DE SINCRONIZACIÓN AUTH ===
  private authReadySubject = new BehaviorSubject<boolean>(false);
  public readonly authReady$ = this.authReadySubject.asObservable();

  constructor(
    private bf: BlockiaFirestoreService,
    private firestore: Firestore,
    private router: Router   
  ) {
    this.auth = getAuth();

    // Monitoreamos cambios de sesión Firebase
    onAuthStateChanged(this.auth, (user) => {
      console.log('[AuthService] onAuthStateChanged ->', user?.uid || 'NO USER');
      this.userSubject.next(user);

      // Cancelar escucha previa del perfil
      if (this.profileUnsubscribe) {
        console.log('[AuthService] Cancelando escucha de perfil anterior.');
        this.profileUnsubscribe();
        this.profileUnsubscribe = null;
      }

      this.isLoading = true;

      if (user) {
        console.log('[AuthService] Usuario autenticado, escuchando perfil...');
        const userDocRef = doc(this.firestore, `users/${user.uid}`);

        this.profileUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const profile = { id: docSnap.id, ...docSnap.data() };
              console.log('[AuthService] Perfil actualizado desde Firestore:', profile);
              this.userProfileSubject.next(profile);
              localStorage.setItem('userData', JSON.stringify(profile));
              this.isLoading = false;
            } else {
              console.warn('[AuthService] El documento del perfil no existe. Creando...');
              this.checkAndCreateUserProfile(user)
                .then(profile => {
                  this.userProfileSubject.next(profile);
                  localStorage.setItem('userData', JSON.stringify(profile));
                  this.isLoading = false;
                })
                .catch(err => {
                  console.error('[AuthService] Error creando perfil:', err);
                  this.userProfileSubject.next(null);
                  localStorage.removeItem('userData');
                  this.isLoading = false;
                });
            }
          },
          (error) => {
            console.error('[AuthService] Error escuchando perfil:', error);
            this.userProfileSubject.next(null);
            localStorage.removeItem('userData');
            this.isLoading = false;
          }
        );
      } else {
        console.log('[AuthService] No hay usuario, limpiando perfil.');
        this.userProfileSubject.next(null);
        localStorage.removeItem('userData');
        this.isLoading = false;
      }

      // 🔥 Marcamos que Firebase ya respondió (sea null o user)
      this.authReadySubject.next(true);
    });
  }

  // ==============================
  // === CICLO DE VIDA ============
  // ==============================
  ngOnDestroy(): void {
    if (this.profileUnsubscribe) {
      console.log('[AuthService] Destruyendo servicio, cancelando escucha.');
      this.profileUnsubscribe();
    }
  }

  // ==============================
  // === MÉTODOS DE LOGIN =========
  // ==============================
  initRecaptcha(containerId: string) {
    if (this.verifier) return;
    this.verifier = new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' });
    this.verifier.render().catch(err => console.error('Error renderizando reCAPTCHA:', err));
  }

  async sendOTP(phone: string) {
    this.confirmationResult = await signInWithPhoneNumber(this.auth, phone, this.verifier);
  }

  async verifyOTP(code: string) {
    if (!this.confirmationResult)
      throw new Error('Debes solicitar un código OTP primero.');

    const userCredential = await this.confirmationResult.confirm(code);
    const user = userCredential.user;
    const profile = await this.checkAndCreateUserProfile(user);

    // Actualiza inmediatamente
    this.userProfileSubject.next(profile);
    localStorage.setItem('userData', JSON.stringify(profile));

    return user;
  }

  // ==============================
  // === GETTERS ==================
  // ==============================
  get currentUser(): User | null {
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

  get currentProfile(): any | null {
    return this.userProfileSubject.getValue();
  }

  // ==============================
  // === PERFIL ===================
  // ==============================
  private async checkAndCreateUserProfile(user: User) {
    // Busca por UID
    const existingById = await this.bf.getUserById(user.uid);
    if (existingById) {
      console.log('[AuthService] Perfil ya existe con UID correcto.');
      return existingById;
    }

    // Busca por teléfono (migración visitante)
    const existingByPhone = await this.bf.getUserByPhone(user.phoneNumber!);
    if (existingByPhone) {
      console.log('[AuthService] Migrando perfil visitante -> UID de Auth...');
      const oldVisitorId = existingByPhone.id;
      const existingData = existingByPhone as any;

      const finalProfile: any = {
        id: user.uid,
        nombre: existingData.nombre,
        telefono: existingData.telefono,
        patentes: Array.isArray(existingData.patentes)
          ? existingData.patentes
          : (existingData.patente ? [existingData.patente.toUpperCase()] : []),
        condominios: Array.isArray(existingData.condominios)
          ? existingData.condominios
          : (existingData.condominioId ? [{ id: existingData.condominioId, rol: 'VISITANTE' }] : []),
        perfilCompleto: existingData.perfilCompleto,
        creadoEn: existingData.creadoEn,
        rol: existingData.tipo || 'RESIDENTE'
      };

      await this.bf.addUser(finalProfile);
      await this.bf.updateVisitsWithNewId(oldVisitorId, user.uid);
      await this.bf.deleteUser(oldVisitorId);

      return finalProfile;
    }

    // Si no existe -> crea perfil nuevo
    console.log('[AuthService] Creando perfil nuevo de RESIDENTE.');
    const newUserProfile = {
      id: user.uid,
      nombre: 'RESIDENTE',
      telefono: user.phoneNumber,
      creadoEn: serverTimestamp(),
      perfilCompleto: false
    };
    await this.bf.addUser(newUserProfile);
    return newUserProfile;
  }

  async forceProfileRefresh() {
    const user = this.userSubject.getValue();
    if (user) {
      console.log('[AuthService] Forzando recarga de perfil...');
      try {
        const profile = await this.bf.getUserById(user.uid);
        this.userProfileSubject.next(profile);
        localStorage.setItem('userData', JSON.stringify(profile));
        console.log('[AuthService] Perfil recargado manualmente.');
      } catch (error) {
        console.error('[AuthService] Error recargando perfil:', error);
      }
    }
  }

  // ==============================
  // === LOGOUT ===================
  // ==============================
async logout() {
  try {
    console.log('[AuthService] Logout solicitado');
    await this.auth.signOut(); // onAuthStateChanged limpia subjects
    // NO navegamos aquí, la navegación será GLOBAL en AppComponent
  } catch (e) {
    console.error('[AuthService] Error en logout:', e);
  }
}
}