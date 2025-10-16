import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'localDate',
  standalone: true,
})
export class LocalDatePipe implements PipeTransform {

  transform(value: Date | string | number, format: 'full' | 'short' = 'full'): string {
    if (!value) return '';

    const date = new Date(value);

    // Si el formato es 'short' (solo la hora), no hacemos nada especial.
    if (format === 'short') {
      return new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' }).format(date);
    }
    
    // Opciones para la fecha completa.
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    const formattedDate = new Intl.DateTimeFormat('es-CL', options).format(date);

    // ✅ LA SOLUCIÓN: Ponemos la primera letra en mayúscula y la unimos con el resto.
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }
}