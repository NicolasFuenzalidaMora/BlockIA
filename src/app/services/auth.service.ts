// Ruta: src/app/services/auth.service.ts
import { Injectable, OnDestroy } from '@angular/core'; // ✅ Importa OnDestroy
import { Auth, getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User, onAuthStateChanged } from 'firebase/auth';
// ✅ Importa onSnapshot, doc y Unsubscribe
import { Firestore, doc, onSnapshot, Unsubscribe, serverTimestamp } from '@angular/fire/firestore';
import { BlockiaFirestoreService } from './blockia-firestore.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy { // ✅ Implementa OnDestroy
  private auth: Auth;
  private userSubject = new BehaviorSubject<User | null>(null);
  public readonly user$ = this.userSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<any | null>(null);
  public readonly userProfile$ = this.userProfileSubject.asObservable();

  public isLoading = true;
  private verifier!: RecaptchaVerifier;
  private confirmationResult: ConfirmationResult | null = null;

  // ✅ Para guardar la función que cancela la escucha
  private profileUnsubscribe: Unsubscribe | null = null;

  constructor(
      private bf: BlockiaFirestoreService,
      private firestore: Firestore // ✅ Inyecta Firestore directamente
    ) {
    this.auth = getAuth();
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);

      // Cancelamos cualquier escucha anterior al cambiar el usuario
      if (this.profileUnsubscribe) {
        console.log('[AuthService] Cancelando escucha de perfil anterior.');
        this.profileUnsubscribe();
        this.profileUnsubscribe = null;
      }
      // Reiniciamos isLoading a true mientras esperamos el perfil
      this.isLoading = true;

      if (user) {
        console.log('[AuthService] Usuario autenticado, iniciando escucha de perfil...');
        // ✅ INICIAMOS LA ESCUCHA EN TIEMPO REAL
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        this.profileUnsubscribe = onSnapshot(userDocRef,
          (docSnap) => { // Función que se ejecuta cada vez que el documento cambia
            if (docSnap.exists()) {
              const profile = { id: docSnap.id, ...docSnap.data() };
              console.log('[AuthService] Perfil actualizado desde Firestore:', profile);
              this.userProfileSubject.next(profile);
              localStorage.setItem('userData', JSON.stringify(profile));
            } else {
              console.warn('[AuthService] El documento del perfil del usuario no existe. Forzando creación...');
              this.checkAndCreateUserProfile(user).then(profile => {
                  this.userProfileSubject.next(profile);
                  localStorage.setItem('userData', JSON.stringify(profile));
                  this.isLoading = false;
              }).catch(err => {
                  console.error('[AuthService] Error forzando creación/migración de perfil:', err);
                  this.userProfileSubject.next(null);
                  localStorage.removeItem('userData');
                  this.isLoading = false;
              });
              return;
            }
            this.isLoading = false;
          },
          (error) => { // Función que se ejecuta si hay un error en la escucha
            console.error('[AuthService] Error escuchando cambios del perfil:', error);
            this.userProfileSubject.next(null);
            localStorage.removeItem('userData');
            this.isLoading = false;
          }
        );
      } else {
        // No hay usuario, limpiamos todo
        console.log('[AuthService] Usuario no autenticado, limpiando perfil.');
        this.userProfileSubject.next(null);
        localStorage.removeItem('userData');
        this.isLoading = false;
      }
    });
  }

  // ✅ BUENA PRÁCTICA: Aseguramos cancelar la escucha si el servicio se destruye
  ngOnDestroy(): void {
    if (this.profileUnsubscribe) {
       console.log('[AuthService] Destruyendo servicio, cancelando escucha de perfil.');
       this.profileUnsubscribe();
    }
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
    const profile = await this.checkAndCreateUserProfile(user);

    // Actualiza el estado inmediatamente (importante para el guard)
    // Aunque onSnapshot también lo hará, esto asegura que esté listo ANTES de navegar
    this.userProfileSubject.next(profile);
    localStorage.setItem('userData', JSON.stringify(profile));

    return user;
  }

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

  // ✅ FUNCIÓN CORREGIDA Y FINAL (incluye migración robusta y creación limpia)
