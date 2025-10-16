import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, updateDoc, deleteDoc, doc, getDoc, setDoc, addDoc, Timestamp, query, orderBy, where } from '@angular/fire/firestore';
@Injectable({
    providedIn: 'root'
})
export class BlockiaFirestoreService {

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
    
    /**
     * ✅ CORREGIDO: Cambiamos updateDoc por setDoc con la opción de merge.
     * Esto asegura que los nuevos campos como 'condominioId' se creen si no existen.
     */
    async updateUser(userId: string, data: any) {
        const userRef = doc(this.firestore, 'users', userId);
        // Usamos setDoc con { merge: true } para actualizar o crear campos de forma segura.
        await setDoc(userRef, data, { merge: true });
    }

    async deleteUser(userId: string) {
        const userRef = doc(this.firestore, 'users', userId);
        await deleteDoc(userRef);
    }

    // ==============================
    // 🏢 CONDOMINIOS
    // ==============================

    async addCondominio(condominio: any) {
        const condominiosRef = collection(this.firestore, 'condominios');
        return await addDoc(condominiosRef, condominio);
    }

    async getCondominios() {
        const condominiosRef = collection(this.firestore, 'condominios');
        const snapshot = await getDocs(condominiosRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getCondominioById(condominioId: string) {
        const condominioRef = doc(this.firestore, 'condominios', condominioId);
        const snapshot = await getDoc(condominioRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
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


    // Esta función se queda por si la necesitas para un admin en el futuro
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

    // ✅ NUEVA FUNCIÓN PARA FILTRAR POR USUARIO
    async getHistorialDelMesPorUsuario(userId: string) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const collectionName = `historial_${year}_${month}`;
        
        const historialRef = collection(this.firestore, collectionName);
        
        // Creamos una consulta que ordena Y FILTRA por el ID del usuario
        const q = query(
            historialRef, 
            where('userId', '==', userId), // ✅ ¡LA MAGIA ESTÁ AQUÍ!
            orderBy('hora', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    }


}
