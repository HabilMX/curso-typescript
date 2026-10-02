// fig09_01.tsx
import { renderToStaticMarkup } from "react-dom/server";

type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li>
        <strong>{estado.nombre}</strong> disponible: HTTP {estado.codigoHttp}
      </li>
    );
  }

  return (
    <li>
      <strong>{estado.nombre}</strong> falla: {estado.detalle}
    </li>
  );
}

const pantalla = renderToStaticMarkup(
  <ul>
    <FilaEstado estado={{ nombre: "catálogo", tipo: "disponible", codigoHttp: 200 }} />
    <FilaEstado estado={{ nombre: "pagos", tipo: "falla", detalle: "tiempo límite" }} />
  </ul>,
);

console.log(pantalla);
