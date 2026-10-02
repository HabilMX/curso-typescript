// fig09_05/src/reporte.ts
import type { EstadoPublico, ReportePublico } from "./contrato.js";
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

function aEstadoPublico(estado: Estado): EstadoPublico {
  if (estado.tipo === "disponible") {
    return {
      nombre: estado.servicio.nombre,
      tipo: "disponible",
      codigoHttp: estado.codigoHttp,
      duracionMs: estado.duracionMs,
    };
  }

  return { nombre: estado.servicio.nombre, tipo: "falla", detalle: estado.detalle };
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  return { estados: estados.map(aEstadoPublico) };
}
