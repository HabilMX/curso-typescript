// fig05_01.ts
console.log("inicio síncrono");

setTimeout(() => {
  console.log("tarea de temporizador");
}, 0);

Promise.resolve().then(() => {
  console.log("microtarea de promesa");
});

console.log("fin síncrono");
