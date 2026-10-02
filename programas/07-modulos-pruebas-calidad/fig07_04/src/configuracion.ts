// fig07_04/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "cada servicio debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (
    typeof nombre !== "string" ||
    nombre.trim() === "" ||
    typeof url !== "string" ||
    url.trim() === "" ||
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "servicio incompleto o inválido" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

export function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return { ok: false, detalle: `servicio ${indice + 1}: ${resultado.detalle}` };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}
