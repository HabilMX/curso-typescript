// fig02_06.ts
type ResultadoBasico = "disponible" | "falla";

function resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico {
  if (codigoHttp >= 200 && codigoHttp < 400) {
    return "disponible";
  }

  return "falla";
}

console.log(resultadoDesdeCodigo(204));
console.log(resultadoDesdeCodigo(503));
