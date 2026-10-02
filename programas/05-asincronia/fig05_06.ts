// fig05_06.ts
function esperarCancelacion(signal: AbortSignal): Promise<void> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

async function conLimite(): Promise<void> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, 0);

  try {
    await esperarCancelacion(controlador.signal);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  } finally {
    clearTimeout(temporizador);
  }
}

await conLimite();
