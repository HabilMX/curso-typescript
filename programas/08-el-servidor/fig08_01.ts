// fig08_01.ts
import { createServer } from "node:http";

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
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

const servidor = createServer((solicitud, respuesta) => {
  if (solicitud.url === "/salud") {
    respuesta.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    });
    respuesta.end("ok");
    return;
  }

  respuesta.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
  });
  respuesta.end("no encontrado");
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const respuesta = await fetch(`http://127.0.0.1:${puerto}/salud`);

console.log(`${respuesta.status} ${await respuesta.text()}`);

await cerrar(servidor);
