// fig04_06.ts
function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "falla sin detalle legible";
}

try {
  throw new Error("tiempo límite agotado");
} catch (error) {
  console.log(textoError(error));
}

try {
  throw "servicio no alcanzable";
} catch (error) {
  console.log(textoError(error));
}
