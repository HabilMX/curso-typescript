// fig02_09.ts
function detalleVisible(detalle: string | null): string {
  if (detalle === null) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(detalleVisible("tiempo agotado"));
console.log(detalleVisible(null));
