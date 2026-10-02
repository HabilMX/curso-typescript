// fig00_04.ts
function etiquetaDetalle(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
console.log(etiquetaDetalle("200 OK"));
