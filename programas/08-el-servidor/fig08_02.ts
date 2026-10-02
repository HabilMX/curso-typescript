// fig08_02.ts
import { createServer } from "node:http";

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

type Estado =
  | {
      readonly servicio: Servicio;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
      readonly duracionMs: number;
    }
  | {
      readonly servicio: Servicio;
      readonly tipo: "falla";
      readonly detalle: string;
    };

type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  const ruta = new URL(url ?? "/", "http://revisor.local").pathname;

  if (ruta === "/salud") {
    return { tipo: "salud" };
  }

  if (ruta === "/api/estados") {
    return { tipo: "estados" };
  }

  return { tipo: "no-encontrada" };
}

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

const estados: readonly Estado[] = [
  {
    servicio: {
      nombre: "catálogo",
      url: "https://catalogo.example",
      timeoutMs: 1500,
    },
    tipo: "disponible",
    codigoHttp: 200,
    duracionMs: 42,
  },
  {
    servicio: {
      nombre: "pagos",
      url: "https://pagos.example",
      timeoutMs: 3000,
    },
    tipo: "falla",
    detalle: "tiempo límite",
  },
];

const servidor = createServer((solicitud, respuesta) => {
  const ruta = reconocerRuta(solicitud.url);

  if (ruta.tipo === "salud") {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("ok");
    return;
  }

  if (ruta.tipo === "estados") {
    respuesta.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify({ estados }));
    return;
  }

  respuesta.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify({ detalle: "ruta no encontrada" }));
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const estadosRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/estados`);
const desconocidaRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/no-existe`);

console.log(await estadosRespuesta.text());
console.log(`${desconocidaRespuesta.status} ${await desconocidaRespuesta.text()}`);

await cerrar(servidor);
