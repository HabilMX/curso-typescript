// fig03_08.ts
interface ConNombre {
  nombre: string;
}

function saludar(valor: ConNombre): string {
  return `revisando ${valor.nombre}`;
}

const servicioCompleto = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(saludar(servicioCompleto));
