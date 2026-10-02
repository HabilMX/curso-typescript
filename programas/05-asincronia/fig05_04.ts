// fig05_04.ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const servicios = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(servicios.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
