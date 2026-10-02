// fig00_01.ts
type Estado = "disponible" | "falla";

function describir(estado: Estado): string {
  return estado === "disponible" ? "Servicio disponible" : "Servicio con falla";
}

console.log(describir("disponible"));
