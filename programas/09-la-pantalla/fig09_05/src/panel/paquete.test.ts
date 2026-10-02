// fig09_05/src/panel/paquete.test.ts
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { aReportePublico } from "../reporte.js";
import { cerrar, crearServidor, escuchar, puertoDe, type Activo } from "../servidor.js";

async function empaquetar(): Promise<Map<string, string>> {
  const resultado = await build({
    entryPoints: [
      fileURLToPath(new URL("../../src/panel/cliente.tsx", import.meta.url)),
      fileURLToPath(new URL("../../src/panel/panel.css", import.meta.url)),
    ],
    bundle: true,
    minify: true,
    format: "iife",
    outdir: "salida",
    write: false,
    logLevel: "silent",
  });

  return new Map(
    resultado.outputFiles.map((archivo) => [archivo.path.split("/").pop() ?? "", archivo.text]),
  );
}

async function esperar(condicion: () => boolean): Promise<void> {
  for (let intento = 0; intento < 100; intento += 1) {
    if (condicion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("la condición no se cumplió a tiempo");
}

test("el paquete que sirve el servidor pinta el reporte en una página real", async () => {
  const archivos = await empaquetar();
  const api = crearServidor({
    obtenerReporte: async () =>
      aReportePublico([
        {
          servicio: { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
          tipo: "falla",
          detalle: "<b>negrita</b>",
        },
      ]),
    leerActivo: async (activo: Activo) => archivos.get(activo) ?? "",
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const pagina = await fetch(`${base}/`);
    const politica = pagina.headers.get("content-security-policy") ?? "";
    assert.equal(
      politica,
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    assert.doesNotMatch(politica, /unsafe-/);

    const script = await (await fetch(`${base}/cliente.js`)).text();
    const ventana = new JSDOM(await pagina.text(), { runScripts: "outside-only", url: base })
      .window;
    Object.assign(ventana, { fetch: (ruta: string) => fetch(new URL(ruta, base)) });
    ventana.eval(script);

    await esperar(() => ventana.document.querySelector("li") !== null);
    assert.equal(
      ventana.document.querySelector("li")?.textContent,
      "catálogo: falla (<b>negrita</b>)",
    );
    assert.equal(ventana.document.querySelector("b"), null);
    ventana.close();
  } finally {
    await cerrar(api);
  }
});
