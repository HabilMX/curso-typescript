// fig02_10.ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}

console.log(lineaDeFalla("pagos", "tiempo agotado"));
console.log(lineaDeFalla("catálogo", undefined));
