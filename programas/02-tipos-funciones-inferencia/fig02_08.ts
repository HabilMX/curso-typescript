// fig02_08.ts
function resumenDuracion(duracionMs: number | undefined): string {
  if (duracionMs === undefined) {
    return "sin duración registrada";
  }

  return duracionMs <= 500 ? `${duracionMs} ms: rápido` : `${duracionMs} ms: lento`;
}

console.log(resumenDuracion(320));
console.log(resumenDuracion(undefined));
