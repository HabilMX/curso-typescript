// fig08_06.ts
type Ruta = "/salud" | "/api/estados";

function atender(ruta: Ruta): void {
  console.log(ruta);
}

atender("/api/estado");
