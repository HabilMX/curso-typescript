// fig03_07.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function destinoDe(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url} (${servicio.timeoutMs} ms)`;
}

const pagos: Servicio = {
  nombre: "pagos",
  url: "https://pagos.example",
  timeoutMs: 3000,
};

console.log(destinoDe(pagos));
