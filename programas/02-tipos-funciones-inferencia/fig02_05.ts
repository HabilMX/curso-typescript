// fig02_05.ts
type Prioridad = "normal" | "urgente";

function etiquetaPrioridad(prioridad: Prioridad): string {
  return prioridad === "urgente" ? "atención inmediata" : "seguimiento normal";
}

console.log(etiquetaPrioridad("normal"));
console.log(etiquetaPrioridad("urgente"));
