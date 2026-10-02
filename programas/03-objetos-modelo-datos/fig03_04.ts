// fig03_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type EstadoInicial = {
  servicio: Servicio;
  tipo: "pendiente";
};

function presentarInicio(estado: EstadoInicial): string {
  return `${estado.servicio.nombre}: pendiente`;
}

const estado: EstadoInicial = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "pendiente",
};

console.log(presentarInicio(estado));
