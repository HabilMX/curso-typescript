// fig04_08.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

const servicios: Servicio[] = [];
const nombre = servicios[10].nombre;

console.log(nombre);
