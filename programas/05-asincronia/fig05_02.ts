// fig05_02.ts
async function obtenerEtiqueta(): Promise<string> {
  const nombre = await Promise.resolve("catálogo");
  return `revisando ${nombre}`;
}

const etiqueta = await obtenerEtiqueta();
console.log(etiqueta);
