// fig09_05/src/panel/Panel.test.tsx
import { documento } from "./dom-de-prueba.js";
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { Panel } from "./Panel.js";

const reporte: ReportePublico = {
  estados: [
    { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { nombre: "pagos", tipo: "falla", detalle: "<img src=x onerror=alert(1)>" },
  ],
};

async function montar(cargar: Cargar): Promise<{ contenedor: HTMLElement; desmontar: () => void }> {
  const contenedor = documento.createElement("div");
  documento.body.append(contenedor);
  const raiz = createRoot(contenedor);

  await act(async () => {
    raiz.render(<Panel cargar={cargar} cadaMs={60_000} />);
  });

  return {
    contenedor,
    desmontar: () => {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

test("muestra Cargando mientras la API no responde y luego las filas", async () => {
  let responder: (reporte: ReportePublico) => void = () => {};
  const cargar: Cargar = () =>
    new Promise((resolve) => {
      responder = resolve;
    });

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(contenedor.querySelector("[role=status]")?.textContent, "Cargando…");

  await act(async () => {
    responder(reporte);
  });

  const filas = [...contenedor.querySelectorAll("li")].map((fila) => fila.textContent);
  assert.deepEqual(filas, [
    "catálogo: disponible (HTTP 200, 42 ms)",
    "pagos: falla (<img src=x onerror=alert(1)>)",
  ]);
  desmontar();
});

test("un detalle con HTML se muestra como texto y no crea elementos", async () => {
  const { contenedor, desmontar } = await montar(async () => reporte);

  assert.equal(contenedor.querySelector("img"), null);
  assert.match(contenedor.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  desmontar();
});

test("muestra el error y se recupera al pulsar Actualizar", async () => {
  let intentos = 0;
  const cargar: Cargar = async () => {
    intentos += 1;

    if (intentos === 1) {
      throw new Error("la API respondió 503");
    }

    return reporte;
  };

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(
    contenedor.querySelector("[role=alert]")?.textContent,
    "No se pudo cargar el reporte: la API respondió 503",
  );

  await act(async () => {
    contenedor.querySelector("button")?.click();
  });

  assert.equal(contenedor.querySelector("[role=alert]"), null);
  assert.equal(contenedor.querySelectorAll("li").length, 2);
  assert.equal(intentos, 2);
  desmontar();
});

test("al desmontar cancela la solicitud en curso", async () => {
  let senalRecibida: AbortSignal | undefined;
  const cargar: Cargar = (senal) => {
    senalRecibida = senal;
    return new Promise(() => {});
  };

  const { desmontar } = await montar(cargar);
  assert.equal(senalRecibida?.aborted, false);
  desmontar();
  assert.equal(senalRecibida?.aborted, true);
});
