// fig09_05/src/panel/Panel.tsx
import type { EstadoPublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { useReporte, type Carga } from "./useReporte.js";

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li className="disponible">
        <strong>{estado.nombre}</strong>: disponible (HTTP {estado.codigoHttp}, {estado.duracionMs}{" "}
        ms)
      </li>
    );
  }

  return (
    <li className="falla">
      <strong>{estado.nombre}</strong>: falla ({estado.detalle})
    </li>
  );
}

function Contenido({ carga }: { readonly carga: Carga }) {
  switch (carga.tipo) {
    case "cargando":
      return <p role="status">Cargando…</p>;
    case "error":
      return <p role="alert">No se pudo cargar el reporte: {carga.detalle}</p>;
    case "listo":
      return (
        <ul>
          {carga.reporte.estados.map((estado, posicion) => (
            <FilaEstado key={`${posicion}-${estado.nombre}`} estado={estado} />
          ))}
        </ul>
      );
    default: {
      const sinAtender: never = carga;
      throw new Error(`carga sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function Panel({
  cargar,
  cadaMs = 10_000,
}: {
  readonly cargar: Cargar;
  readonly cadaMs?: number;
}) {
  const { carga, recargar } = useReporte(cargar, cadaMs);

  return (
    <main>
      <h1>Revisor</h1>
      <Contenido carga={carga} />
      <button type="button" onClick={recargar}>
        Actualizar
      </button>
    </main>
  );
}
