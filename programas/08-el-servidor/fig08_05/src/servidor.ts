// fig08_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";

export type ObtenerReporte = () => Promise<ReportePublico>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly registrar: Bitacora;
}

type Ruta =
  { readonly tipo: "salud" } | { readonly tipo: "estados" } | { readonly tipo: "no-encontrada" };

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
}

async function atender(
  solicitud: IncomingMessage,
  respuesta: ServerResponse,
  opciones: OpcionesServidor,
): Promise<void> {
  const inicio = performance.now();

  respuesta.once("finish", () => {
    const duracion = Math.round(performance.now() - inicio);

    opciones.registrar({
      evento: "solicitud",
      detalle: `${solicitud.method ?? "?"} ${rutaDe(solicitud.url)} ${respuesta.statusCode} ${duracion} ms`,
    });
  });

  if (solicitud.method !== "GET") {
    respuesta.setHeader("allow", "GET");
    enviarJson(respuesta, 405, { detalle: "método no permitido" });
    return;
  }

  const ruta = reconocerRuta(solicitud.url);

  switch (ruta.tipo) {
    case "salud":
      respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      respuesta.end("ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        opciones.registrar({
          evento: "error",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        });
        enviarJson(respuesta, 500, { detalle: "error interno" });
      }
      return;
    case "no-encontrada":
      enviarJson(respuesta, 404, { detalle: "ruta no encontrada" });
      return;
    default: {
      const sinAtender: never = ruta;
      throw new Error(`ruta sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function crearServidor(opciones: OpcionesServidor): Server {
  return createServer((solicitud, respuesta) => {
    atender(solicitud, respuesta, opciones).catch((error: unknown) => {
      opciones.registrar({
        evento: "error",
        detalle: error instanceof Error ? error.message : "falla desconocida",
      });

      if (respuesta.headersSent) {
        respuesta.end();
      } else {
        enviarJson(respuesta, 500, { detalle: "error interno" });
      }
    });
  });
}

export function escuchar(servidor: Server, puerto: number): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(puerto, "127.0.0.1", () => {
      servidor.off("error", reject);
      resolve();
    });
  });
}

export function cerrar(servidor: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

export function puertoDe(servidor: Server): number {
  const direccion = servidor.address();

  if (direccion === null || typeof direccion === "string") {
    throw new Error("el servidor no escucha en un puerto TCP");
  }

  return direccion.port;
}
