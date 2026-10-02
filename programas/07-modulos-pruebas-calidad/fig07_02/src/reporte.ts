// fig07_02/src/reporte.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
