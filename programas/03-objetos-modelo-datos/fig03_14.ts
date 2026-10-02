// fig03_14.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type EstadoCancelado = {
  tipo: "cancelado";
  motivo: string;
};

type Estado = EstadoDisponible | EstadoFalla | EstadoCancelado;

function descripcion(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `HTTP ${estado.codigoHttp}`;
    case "falla":
      return `falla: ${estado.detalle}`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
