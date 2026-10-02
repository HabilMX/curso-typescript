// fig03_12.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function codigo(estado: Estado): number {
  return estado.codigoHttp;
}
