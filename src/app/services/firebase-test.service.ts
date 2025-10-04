import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseTestService {

  constructor(private firestore: Firestore) {}

  // Método para ESCRIBIR en la colección 'testCollection'
  async testWrite() {
    try {
      const ref = collection(this.firestore, 'testCollection'); // 👈 usamos tu colección
      const docRef = await addDoc(ref, { 
        mensaje: 'Escritura exitosa desde la app 🚀',
        fecha: new Date().toISOString()
      });
      console.log('✅ Documento escrito en Firestore con ID:', docRef.id);
    } catch (e) {
      console.error('❌ Error escribiendo en Firestore:', e);
    }
  }

  // Método para LEER de la colección 'testCollection'
  async testRead() {
    try {
      const ref = collection(this.firestore, 'testCollection'); // 👈 leemos de la misma colección
      const snapshot = await getDocs(ref);
      
      if (snapshot.empty) {
        console.log('⚠️ No hay documentos en testCollection.');
        return;
      }

      snapshot.forEach(doc => {
        console.log('📄 Documento leído:', doc.id, '=>', doc.data());
      });
    } catch (e) {
      console.error('❌ Error leyendo de Firestore:', e);
    }
  }
}
