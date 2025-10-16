// Ruta: src/app/services/interfaces.ts

import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Define la estructura de un perfil de usuario en Firestore.
 */
export interface UserProfile {
  id: string; // Corresponde al UID de Firebase Auth
  nombre: string;
  telefono: string | null;
  rol: 'residente' | 'administrador' | 'guardia';
  condominioId?: string; 
  // Acepta un Timestamp al leer y un FieldValue (de serverTimestamp()) al escribir.
  creadoEn: Timestamp | FieldValue; 
}

/**
 * Define la estructura de un condominio en Firestore.
 */
export interface Condominio {
  id: string; // ID del documento
  nombre: string;
  direccion: string;
  // Puedes agregar más campos aquí si es necesario
}

// Puedes seguir agregando más interfaces para Porton, Visitante, etc.