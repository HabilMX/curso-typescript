// fig09_05/src/panel/useReporte.ts
import { useEffect, useState } from "react";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";

export type Carga =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "listo"; readonly reporte: ReportePublico }
  | { readonly tipo: "error"; readonly detalle: string };

export function useReporte(
  cargar: Cargar,
  cadaMs: number,
): { readonly carga: Carga; readonly recargar: () => void } {
  const [carga, establecerCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, establecerIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();

    async function pedir(): Promise<void> {
      try {
        const reporte = await cargar(control.signal);
        establecerCarga({ tipo: "listo", reporte });
      } catch (error: unknown) {
        if (control.signal.aborted) {
          return;
        }

        const detalle = error instanceof Error ? error.message : "falló la carga";
        establecerCarga({ tipo: "error", detalle });
      }
    }

    void pedir();
    const temporizador = setInterval(() => void pedir(), cadaMs);

    return () => {
      control.abort();
      clearInterval(temporizador);
    };
  }, [cargar, cadaMs, intento]);

  function recargar(): void {
    establecerCarga({ tipo: "cargando" });
    establecerIntento((actual) => actual + 1);
  }

  return { carga, recargar };
}
