// fig06_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

type Esquema<T> = {
  leer(valor: unknown): Resultado<T>;
};

type Inferir<E extends Esquema<unknown>> =
  E extends Esquema<infer T> ? T : never;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

const textoNoVacio: Esquema<string> = {
  leer(valor) {
    if (typeof valor === "string" && valor.trim() !== "") {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser texto no vacío" };
  },
};

const enteroPositivo: Esquema<number> = {
  leer(valor) {
    if (
      typeof valor === "number" &&
      Number.isSafeInteger(valor) &&
      valor > 0
    ) {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser entero positivo" };
  },
};

function objeto<T extends Record<string, Esquema<unknown>>>(
  campos: T,
): Esquema<{ [K in keyof T]: Inferir<T[K]> }> {
  return {
    leer(valor) {
      if (!esRegistro(valor)) {
        return { ok: false, detalle: "debe ser un objeto" };
      }

      const salida: Record<string, unknown> = {};

      for (const [clave, esquema] of Object.entries(campos)) {
        const resultado = esquema.leer(valor[clave]);

        if (!resultado.ok) {
          return { ok: false, detalle: `${clave}: ${resultado.detalle}` };
        }

        salida[clave] = resultado.valor;
      }

      return {
        ok: true,
        valor: salida as { [K in keyof T]: Inferir<T[K]> },
      };
    },
  };
}

const esquemaServicio = objeto({
  nombre: textoNoVacio,
  url: textoNoVacio,
  timeoutMs: enteroPositivo,
});

type Servicio = Inferir<typeof esquemaServicio>;

const resultado = esquemaServicio.leer({
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
});

if (resultado.ok) {
  const servicio: Servicio = resultado.valor;
  console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
}
