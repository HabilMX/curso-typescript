// fig08_05/src/servidor.test.ts
import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import test from "node:test";
import type { EntradaBitacora } from "./bitacora.js";
import { esReportePublico } from "./contrato.js";
import { consultarConFetch } from "./consulta.js";
import type { Servicio } from "./modelo.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

async function destino(): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((solicitud, respuesta) => {
    if (solicitud.url === "/ok") {
      respuesta.writeHead(200).end("ok");
    } else if (solicitud.url === "/caido") {
      respuesta.writeHead(503).end("caído");
    }
    // /lento nunca responde: sirve para provocar el tiempo límite.
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

async function puertoCerrado(): Promise<number> {
  const servidor = createServer();
  await escuchar(servidor, 0);
  const puerto = puertoDe(servidor);
  await cerrar(servidor);
  return puerto;
}

test("GET /api/estados revisa destinos reales y publica el reporte", async () => {
  const { servidor: remoto, base } = await destino();
  const sinServicio = await puertoCerrado();
  const servicios: readonly Servicio[] = [
    { nombre: "catálogo", url: `${base}/ok`, timeoutMs: 1500 },
    { nombre: "pagos", url: `${base}/caido`, timeoutMs: 1500 },
    { nombre: "inventario", url: `http://127.0.0.1:${sinServicio}/`, timeoutMs: 1500 },
    { nombre: "reportes", url: `${base}/lento`, timeoutMs: 150 },
  ];
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => aReportePublico(await revisarTodos(servicios, consultarConFetch)),
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);

  try {
    const respuesta = await fetch(`http://127.0.0.1:${puertoDe(api)}/api/estados?orden=nombre`);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("content-type"), "application/json; charset=utf-8");

    const cuerpo: unknown = await respuesta.json();
    assert.ok(esReportePublico(cuerpo));
    assert.deepEqual(
      cuerpo.estados.map((estado) =>
        estado.tipo === "falla"
          ? [estado.nombre, estado.detalle]
          : [estado.nombre, estado.codigoHttp],
      ),
      [
        ["catálogo", 200],
        ["pagos", "HTTP 503"],
        ["inventario", "conexión rechazada"],
        ["reportes", "tiempo límite agotado"],
      ],
    );
    assert.equal(JSON.stringify(cuerpo).includes("url"), false);
    assert.match(entradas[0]?.detalle ?? "", /^GET \/api\/estados 200 \d+ ms$/);
  } finally {
    await cerrar(api);
    remoto.closeAllConnections();
    await cerrar(remoto);
  }
});

test("las rutas desconocidas, los métodos y los errores internos responden con su código", async () => {
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => {
      throw new Error("detalle interno que no debe salir");
    },
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const salud = await fetch(`${base}/salud`);
    assert.equal(salud.status, 200);
    assert.equal(await salud.text(), "ok");

    const desconocida = await fetch(`${base}/api/no-existe`);
    assert.equal(desconocida.status, 404);
    assert.deepEqual(await desconocida.json(), { detalle: "ruta no encontrada" });

    const metodo = await fetch(`${base}/api/estados`, { method: "POST" });
    assert.equal(metodo.status, 405);
    assert.equal(metodo.headers.get("allow"), "GET");
    await metodo.body?.cancel();

    const interno = await fetch(`${base}/api/estados`);
    assert.equal(interno.status, 500);
    assert.deepEqual(await interno.json(), { detalle: "error interno" });
    assert.ok(entradas.some((entrada) => entrada.detalle === "detalle interno que no debe salir"));
  } finally {
    await cerrar(api);
  }
});

test("una ruta que no se puede analizar responde 404 y no derriba el servidor", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    registrar: () => {},
  });
  await escuchar(api, 0);
  const puerto = puertoDe(api);

  try {
    const codigo = await new Promise<number>((resolve, reject) => {
      const solicitud = request({ host: "127.0.0.1", port: puerto, path: "//" }, (respuesta) => {
        respuesta.resume();
        resolve(respuesta.statusCode ?? 0);
      });
      solicitud.on("error", reject);
      solicitud.end();
    });

    assert.equal(codigo, 404);
    assert.equal((await fetch(`http://127.0.0.1:${puerto}/salud`)).status, 200);
  } finally {
    await cerrar(api);
  }
});
