// fig09_06.tsx
type EstadoPublico =
  | { readonly nombre: string; readonly tipo: "disponible"; readonly codigoHttp: number }
  | { readonly nombre: string; readonly tipo: "falla"; readonly detalle: string };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  return <li>{estado.nombre}</li>;
}

export const pantalla = (
  <ul>
    <FilaEstado estado={{ nombre: "pagos", tipo: "pendiente" }} />
    <FilaEstado />
  </ul>
);
