// fig07_01/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

export type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

export type Estado = EstadoDisponible | EstadoFalla;

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
