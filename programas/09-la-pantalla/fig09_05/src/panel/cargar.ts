// fig09_05/src/panel/cargar.ts
import { esReportePublico, type ReportePublico } from "../contrato.js";

export type Cargar = (senal: AbortSignal) => Promise<ReportePublico>;

export async function cargarReporte(senal: AbortSignal, base = ""): Promise<ReportePublico> {
  const respuesta = await fetch(`${base}/api/estados`, { signal: senal });

  if (!respuesta.ok) {
    throw new Error(`la API respondió ${respuesta.status}`);
  }

  const cuerpo: unknown = await respuesta.json();

  if (!esReportePublico(cuerpo)) {
    throw new Error("la API no entregó un reporte válido");
  }

  return cuerpo;
}
