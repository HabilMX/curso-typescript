// fig03_03.ts
interface Punto {
  x: number;
  y: number;
}

type Etiqueta = string;

function describir(punto: Punto, etiqueta: Etiqueta): string {
  return `${etiqueta}: ${punto.x},${punto.y}`;
}

console.log(describir({ x: 4, y: 7 }, "origen de prueba"));
