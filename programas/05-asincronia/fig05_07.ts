// fig05_07.ts
interface Servicio {
  readonly nombre: string;
  readonly timeoutMs: number;
}

type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

type Consultar = (
  servicio: Servicio,
  signal: AbortSignal,
) => Promise<{ codigoHttp: number; duracionMs: number }>;

function esperarAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

const consultarDePrueba: Consultar = async (servicio, signal) => {
  if (servicio.nombre === "catálogo") {
    return { codigoHttp: 200, duracionMs: 0 };
  }

  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return esperarAbort(signal);
};

async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<Estado[]> {
  return Promise.all(
    servicios.map((servicio) => revisarUno(servicio, consultar)),
  );
}

function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

const estados = await revisarTodos(
  [
    { nombre: "catálogo", timeoutMs: 100 },
    { nombre: "pagos", timeoutMs: 100 },
    { nombre: "inventario", timeoutMs: 0 },
  ],
  consultarDePrueba,
);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
