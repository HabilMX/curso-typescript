// fig03_09.ts
interface ConNombre {
  nombre: string;
}

interface Servicio extends ConNombre {
  readonly url: string;
  readonly timeoutMs: number;
}

function encabezado(servicio: ConNombre): string {
  return `Servicio: ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(encabezado(catalogo));
