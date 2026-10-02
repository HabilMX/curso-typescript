// fig07_02/src/main.ts
import assert from "node:assert/strict";
import { lineaReporte, type Estado } from "./reporte.js";

const servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

const casos: readonly {
  readonly nombre: string;
  readonly entrada: Estado;
  readonly esperada: string;
}[] = [
  {
    nombre: "disponible conserva código y duración",
    entrada: {
      servicio,
      tipo: "disponible",
      codigoHttp: 204,
      duracionMs: 18,
    },
    esperada: "catálogo: HTTP 204 en 18 ms",
  },
  {
    nombre: "falla conserva detalle",
    entrada: {
      servicio,
      tipo: "falla",
      detalle: "conexión rechazada",
    },
    esperada: "catálogo: falla (conexión rechazada)",
  },
];

for (const caso of casos) {
  assert.equal(lineaReporte(caso.entrada), caso.esperada);
  console.log(`ok - ${caso.nombre}`);
}
