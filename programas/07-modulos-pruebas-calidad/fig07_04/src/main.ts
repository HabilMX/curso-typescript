// fig07_04/src/main.ts
import { leerServicios } from "./configuracion.js";
import { lineaReporte } from "./reporte.js";
import { revisarTodos, type Consultar } from "./revisar.js";

const configuracion = leerServicios([
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
]);

if (!configuracion.ok) {
  throw new Error(configuracion.detalle);
}

const consultar: Consultar = async (servicio) => {
  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return { codigoHttp: 204, duracionMs: 12 };
};

const estados = await revisarTodos(configuracion.valor, consultar);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
