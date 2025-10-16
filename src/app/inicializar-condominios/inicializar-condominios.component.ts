import { Component } from '@angular/core';
import { BlockiaFirestoreService } from '../services/blockia-firestore.service';
import { doc, setDoc } from '@angular/fire/firestore';
import { getFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-inicializar-condominios',
  template: `<ion-button (click)="crearCondominios()">Crear condominios</ion-button>`
})
export class InicializarCondominiosComponent {

  constructor(private bf: BlockiaFirestoreService) { }

  async crearCondominios() {
    const db = getFirestore(); // Firestore inicializado desde appConfig

    const condominios = [
      { id: '1', nombre: 'El Sol' },
      { id: '2', nombre: 'Las Americas' }
    ];

    try {
      for (const c of condominios) {
        // Usamos setDoc con ID fijo
        await setDoc(doc(db, 'condominios', c.id), { nombre: c.nombre });
        console.log(`Condominio creado: ${c.nombre} con ID ${c.id}`);
      }
      alert('Condominios creados ✅');
    } catch (err) {
      console.error(err);
      alert('Error al crear condominios');
    }
  }
}
