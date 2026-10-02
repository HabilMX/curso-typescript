// fig09_05/src/panel/cargar.test.ts
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { cerrar, escuchar, puertoDe } from "../servidor.js";
import { cargarReporte } from "./cargar.js";

async function servirRespuesta(
  codigo: number,
  cuerpo: string,
): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((_solicitud, respuesta) => {
    respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(cuerpo);
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

const casos = [
  {
    nombre: "devuelve el reporte cuando la API responde con el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos","tipo":"falla","detalle":"HTTP 503"}]}',
    esperado: undefined,
  },
  {
    nombre: "rechaza un código HTTP que no es 2xx",
    codigo: 503,
    cuerpo: '{"detalle":"error interno"}',
    esperado: "la API respondió 503",
  },
  {
    nombre: "rechaza un JSON que no cumple el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos"}]}',
    esperado: "la API no entregó un reporte válido",
  },
] as const;

for (const caso of casos) {
  test(`cargarReporte: ${caso.nombre}`, async () => {
    const { servidor, base } = await servirRespuesta(caso.codigo, caso.cuerpo);

    try {
      const senal = new AbortController().signal;

      if (caso.esperado === undefined) {
        const reporte = await cargarReporte(senal, base);
        assert.equal(reporte.estados[0]?.nombre, "pagos");
      } else {
        await assert.rejects(cargarReporte(senal, base), { message: caso.esperado });
      }
    } finally {
      await cerrar(servidor);
    }
  });
}
