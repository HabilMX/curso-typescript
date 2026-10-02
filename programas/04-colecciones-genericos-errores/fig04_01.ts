// fig04_01.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDe(servicios: readonly Servicio[]): string {
  return servicios.map((servicio) => servicio.nombre).join(", ");
}

const servicios: Servicio[] = [
  {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
];

servicios.push({
  nombre: "inventario",
  url: "https://inventario.example",
  timeoutMs: 2000,
});

console.log(`cantidad: ${servicios.length}`);
console.log(nombresDe(servicios));
