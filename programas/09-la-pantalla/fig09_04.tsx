// fig09_04.tsx
import { renderToStaticMarkup } from "react-dom/server";

function DetalleInseguro({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<DetalleInseguro texto={detalleExterno} />));
