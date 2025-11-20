// Ruta: src/app/services/blockia-firestore.service.ts

import { Injectable } from '@angular/core';
import { 
  Firestore, collection, serverTimestamp, getDocs, updateDoc, 
  deleteDoc, doc, getDoc, setDoc, addDoc, Timestamp, query, 
  orderBy, where, arrayUnion, deleteField 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class BlockiaFirestoreService {

  constructor(private firestore: Firestore) { }

  // ==============================
  // 📦 USERS
  // ==============================
  createUser(uid: string, nuevoPerfil: any) {
    throw new Error('createUser Method not implemented.');
  }

  async addUser(user: any) {
    const userRef = doc(this.firestore, `users/${user.id}`);
    return await setDoc(userRef, user, { merge: true }); 
  }

  async updateUser(userId: string, data: any) {
    if (!userId) throw new Error('Se necesita ID de usuario para actualizar.');
    const userRef = doc(this.firestore, 'users', userId);
    await updateDoc(userRef, data); 
  }

  async registerUserFromAdmin(userData: any) {
    const newUserRef = doc(collection(this.firestore, 'users'));
    const finalUserData = {
      ...userData, 
      id: newUserRef.id,
      creadoEn: Timestamp.now(),
      perfilCompleto: true
    };
    delete finalUserData.condominioId;
    delete finalUserData.patente;

    return await setDoc(newUserRef, finalUserData);
  }

  async getUsers() {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getUserById(userId: string) {
    const userRef = doc(this.firestore, 'users', userId);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  async deleteUser(userId: string) {
    const userRef = doc(this.firestore, 'users', userId);
    await deleteDoc(userRef);
  }

  async getUserByPhone(phone: string) {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('telefono', '==', phone));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  // ==============================
  // 🏢 CONDOMINIOS
  // ==============================
  async addCondominio(condominio: any) {
    const condominiosRef = collection(this.firestore, 'condominios');
    const dataToSave = {
      nombre: condominio.nombre,
      direccion: condominio.direccion
    };
    return await addDoc(condominiosRef, dataToSave);
  }

  async getCondominioById(condominioId: string) {
    const condominioRef = doc(this.firestore, 'condominios', condominioId);
    const snapshot = await getDoc(condominioRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as any : null; 
  }

  async getCondominios() {
    try {
      const condominiosRef = collection(this.firestore, 'condominios');
      const snapshot = await getDocs(condominiosRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error al obtener condominios desde Firestore:", error);
      throw error;
    }
  }

  // ==============================
  // 📜 HISTORIAL
  // ==============================
  async addHistorialApertura(data: any) {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const collectionName = `historial_2025_10`;
    const historialRef = collection(this.firestore, collectionName);
    const registro = {
      ...data,
      hora: Timestamp.now(),
      evento: 'apertura_porton'
    };
    return addDoc(historialRef, registro);
  }

  async getHistorialDelMes() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const collectionName = `historial_2025_10`;
    const historialRef = collection(this.firestore, collectionName);
    const q = query(historialRef, orderBy('hora', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  async getHistorialDelMesPorCondominios(condominioIds: string[]) {
    if (!condominioIds || condominioIds.length === 0) return [];
    if (condominioIds.length > 30) console.warn('Consulta supera límite de 30 condominios.');

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const collectionName = `historial_2025_10`;
    const historialRef = collection(this.firestore, collectionName);

    const q = query(
      historialRef, 
      where('condominioId', 'in', condominioIds),
      orderBy('hora', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  // ==============================
  // 🚪 VISITAS
  // ==============================
  async addVisita(visita: any) {
    const visitasRef = collection(this.firestore, 'visitas');
    const nuevaVisita = { ...visita, creadaEn: Timestamp.now() };
    return await addDoc(visitasRef, nuevaVisita);
  }

  async registrarVisita(data: any) {
    const visitasRef = collection(this.firestore, 'visitas');
    await addDoc(visitasRef, { ...data, creadoEn: serverTimestamp() });
  }

  async getTodaysVisitsByPhone(telefono: string) {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDelDia = new Date(hoy.setHours(23, 59, 59, 999));
    const visitasRef = collection(this.firestore, 'visitas');
    const q = query(
      visitasRef,
      where('telefono', '==', telefono),
      where('fecha', '>=', inicioDelDia),
      where('fecha', '<=', finDelDia)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }

  async findOrCreateVisitante(nombre: string, telefono: string, patente: string, condominioId: string) {
    const usuariosRef = collection(this.firestore, 'users');
    const q = query(usuariosRef, where('telefono', '==', telefono));
    const querySnap = await getDocs(q);
    const patenteMayusculas = patente.toUpperCase();

    if (!querySnap.empty) {
      const userDoc = querySnap.docs[0];
      const data = userDoc.data() as any;
      const updates: any = {};

      const yaTieneAcceso = data.condominios?.some((c: any) => c.id === condominioId);
      if (!yaTieneAcceso) updates.condominios = arrayUnion({ id: condominioId, rol: 'VISITANTE' });

      const patentesActuales = Array.isArray(data.patentes) ? data.patentes : (data.patente ? [data.patente] : []);
      if (!patentesActuales.includes(patenteMayusculas)) updates.patentes = arrayUnion(patenteMayusculas);

      if (Object.keys(updates).length > 0) await updateDoc(userDoc.ref, updates);
      return userDoc.id;
    } else {
      const newDoc = await addDoc(usuariosRef, {
        nombre,
        telefono,
        rol: 'RESIDENTE',
        patentes: [patenteMayusculas], 
        condominios: [{ id: condominioId, rol: 'VISITANTE' }],
        creadoEn: serverTimestamp(),
        perfilCompleto: true
      });
      return newDoc.id;
    }
  }

  async updateVisitsWithNewId(oldId: string, newId: string) {
    const visitasRef = collection(this.firestore, 'visitas');
    const q = query(visitasRef, where('visitanteId', '==', oldId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const updatePromises = snapshot.docs.map(doc => updateDoc(doc.ref, { visitanteId: newId }));
    await Promise.all(updatePromises);
    console.log(`${snapshot.size} visitas actualizadas al nuevo ID.`);
  }

  async getInvitacionesEnviadasPorUsuario(anfitrionId: string) {
    const visitasRef = collection(this.firestore, 'visitas');
    const q = query(visitasRef, where('anfitrionId', '==', anfitrionId), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async deleteInvitacionById(invitacionId: string) {
    const invitacionRef = doc(this.firestore, 'visitas', invitacionId);
    await deleteDoc(invitacionRef);
  }

  // ==============================
  // 🔔 SOLICITUDES DE ACCESO
  // ==============================
  async crearSolicitudDeAcceso(solicitudData: any) {
    const solicitud = {
      userId: solicitudData.userId,
      nombreUsuario: solicitudData.nombreUsuario,
      telefonoUsuario: solicitudData.telefonoUsuario,
      patentes: solicitudData.patentes || [],
      condominioId: solicitudData.condominioId,
      departamento: solicitudData.departamento,
      estado: 'pendiente',
      creadoEn: Timestamp.now()
    };
    const solicitudesRef = collection(this.firestore, 'solicitudes');
    return await addDoc(solicitudesRef, solicitud);
  }

  async getSolicitudesPendientes(condominioIds: string[]): Promise<any[]> {
    if (!condominioIds || condominioIds.length === 0) return [];
    const solicitudesRef = collection(this.firestore, 'solicitudes');
    const q = query(solicitudesRef, where('condominioId', 'in', condominioIds), where('estado', '==', 'pendiente'), orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getAllSolicitudesPendientes(): Promise<any[]> {
    const solicitudesRef = collection(this.firestore, 'solicitudes');
    const q = query(solicitudesRef, where('estado', '==', 'pendiente'), orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async aprobarSolicitud(solicitud: any) {
    if (!solicitud?.id || !solicitud?.userId || !solicitud?.condominioId) throw new Error('Datos de solicitud incompletos.');
    const nuevoCondominio = { id: solicitud.condominioId, rol: 'RESIDENTE' };
    const userRef = doc(this.firestore, 'users', solicitud.userId);
    await updateDoc(userRef, { condominios: arrayUnion(nuevoCondominio), departamento: solicitud.departamento });
    const solicitudRef = doc(this.firestore, 'solicitudes', solicitud.id);
    await updateDoc(solicitudRef, { estado: 'aprobado', aprobadoEn: Timestamp.now() });
  }

  async rechazarSolicitud(solicitudId: string) {
    if (!solicitudId) throw new Error('ID de solicitud no proporcionado.');
    const solicitudRef = doc(this.firestore, 'solicitudes', solicitudId);
    await updateDoc(solicitudRef, { estado: 'rechazado', rechazadoEn: Timestamp.now() });
  }

  // ==============================
  // 👤 ACTUALIZAR ROL EN CONDOMINIO
  // ==============================
  async updateUserCondominioRol(userId: string, condominioId: string, nuevoRol: string) {
    if (!userId || !condominioId || !nuevoRol) throw new Error('Faltan datos para actualizar el rol del condominio.');
    const userRef = doc(this.firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('Usuario no encontrado.');

    const userData = userSnap.data();
    let condominiosArray = userData['condominios'] || [];
    const indexToUpdate = condominiosArray.findIndex((condo: any) => condo.id === condominioId);
    if (indexToUpdate === -1) throw new Error(`El usuario no pertenece al condominio especificado.`);
    condominiosArray[indexToUpdate].rol = nuevoRol;

    await updateDoc(userRef, { condominios: condominiosArray });
    console.log(`Rol actualizado para usuario ${userId} en condominio ${condominioId} a ${nuevoRol}`);
  }


  async addUserToCondominio(userId: string, condominioId: string, nuevoRol: string) {
    if (!userId || !condominioId || !nuevoRol) {
      throw new Error('Faltan datos para agregar el condominio al usuario.');
    }

    const userRef = doc(this.firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado.');
    }

    const userData = userSnap.data() as any;
    const condominiosActuales: any[] = Array.isArray(userData.condominios) ? userData.condominios : [];

    const yaTiene = condominiosActuales.some(c => c.id === condominioId);
    if (yaTiene) {
      throw new Error('El usuario ya pertenece a este condominio.');
    }

    // Guardamos rol en MAYÚSCULAS para mantener consistencia
    const rolParaGuardar = nuevoRol.toUpperCase();

    await updateDoc(userRef, {
      condominios: arrayUnion({ id: condominioId, rol: rolParaGuardar })
    });

    console.log(`Condominio ${condominioId} agregado al usuario ${userId} con rol ${rolParaGuardar}`);
  }


}
