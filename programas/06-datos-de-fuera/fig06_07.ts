// fig06_07.ts
type Esquema<T> = { ejemplo: T };

type Salida<E> = E extends Esquema<infer T> ? T : never;

type ValoresDe<T extends Record<string, Esquema<unknown>>> = {
  [K in keyof T]: Salida<T[K]>;
};

const texto: Esquema<string> = { ejemplo: "catálogo" };
const entero: Esquema<number> = { ejemplo: 1500 };

const campos = { nombre: texto, timeoutMs: entero };

type ServicioDerivado = ValoresDe<typeof campos>;

const servicio: ServicioDerivado = {
  nombre: "catálogo",
  timeoutMs: 1500,
};

console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
