// fig02_04.ts
function clasificarDuracion(duracionMs: number): string {
  if (duracionMs <= 500) {
    return "rápido";
  }

  return "lento";
}

function imprimirClasificacion(nombre: string, duracionMs: number): void {
  console.log(`${nombre}: ${clasificarDuracion(duracionMs)}`);
}

imprimirClasificacion("catálogo", 420);
imprimirClasificacion("pagos", 850);
