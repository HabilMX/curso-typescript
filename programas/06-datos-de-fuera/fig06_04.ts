// fig06_04.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return {
      ok: false,
      detalle: `${nombre} debe ser un entero positivo`,
    };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return {
      ok: false,
      detalle: `${nombre} está fuera del rango seguro`,
    };
  }

  return { ok: true, valor: numero };
}

const entorno: Record<string, string | undefined> = {
  PUERTO: "8080",
  REVISOR_MAX_SERVICIOS: "muchos",
};

const puerto = leerEnteroPositivo(
  "PUERTO",
  entorno.PUERTO,
  3000,
);
const maximo = leerEnteroPositivo(
  "REVISOR_MAX_SERVICIOS",
  entorno.REVISOR_MAX_SERVICIOS,
  20,
);

console.log(puerto.ok ? `puerto: ${puerto.valor}` : puerto.detalle);
console.log(maximo.ok ? `máximo: ${maximo.valor}` : `máximo inválido: ${maximo.detalle}`);