private async checkAndCreateUserProfile(user: User) {
    // Busca primero por UID
    const existingById = await this.bf.getUserById(user.uid);
    if (existingById) {
      console.log('[AuthService] Perfil ya existe con el UID correcto.');
      return existingById;
    }

    // Si no, busca por teléfono (para migrar visitante)
    const existingByPhone = await this.bf.getUserByPhone(user.phoneNumber!);
    if (existingByPhone) {
      console.log('[AuthService] Perfil de visitante encontrado por teléfono. Migrando a UID de Auth...');

      // Guardamos el ID antiguo para borrar el documento viejo
      const oldVisitorId = existingByPhone.id;

      // ✅ CORRECCIÓN: Usamos 'as any' para decirle a TypeScript que confíe en las propiedades
      const existingData = existingByPhone as any; 

      // Construimos el perfil final explícitamente, asegurando compatibilidad
      const finalProfile: any = {
        id: user.uid, // El nuevo y definitivo ID
        nombre: existingData.nombre,
        telefono: existingData.telefono,
        // Aseguramos que 'patentes' sea un array (compatible con datos viejos)
        patentes: Array.isArray(existingData.patentes) ? existingData.patentes : (existingData.patente ? [existingData.patente.toUpperCase()] : []), // Convertir a mayúsculas si viene de string
        // Aseguramos que 'condominios' sea un array (compatible con datos viejos)
        condominios: Array.isArray(existingData.condominios) ? existingData.condominios : (existingData.condominioId ? [{ id: existingData.condominioId, rol: 'VISITANTE' }] : []), // Asumimos rol VISITANTE si viene del formato viejo
        perfilCompleto: existingData.perfilCompleto,
        creadoEn: existingData.creadoEn, // Conservamos la fecha de creación original
        rol: existingData.tipo || 'RESIDENTE' // Conservamos el tipo si existe, o asumimos VISITANTE
      };

      await this.bf.addUser(finalProfile); // Crea el nuevo doc con el UID correcto
      await this.bf.updateVisitsWithNewId(oldVisitorId, user.uid); // Actualiza visitas
      await this.bf.deleteUser(oldVisitorId); // Borra el doc viejo

      return finalProfile;
    }

    // Si no existe de ninguna forma, es un residente nuevo
    console.log('[AuthService] No se encontró perfil. Creando nuevo perfil de RESIDENTE (incompleto).');
    const newUserProfile = {
      id: user.uid,
      nombre: 'RESIDENTE', // Nombre temporal
      telefono: user.phoneNumber,
      // No añadimos 'rol' ni 'condominios' aquí
      creadoEn: serverTimestamp(),
      perfilCompleto: false // Irá a completar perfil
    };
    await this.bf.addUser(newUserProfile);
    return newUserProfile;
  }

  public async forceProfileRefresh() {
    const user = this.userSubject.getValue();
    if (user) {
      console.log('[AuthService] Forzando recarga manual de perfil...');
      try {
          // Usamos onSnapshot para mantener la consistencia, pero forzamos una lectura inmediata
          // leyendo directamente y actualizando el subject. La escucha seguirá activa.
          const profile = await this.bf.getUserById(user.uid);
          this.userProfileSubject.next(profile); // Actualiza el stream
          localStorage.setItem('userData', JSON.stringify(profile)); // Actualiza localStorage
          console.log('[AuthService] Perfil recargado manualmente.');
      } catch (error) {
          console.error('[AuthService] Error forzando recarga de perfil:', error);
      }
    }
  }

  async logout() {
    // onAuthStateChanged se encargará de limpiar el perfil y cancelar la escucha
    await this.auth.signOut();
  }
}