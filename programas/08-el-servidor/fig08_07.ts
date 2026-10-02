// fig08_07.ts
import { createServer } from "node:http";

createServer((solicitud, respuesta) => {
  respuesta.end(solicitud.url.toUpperCase());
});
