// fig08_05/src/configuracion.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { leerPuerto } from "./configuracion.js";

const casos: readonly {
  readonly nombre: string;
  readonly entrada: string | undefined;
  readonly esperado: ReturnType<typeof leerPuerto>;
}[] = [
  { nombre: "sin variable usa 3000", entrada: undefined, esperado: { ok: true, valor: 3000 } },
  { nombre: "un puerto válido", entrada: "8080", esperado: { ok: true, valor: 8080 } },
  { nombre: "65535 es el límite", entrada: "65535", esperado: { ok: true, valor: 65535 } },
  {
    nombre: "65536 se pasa del límite",
    entrada: "65536",
    esperado: { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" },
  },
  {
    nombre: "0 no es un puerto",
    entrada: "0",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "un decimal se rechaza",
    entrada: "12.5",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "texto se rechaza",
    entrada: "hola",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "la cadena vacía se rechaza",
    entrada: "",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
];

for (const caso of casos) {
  test(`leerPuerto: ${caso.nombre}`, () => {
    assert.deepEqual(leerPuerto(caso.entrada), caso.esperado);
  });
}
