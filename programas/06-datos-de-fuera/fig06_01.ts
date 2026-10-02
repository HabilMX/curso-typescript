// fig06_01.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const bruto: unknown = JSON.parse(
  '{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":"rápido"}',
);

const supuesto = bruto as Servicio;

console.log(typeof supuesto.timeoutMs);
console.log(supuesto.timeoutMs);
