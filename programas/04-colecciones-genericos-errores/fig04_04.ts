// fig04_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type ServicioPublico = Omit<Servicio, "url">;
type CambioTimeout = Pick<Servicio, "timeoutMs">;
type ServiciosPorNombre = Record<string, ServicioPublico>;

const cambio: CambioTimeout = { timeoutMs: 2500 };
const visibles: ServiciosPorNombre = {
  catálogo: { nombre: "catálogo", timeoutMs: cambio.timeoutMs },
  pagos: { nombre: "pagos", timeoutMs: 3000 },
};

console.log(visibles.catálogo.nombre);
console.log(visibles.pagos.timeoutMs);
