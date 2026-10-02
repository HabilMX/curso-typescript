// fig09_02.tsx
import { JSDOM } from "jsdom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const dom = new JSDOM('<!doctype html><div id="raiz"></div>');

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

function contarServicios(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(2), 10));
}

function Resumen() {
  const [total, establecerTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    void contarServicios().then(establecerTotal);
  }, []);

  return <p>{total === undefined ? "Cargando…" : `${total} servicios`}</p>;
}

const raiz = dom.window.document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz");
}

const arbol = createRoot(raiz);

await act(async () => {
  arbol.render(<Resumen />);
});
console.log(`primer render: ${raiz.innerHTML}`);

await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
});
console.log(`tras el efecto: ${raiz.innerHTML}`);

await act(async () => {
  arbol.unmount();
});
dom.window.close();
