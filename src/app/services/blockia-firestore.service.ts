import { Injectable } from '@angular/core';
import { 
    Firestore, 
    collection, 
    serverTimestamp, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    Timestamp, 
    query, 
    orderBy, 
    where,
    arrayUnion
} from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class BlockiaFirestoreService {
  createUser(uid: string, nuevoPerfil: { id: string; telefono: string | null; creadoEn: Date; nombre: string; patentes: never[]; condominios: never[]; perfilCompleto: boolean; }) {
    throw new Error('Method not implemented.');
  }

    constructor(private firestore: Firestore) { }

    // ==============================
    // 📦 USERS
    // ==============================
    
    async addUser(user: any) {
        const userRef = doc(this.firestore, `users/${user.id}`);
        return await setDoc(userRef, user);
    }

    async registerUserFromAdmin(userData: any) {
        const newUserRef = doc(collection(this.firestore, 'users'));
        const finalUserData = {
            ...userData,
            id: newUserRef.id,
            creadoEn: Timestamp.now(),
            perfilCompleto: true
        };
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
    
    async updateUser(userId: string, data: any) {
        const userRef = doc(this.firestore, 'users', userId);
        await setDoc(userRef, data, { merge: true });
    }

    async deleteUser(userId: string) {
        const userRef = doc(this.firestore, 'users', userId);
        await deleteDoc(userRef);
    }

    async getUserByPhone(phone: string) {
        const usersRef = collection(this.firestore, 'users');
        const q = query(usersRef, where('telefono', '==', phone));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    }


    // ==============================
    // 🏢 CONDOMINIOS
    // ==============================

    async addCondominio(condominio: any) {
        const condominiosRef = collection(this.firestore, 'condominios');
        return await addDoc(condominiosRef, condominio);
    }


    async getCondominioById(condominioId: string) {
        const condominioRef = doc(this.firestore, 'condominios', condominioId);
        const snapshot = await getDoc(condominioRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    }

    async getCondominios() {
    try {
      const condominiosRef = collection(this.firestore, 'condominios');
      const snapshot = await getDocs(condominiosRef);
      
      if (snapshot.empty) {
        console.warn("La colección 'condominios' está vacía o no se pudo leer.");
        return [];
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error al obtener condominios desde Firestore:", error);
      // Este error suele ocurrir por REGLAS DE SEGURIDAD incorrectas.
      // Revisa que un usuario autenticado tenga permiso para leer la colección 'condominios'.
      throw error; // Lanzamos el error para que el componente sepa que algo falló.
    }
  }

    // ==============================
    // 📜 HISTORIAL
    // ==============================
    
    async addHistorialApertura(data: any) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const collectionName = `historial_${year}_${month}`;
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
        const collectionName = `historial_${year}_${month}`;
        
        const historialRef = collection(this.firestore, collectionName);
        const q = query(historialRef, orderBy('hora', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    }

    // ✅ FUNCIÓN ACTUALIZADA PARA MANEJAR MÚLTIPLES CONDOMINIOS
    // Esta función reemplaza la antigua 'getHistorialDelMesPorUsuario'
    async getHistorialDelMesPorCondominios(condominioIds: string[]) {
        if (!condominioIds || condominioIds.length === 0) {
            return []; // Retorna vacío si no hay IDs para evitar errores
        }
        
        // Firestore limita las consultas 'in' a un máximo de 30 elementos en el array.
        if (condominioIds.length > 30) {
            console.warn('Advertencia: La consulta de historial excede el límite de 30 condominios.');
            // Aquí podrías dividir la consulta en varias si fuera necesario.
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const collectionName = `historial_${year}_${month}`;
        
        const historialRef = collection(this.firestore, collectionName);
        
        // Se usa el operador 'in' para buscar registros cuyo 'condominioId' esté en el array.
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
        const nuevaVisita = {
            ...visita,
            creadaEn: Timestamp.now(),
        };
        return await addDoc(visitasRef, nuevaVisita);
    }


    async registrarVisita(data: any) {
        const visitasRef = collection(this.firestore, 'visitas');
        await addDoc(visitasRef, {
            ...data,
            creadoEn: serverTimestamp()
        });
    }

    // ✅ NUEVA FUNCIÓN PARA OBTENER VISITAS DEL DÍA ACTUAL
async getTodaysVisitsByPhone(telefono: string) {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDelDia = new Date(hoy.setHours(23, 59, 59, 999));

    const visitasRef = collection(this.firestore, 'visitas');
    const q = query(
      visitasRef,
      // La magia está aquí: buscamos por 'telefono' en lugar de 'visitanteId'
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
      // --- EL USUARIO YA EXISTE (Puede ser residente o visitante en otro lugar) ---
      const userDoc = querySnap.docs[0];
      const data = userDoc.data() as any;

      const updates: any = {};

      // 1. Verificamos si ya tiene acceso a este condominio.
      const yaTieneAcceso = data.condominios?.some((c: any) => c.id === condominioId);

      // 2. Si NO tiene acceso, se lo agregamos.
      if (!yaTieneAcceso) {
        updates.condominios = arrayUnion({ id: condominioId, rol: 'VISITANTE' });
      }
      
      // 3. Agregamos la nueva patente si no la tiene ya.
      const patentesActuales = Array.isArray(data.patentes) ? data.patentes : (data.patente ? [data.patente] : []);
      if (!patentesActuales.includes(patenteMayusculas)) {
        updates.patentes = arrayUnion(patenteMayusculas);
      }

      // 4. Ejecutamos la actualización solo si hay algo que cambiar.
      if (Object.keys(updates).length > 0) {
        await updateDoc(userDoc.ref, updates);
      }
      
      return userDoc.id; // Devolvemos el ID del usuario existente.

    } else {
      // --- EL USUARIO ES 100% NUEVO ---
      // Se crea un perfil de visitante temporal con un ID aleatorio.
      // La lógica de 'checkAndCreateUserProfile' lo migrará cuando inicie sesión.
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
    // Buscamos por anfitrionId y ordenamos por fecha descendente
    const q = query(
      visitasRef,
      where('anfitrionId', '==', anfitrionId),
      orderBy('fecha', 'desc') // Usamos 'fecha' que ya tenías
    );

    const snapshot = await getDocs(q);
    // Devolvemos los datos incluyendo el ID del documento, útil para cancelar
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ✅ NUEVA FUNCIÓN para eliminar una invitación por su ID
  async deleteInvitacionById(invitacionId: string) {
    const invitacionRef = doc(this.firestore, 'visitas', invitacionId); // Referencia al documento en la colección 'visitas'
    try {
      await deleteDoc(invitacionRef);
      console.log('Invitación eliminada con éxito:', invitacionId);
    } catch (error) {
      console.error('Error al eliminar la invitación:', error);
      throw error; // Propagamos el error para que el componente lo maneje
    }
  }
  
}