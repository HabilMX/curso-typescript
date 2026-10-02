// fig08_04.ts
import { createServer, type Server } from "node:http";

function registrar(evento: string, detalle: string): void {
  console.log(JSON.stringify({ evento, detalle }));
}

function cerrar(servidor: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

let llegoLaSolicitud: () => void = () => {};
const solicitudRecibida = new Promise<void>((resolve) => {
  llegoLaSolicitud = resolve;
});

const servidor = createServer((_solicitud, respuesta) => {
  registrar("solicitud", "llegó; responderá en 100 ms");
  llegoLaSolicitud();

  setTimeout(() => {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("terminé");
  }, 100);
});

let cierre: Promise<void> | undefined;

function detener(senal: string): void {
  cierre ??= (async () => {
    registrar("cierre", `${senal} recibida: no se aceptan conexiones nuevas`);
    await cerrar(servidor);
    registrar("cerrado", "ya no queda ninguna solicitud en curso");
  })();
}

process.once("SIGTERM", () => detener("SIGTERM"));

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no escucha en un puerto TCP");
}

const pendiente = fetch(`http://127.0.0.1:${direccion.port}/lento`).then((respuesta) =>
  respuesta.text(),
);

await solicitudRecibida;
process.kill(process.pid, "SIGTERM");

registrar("cliente", `recibió «${await pendiente}»`);
await cierre;
