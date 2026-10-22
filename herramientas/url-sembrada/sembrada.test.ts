// sembrada.test.ts — no es de ninguna lección. verificar-url-sembrada.sh lo copia en
// src/ de cada revisor (lecciones 7 a 9) y lo corre con el runner de Node.
//
// La URL sembrada trae usuario, clave, un token en el query string y un fragmento.
// Nada de eso puede salir en un error ni en un reporte.
import assert from "node:assert/strict";
import test from "node:test";
import { leerServicios } from "./configuracion.js";
import { revisarTodos, type Consultar } from "./revisar.js";

const CON_CLAVE = "http://usuario:clave@127.0.0.1:1/estado?token=SECRETO#x";
const SECRETOS = ["usuario:clave", "SECRETO", "token=", "#x"];

function noRepiteSecretos(texto: string): void {
  for (const secreto of SECRETOS) {
    assert.ok(!texto.includes(secreto), `repite «${secreto}»: ${texto}`);
  }
}

const consultarConFetch: Consultar = async (servicio, senal) => {
  const respuesta = await fetch(servicio.url, { signal: senal });
  await respuesta.body?.cancel();
  return { codigoHttp: respuesta.status, duracionMs: 0 };
};

test("la configuración rechaza al cargar una URL con usuario o clave, sin repetirla", () => {
  const resultado = leerServicios([{ nombre: "sembrado", url: CON_CLAVE, timeoutMs: 1000 }]);
  assert.equal(resultado.ok, false, "aceptó una URL con usuario y clave");
  if (!resultado.ok) {
    noRepiteSecretos(resultado.detalle);
  }
});

test("control: el error de fetch sí trae la URL completa", async () => {
  // Si esto deja de ser cierto, la prueba siguiente ya no mide nada.
  await assert.rejects(fetch(CON_CLAVE), (error: unknown) => {
    assert.ok(error instanceof Error && error.message.includes("usuario:clave"));
    return true;
  });
});

test("el detalle de una falla no repite la URL que trae el error de fetch", async () => {
  const servicio = { nombre: "sembrado", url: CON_CLAVE, timeoutMs: 1000 };
  const [estado] = await revisarTodos([servicio], consultarConFetch);
  assert.equal(estado?.tipo, "falla");
  if (estado?.tipo === "falla") {
    noRepiteSecretos(estado.detalle);
  }
});
