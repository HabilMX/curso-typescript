// fig09_03.tsx
import { renderToStaticMarkup } from "react-dom/server";

function Detalle({ texto }: { readonly texto: string }) {
  return <p>{texto}</p>;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<Detalle texto={detalleExterno} />));
