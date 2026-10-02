// fig06_02.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, detalle: "nombre debe ser texto no vacío" };
  }

  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  if (
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "timeoutMs debe ser un entero positivo" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

for (const entrada of [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: "1500" },
]) {
  const resultado = leerServicio(entrada);

  if (resultado.ok) {
    console.log(`${resultado.valor.nombre}: ${resultado.valor.timeoutMs} ms`);
  } else {
    console.log(`inválido: ${resultado.detalle}`);
  }
}
