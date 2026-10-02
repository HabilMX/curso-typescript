// fig00_02.ts
type Estado = "disponible" | "falla";

type Servicio = {
  nombre: string;
  estado: Estado;
};

function resumen(servicio: Servicio): string {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
