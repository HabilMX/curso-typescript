// fig02_07.ts
function mostrarPuerto(puerto: number | string): string {
  if (typeof puerto === "string") {
    return `puerto configurado: ${puerto}`;
  }

  return `puerto numérico: ${puerto}`;
}

console.log(mostrarPuerto(443));
console.log(mostrarPuerto("8080"));
