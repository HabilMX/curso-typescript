// fig03_06.ts
interface Registro {
  readonly id: string;
}

const registro: Registro = { id: "catalogo" };

registro.id = "pagos";
