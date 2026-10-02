// fig08_05/src/contrato.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { esReportePublico } from "./contrato.js";

const casos: readonly {
  readonly nombre: string;
  readonly valor: unknown;
  readonly valido: boolean;
}[] = [
  {
    nombre: "un reporte con las dos variantes",
    valor: {
      estados: [
        { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
        { nombre: "pagos", tipo: "falla", detalle: "tiempo límite agotado" },
      ],
    },
    valido: true,
  },
  { nombre: "null", valor: null, valido: false },
  { nombre: "estados no es un arreglo", valor: { estados: "ninguno" }, valido: false },
  {
    nombre: "un estado con un tipo desconocido",
    valor: { estados: [{ nombre: "pagos", tipo: "pendiente" }] },
    valido: false,
  },
  {
    nombre: "codigoHttp llega como texto",
    valor: {
      estados: [{ nombre: "pagos", tipo: "disponible", codigoHttp: "200", duracionMs: 42 }],
    },
    valido: false,
  },
];

for (const caso of casos) {
  test(`esReportePublico: ${caso.nombre}`, () => {
    assert.equal(esReportePublico(caso.valor), caso.valido);
  });
}
