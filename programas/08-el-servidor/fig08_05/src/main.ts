// fig08_05/src/main.ts
import { leerServiciosDeArchivo } from "./archivo.js";
import { bitacoraEnConsola as registrar } from "./bitacora.js";
import { leerPuerto } from "./configuracion.js";
import { consultarConFetch } from "./consulta.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

function fallarArranque(evento: string, detalle: string): void {
  registrar({ evento, detalle });
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const puerto = leerPuerto(process.env.PUERTO);

  if (!puerto.ok) {
    fallarArranque("configuracion-invalida", puerto.detalle);
    return;
  }

  const servicios = await leerServiciosDeArchivo("servicios.json");

  if (!servicios.ok) {
    fallarArranque("configuracion-invalida", servicios.detalle);
    return;
  }

  const servidor = crearServidor({
    obtenerReporte: async () =>
      aReportePublico(await revisarTodos(servicios.valor, consultarConFetch)),
    registrar,
  });

  try {
    await escuchar(servidor, puerto.valor);
  } catch (error: unknown) {
    fallarArranque(
      "arranque-fallido",
      error instanceof Error ? error.message : "falla desconocida",
    );
    return;
  }

  registrar({ evento: "escuchando", detalle: `http://127.0.0.1:${puertoDe(servidor)}` });

  let cierre: Promise<void> | undefined;

  const detener = (senal: string): void => {
    cierre ??= (async () => {
      registrar({ evento: "cierre", detalle: `${senal} recibida` });
      await cerrar(servidor);
      registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
    })().catch((error: unknown) => {
      fallarArranque(
        "cierre-fallido",
        error instanceof Error ? error.message : "falla desconocida",
      );
    });
  };

  process.once("SIGTERM", () => detener("SIGTERM"));
  process.once("SIGINT", () => detener("SIGINT"));
}

await main();
