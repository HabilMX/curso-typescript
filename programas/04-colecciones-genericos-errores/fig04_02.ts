// fig04_02.ts
type Estado = {
  readonly servicio: string;
  readonly tipo: "disponible" | "falla";
};

const estados = new Map<string, Estado>();
estados.set("catálogo", { servicio: "catálogo", tipo: "disponible" });
estados.set("pagos", { servicio: "pagos", tipo: "falla" });

const nombres = new Set<string>(["catálogo", "pagos", "catálogo"]);

console.log(`estados: ${estados.size}`);
console.log(`catálogo existe: ${estados.has("catálogo")}`);
console.log(`inventario: ${estados.get("inventario") ?? "sin resultado"}`);
console.log(`nombres únicos: ${[...nombres].join(", ")}`);
