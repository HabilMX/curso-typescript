// fig03_02.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function prepararConsulta(servicio: Servicio): string {
  return `${servicio.nombre}: límite de ${servicio.timeoutMs} ms`;
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

for (const servicio of servicios) {
  console.log(prepararConsulta(servicio));
}
