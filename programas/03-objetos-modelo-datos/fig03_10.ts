// fig03_10.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function descripcion(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `HTTP ${estado.codigoHttp}`;
  }

  return `falla: ${estado.detalle}`;
}

console.log(descripcion({ tipo: "disponible", codigoHttp: 204 }));
console.log(descripcion({ tipo: "falla", detalle: "tiempo agotado" }));
