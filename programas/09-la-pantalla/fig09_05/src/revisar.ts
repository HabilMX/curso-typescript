// fig09_05/src/revisar.ts
import type { Estado, Servicio } from "./modelo.js";

export type Respuesta = { readonly codigoHttp: number; readonly duracionMs: number };
export type Consultar = (servicio: Servicio, senal: AbortSignal) => Promise<Respuesta>;

// Un error de red puede traer la URL completa, con usuario, clave o token. El detalle
// conserva el mensaje, pero cada URL queda solo con su esquema, servidor y ruta.
function sinUrlCompleta(mensaje: string): string {
  return mensaje.replace(/[a-z][a-z\d+.-]*:\/\/\S+/gi, (texto) => {
    try {
      const url = new URL(texto);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return "<URL>";
    }
  });
}

export async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<readonly Estado[]> {
  return Promise.all(
    servicios.map(async (servicio) => {
      try {
        const respuesta = await consultar(servicio, AbortSignal.timeout(servicio.timeoutMs));

        if (respuesta.codigoHttp >= 200 && respuesta.codigoHttp < 300) {
          return { servicio, tipo: "disponible", ...respuesta };
        }

        return { servicio, tipo: "falla", detalle: `HTTP ${respuesta.codigoHttp}` };
      } catch (error: unknown) {
        return {
          servicio,
          tipo: "falla",
          detalle: error instanceof Error ? sinUrlCompleta(error.message) : "falla desconocida",
        };
      }
    }),
  );
}
