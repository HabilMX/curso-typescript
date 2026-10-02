// fig04_03.ts
function primero<T>(valores: readonly T[]): T | undefined {
  return valores[0];
}

const puertos = [443, 8080];
const servicios = ["catálogo", "pagos"];

const primerPuerto = primero(puertos);
const primerServicio = primero(servicios);

console.log(`puerto: ${primerPuerto ?? "ninguno"}`);
console.log(`servicio: ${primerServicio ?? "ninguno"}`);
