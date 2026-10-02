// fig08_03.ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return { ok: false, detalle: `${nombre} debe ser un entero positivo` };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return { ok: false, detalle: `${nombre} está fuera del rango seguro` };
  }

  return { ok: true, valor: numero };
}

function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}

const entradas: readonly (string | undefined)[] = [undefined, "8080", "65536", "0", "hola"];

for (const entrada of entradas) {
  const resultado = leerPuerto(entrada);
  const texto = resultado.ok ? `puerto ${resultado.valor}` : `rechazado: ${resultado.detalle}`;
  console.log(`PUERTO=${entrada} -> ${texto}`);
}
