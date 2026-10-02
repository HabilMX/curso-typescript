// fig09_05/src/panel/cliente.tsx
import { createRoot } from "react-dom/client";
import { cargarReporte } from "./cargar.js";
import { Panel } from "./Panel.js";

const raiz = document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz en la página");
}

createRoot(raiz).render(<Panel cargar={(senal) => cargarReporte(senal)} />);
