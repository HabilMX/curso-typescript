// fig03_05.ts
interface Registro {
  readonly id: string;
  cliente: {
    nombre: string;
  };
}

const registro: Registro = {
  id: "catalogo",
  cliente: { nombre: "catálogo" },
};

registro.cliente.nombre = "catálogo público";

console.log(`${registro.id}: ${registro.cliente.nombre}`);
