// fig09_05/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { Estado } from "./modelo.js";
import { aReportePublico, lineaReporte } from "./reporte.js";

const servicio = { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 };

test("disponible conserva código y duración", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "disponible", codigoHttp: 204, duracionMs: 18 }),
    "catálogo: HTTP 204 en 18 ms",
  );
});

test("falla conserva detalle", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "falla", detalle: "conexión rechazada" }),
    "catálogo: falla (conexión rechazada)",
  );
});

test("el reporte público no publica la URL ni el tiempo límite", () => {
  const estados: readonly Estado[] = [
    { servicio, tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { servicio, tipo: "falla", detalle: "tiempo límite agotado" },
  ];

  assert.deepEqual(aReportePublico(estados), {
    estados: [
      { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
      { nombre: "catálogo", tipo: "falla", detalle: "tiempo límite agotado" },
    ],
  });
});
