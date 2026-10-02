// fig03_01.ts
type Servicio = {
  nombre: string;
  url: string;
  timeoutMs: number;
};

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre} -> ${servicio.url}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(etiqueta(catalogo));
