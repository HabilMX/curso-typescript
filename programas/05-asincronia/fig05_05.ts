// fig05_05.ts
function tareas(): Promise<string>[] {
  return [
    Promise.resolve("catálogo"),
    Promise.reject(new Error("conexión rechazada")),
    Promise.resolve("inventario"),
  ];
}

try {
  await Promise.all(tareas());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(`Promise.all: ${error.message}`);
  }
}

const resultados = await Promise.allSettled(tareas());

for (const resultado of resultados) {
  if (resultado.status === "fulfilled") {
    console.log(`${resultado.value}: disponible`);
  } else if (resultado.reason instanceof Error) {
    console.log(`pagos: falla (${resultado.reason.message})`);
  }
}
