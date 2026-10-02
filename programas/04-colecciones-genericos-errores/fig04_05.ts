// fig04_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function dividir(dividendo: number, divisor: number): Resultado<number> {
  if (divisor === 0) {
    return { ok: false, detalle: "el divisor no puede ser cero" };
  }

  return { ok: true, valor: dividendo / divisor };
}

function mostrar(resultado: Resultado<number>): string {
  if (resultado.ok) {
    return `resultado: ${resultado.valor}`;
  }

  return `falla: ${resultado.detalle}`;
}

console.log(mostrar(dividir(12, 3)));
console.log(mostrar(dividir(12, 0)));
