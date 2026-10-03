# Lesson 8 — The server

**Time:** 2 × 45 min

**What you build:** the HTTP API of the `revisor`

**What you learn:** HTTP server, typed routes, JSON, configuration, log, graceful shutdown

## By the end you will be able to

- Create a Node HTTP server that listens for connections, answers a request, and shuts down without leaving resources open.
- Model the known routes as a TypeScript union and respond explicitly to the paths that do not exist and the methods you do not allow.
- Send JSON responses with the right status code and `content-type` header, and publish a contract that does not leak internal data.
- Read the `PUERTO` environment variable as untrusted text and validate it before handing it to the server.
- Record operational events without mixing the log with business rules or with responses to the client.
- Shut the server down gracefully when it receives `SIGTERM` or `SIGINT`, waiting for the requests that were already in progress.
- Assemble the `revisor` from the previous lessons into a process that queries real targets and answers `GET /api/estados`.

## The why before the how

Up to the previous lesson, the `revisor` already knows how to do useful work. It has a `Servicio` model, represents each outcome with a discriminated union `Estado`, queries several targets at once with `revisarTodos`, validates its configuration before using it, and is organized into modules with tests. But all of that lives inside a process that you start and read from the terminal. That is useful for developing, and it has an important limitation: any other program that wanted to know the report would have to run the `revisor` on its own, interpret text meant for people, or import internal modules of someone else's project.

An HTTP API changes that boundary. Instead of asking every consumer to know how to read files, launch queries, and sort results, the `revisor` process keeps that responsibility and offers one public operation: “give me the current state”. An **API** (application programming interface) is exactly that: a set of operations that a program offers to other programs, with a contract that says what can be requested and what is received in return. A web dashboard, the one in lesson 9, will be able to request that information from a browser. An alert, a deployment integration, or a support tool could do it too. The API does not replace the logic you already built: it places it behind a door with a visible contract.

HTTP is a simple conversation between two participants. A client sends a request with a method (`GET`, `POST`…), a path, headers, and sometimes a body. The server decides how to handle it and returns a response with a status code, headers, and a body. In the smallest case, a client requests `GET /salud`, the server answers `200` and the body `ok`. In the case of the `revisor`, a client will request `GET /api/estados` and will receive JSON with the result of checking all the services at that moment.

The word “server” can seem bigger than it is. You do not need an account, an external service, or an additional library to start: Node includes the `node:http` module, which accepts TCP connections, turns them into request and response objects, and runs a function for each request. A web framework can save code when a project has many routes, validators, and *middleware* (intermediate functions that process a request before or after the final handler), but it pays to understand first the basic contract that such a framework manages. If you do not know when a header is written, what happens with an unknown route, or how the process shuts down, changing syntax does not remove the problem; it only hides it.

It is also worth distinguishing two directions of communication. Lesson 5 prepared the `Consultar` type, which describes how the `revisor` asks about someone else's service; in this lesson you will write the first real implementation of that type, with `fetch`. And the `revisor` will also be an HTTP server for its own consumers. Both roles use HTTP codes, URLs, and response bodies, but their responsibilities are opposite. As a client, the `revisor` translates remote responses and network failures into an `Estado`. As a server, it translates its internal `Estado` values into a stable response that other people and programs can consume without knowing its guts.

The TypeScript type helps especially in this layer because an API gathers several small decisions that in JavaScript usually remain implicit. Which routes exist? What shape does the response of each one have? What configuration is valid to start? Which events are recorded? What happens when a shutdown signal arrives? A type does not stop a connection or protect a process's port by itself, but it makes visible the contracts you must maintain while the program grows.

The server must not become a second application that duplicates everything either. File validation still belongs to `configuracion.ts`. The concurrent query still belongs to `revisar.ts`. The presentation for people still belongs to `reporte.ts`. The server is an outer layer: it interprets a request, calls the domain functions, and adapts the result to HTTP. That separation lets the same check feed the API, the console, and the dashboard without each consumer reinventing the availability rules.

Go offers a useful comparison. With `net/http`, Go also lets you register a function that handles requests and start a server from the standard library. Node follows a similar idea: a process listens, a function receives request and response, and the program decides routes, codes, and shutdown. The difference lies in how waiting is expressed. In Go it is common for a shutdown function to return an `error`; in Node many network operations are expressed with events or *callbacks* that you wrap in a promise so that you can use `await`, as you will do in this lesson.

Before writing routes, adopt an operational idea: a server is not a function that “finishes and that's it”. It lives as long as it listens for connections, so its limits matter more than in a short program. It must have validated configuration before opening the port, record the events that help diagnose it, and shut down deliberately when the system needs to stop it. If those decisions are left for the end, they show up as processes that do not terminate, busy ports, or logs that do not explain why a request failed.

This lesson keeps the structure you set in lessons 1 and 7: the single entry point is `src/main.ts`, which `tsc` compiles to `dist/main.js`; `rootDir` is `./src` and `outDir` is `./dist`; and the scripts are called `compilar`, `verificar`, `arrancar`, `probar`, `lint`, and `formato`. No new dependency is installed: `node:http` and `fetch` come with Node. What changes are the files in `src/`: `contrato.ts`, `consulta.ts`, `archivo.ts`, `bitacora.ts`, and `servidor.ts` are added, and `main.ts` is rewritten so that, instead of printing a sample report, it starts a server.

## The concepts

### An HTTP server: listening is not answering

`createServer` builds a server object. That object does not yet occupy any port or receive traffic. To start listening you must call `listen`. Every time a request arrives, Node will invoke the function you handed to `createServer` with two objects: `IncomingMessage`, which represents the request, and `ServerResponse`, which represents the response you are going to build.

The separation matters because creating, listening, and answering are different phases. You can build the server without starting it to test its handler. You can choose a port in the configuration before opening it. And you can stop the server after using it. If you put everything into one long, unnamed call, it is harder to see which operation failed: whether the configuration could not be read, whether the port was busy, or whether the route answered badly.

A minimal HTTP response has two relevant parts. The status code communicates the overall result: `200` indicates success, `404` indicates that the requested resource does not exist, and `500` represents a server failure. The body contains the detail the client can read. The headers indicate how to interpret that body; for text, `text/plain; charset=utf-8` declares both the content type and the character encoding.

The following program creates a health route. It uses port `0`, which asks the operating system to pick an available one. That avoids depending on port 3000, 8080, or another fixed port being free on your machine. The program obtains the chosen port only so that its own `fetch` can make a request; it does not print it, because that choice varies between runs. Since it uses top-level `await`, run it inside the `figuras/` folder you prepared in lesson 1, whose `package.json` declares `"type": "module"`.

```ts
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
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_01.ts
$ node fig08_01.js
200 ok
```

The `node:` prefix identifies Node's own modules and avoids confusing them with a package installed by the project. Since the program imports a Node module, the command includes `--types node`: TypeScript needs those declarations to know `createServer` and the properties of requests, and Node provides the real behavior when running the JavaScript.

`respuesta.end(...)` is decisive. It writes the final body and signals that the response is over. If you forget to end it, the client may keep waiting even though the server has already computed its content. It is also good practice to use `return` after a response that closes a branch: it is not necessary for HTTP to work, but it prevents later code from trying to write a second response over the same connection.

Notice also how the port is obtained. `servidor.address()` returns `string | AddressInfo | null`: a string if the server listens on a Unix socket, an object with the port if it listens on TCP, and `null` if it is not yet listening. The figure discards the two cases it cannot use with an explicit check and throws an error if they occur. That check does the work that a type assertion would only pretend to do: after it, TypeScript knows that `direccion` is an `AddressInfo` and `direccion.port` exists, without you having to promise it anything.

Inside the `revisor`, `/salud` does not need to query all the services or read the whole report. Its question is smaller: “is the HTTP process alive and able to answer?”. That distinction proves useful in operation. If `/salud` does not respond, the problem may be the process, the port, or the local network. If `/salud` responds but `/api/estados` reports failures, the process works and the problem lies in the services being checked or in their query. Do not declare the whole platform available just because the server answers `200`: a health route verifies the life of the process, and the state report represents the result of external targets. They are different questions and must keep different names and responses.

### Typed routes: the external URL is not a trustworthy union

A route received over HTTP arrives as text. Any client can request `/api/estados`, `/api/estado`, `/API/ESTADOS`, `/borrar-todo`, or a route with unexpected parameters. The type of `solicitud.url` reflects that reality: it is `string | undefined`. You cannot declare that this external input is already one of your routes just because you would like it to be.

The correct operation has two steps. First you parse the external text and convert it to an internal representation. Afterwards, the rest of the handler works with a limited union. It is the same boundary pattern as in lesson 6: a broad value arrives from outside; after validating and classifying, the domain receives known alternatives.

The `Ruta` union does not change what a person can type in the browser's address bar. It does prevent the rest of the program from treating an unknown route as if it were valid. If you add a future route, TypeScript can help you find the points where you must decide its status code, its body, and its response format; in the final project it will do so with the `never` exhaustiveness check you saw in lesson 3. In this figure the states are written by hand inside the file so that the program is runnable on its own; in the project they will come from `revisarTodos`.

```ts
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
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_02.ts
$ node fig08_02.js
{"estados":[{"servicio":{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":1500},"tipo":"disponible","codigoHttp":200,"duracionMs":42},{"servicio":{"nombre":"pagos","url":"https://pagos.example","timeoutMs":3000},"tipo":"falla","detalle":"tiempo límite"}]}
404 {"detalle":"ruta no encontrada"}
```

`new URL` separates the path from other components of a URL, such as the query and the fragment. That way, `/api/estados?orden=nombre` still recognizes the same base route even if you later decide to interpret the `orden` parameter. Do not compare text against a full URL if you are only interested in the `pathname`: a query added by a client would change the text even though the resource is the same. The second argument of `new URL` is a made-up base, `http://revisor.local`, which exists only so that the constructor accepts relative paths such as `/salud`; it is never used to connect to anything.

Notice that `Ruta` uses a discriminated union. The `tipo` field serves the same function as in `Estado`: it lets TypeScript narrow the type inside each branch. A health route does not need the states. A route not found must not accidentally return the internal collection. As you add routes, this structure keeps the recognition decision and the response decision together.

A `404` is not an exception or an optional text. It is the right response when the process exists but does not offer the requested resource. Answering `200` with a sentence that says “not found” forces every client to invent rules to interpret the body. HTTP codes already communicate that category of result; use them so that browsers, tools, and the dashboard share the same language.

The previous figure also contains a deliberate defect, and it is worth seeing it now. Its JSON includes, for each state, the complete `servicio`: its `url` and its `timeoutMs`. That is convenient for the programmer, because it is exactly the object that already exists in memory, and it is a mistake for an API: you have just published the address of your internal services, and every change in the model will change the response without anyone having decided it. The next section fixes that.

### JSON and public contract: what goes out is not what is inside

JSON is a data format, not proof that the data is correct. `JSON.stringify` converts `revisor` objects into text for an HTTP response. On the other side, `respuesta.json()` converts JSON text into a value that the client must treat as external until it validates it. The difference is similar to the one in lesson 6: the server knows its `Estado` values; the dashboard of the next lesson will receive JSON and will have to decide whether the response meets the contract it expects.

The `content-type: application/json; charset=utf-8` header is part of that agreement. Many clients can guess that a body is JSON from its first character, but they should not have to. The header declares which format is being sent and lets HTTP tools, browsers, and libraries treat it correctly. Do not send JSON as `text/plain` just because it looks fine in a terminal.

What matters most is the shape. The internal model, `Estado`, keeps the complete `Servicio` because `revisarTodos` needs to relate each result to its configuration. The public contract is something else: it is what an outside person or program needs to know, and nothing more. That is why the project creates `src/contrato.ts` with two types, `EstadoPublico` and `ReportePublico`. `EstadoPublico` is also a union discriminated by `tipo`, but instead of `servicio: Servicio` it carries only the `nombre`. There is no `url`, no `timeoutMs`. And a function, `aReportePublico`, in `reporte.ts`, builds each public object field by field. Building it this way, instead of copying the `Estado` and removing properties, has an advantage that becomes clear over time: if tomorrow `Servicio` adds a token, an account, or a retry policy, the API does not publish it by accident, because the response contains only what someone deliberately wrote there.

The same file carries a third piece, `esReportePublico(valor: unknown): valor is ReportePublico`, which checks at runtime that an unknown value has that shape. It seems superfluous on the server, which is the one producing the JSON. It is not, for two reasons. First, the tests of this lesson use it to read the API's response without blindly accepting what `respuesta.json()` returns. Second, the dashboard of lesson 9 consumes exactly this contract from the browser, and there it is indeed a network boundary: the `contrato.ts` file imports nothing from Node, so it can travel as is to the browser together with the dashboard. It is the first type shared between the server and the screen, and it shares the two things that must travel together: the shape and the way to check it.

It also avoids publishing details that are not part of the contract. The JSON of `/api/estados` can include `nombre`, `tipo`, code, duration, or detail because they are useful data of the report. It must not return environment variables, local file paths, request headers, or raw technical messages out of convenience. A public API keeps minimal, deliberate, documented data. This rule extends to the `detalle` of a failure: that text reaches the client, so the project builds it with a short, controlled vocabulary (“tiempo límite agotado”, “conexión rechazada”, “HTTP 503”) instead of forwarding the original message of a network exception, which could reveal addresses or paths.

### Configuration: the port is text, not a number

Configuration follows the same boundary principle. `process.env.PUERTO` comes from the environment and is not a safe number: Node always delivers a string, even if whoever deploys wrote `PUERTO=8080`. It may be missing, have spaces, contain `ochenta`, be `0`, be a decimal, or exceed the valid range of ports. Converting it with `Number(...)` without checking the result moves the problem to `listen`, where the message depends on the operating system and is less clear for whoever configured the process.

Lesson 6 already gave you the tool: `leerEnteroPositivo(nombre, valor, predeterminado)`, which checks the format with a regular expression before converting, uses the default only when the variable is missing, and rejects a present but invalid value. Here it is added to `configuracion.ts` as is, and `leerPuerto` is built on top of it, adding the rule specific to ports: they cannot exceed 65535. The following figure brings the two functions together and tests them with five inputs, including the absence of the variable.

```ts
// fig08_03.ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return { ok: false, detalle: `${nombre} debe ser un entero positivo` };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return { ok: false, detalle: `${nombre} está fuera del rango seguro` };
  }

  return { ok: true, valor: numero };
}

function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}

const entradas: readonly (string | undefined)[] = [undefined, "8080", "65536", "0", "hola"];

for (const entrada of entradas) {
  const resultado = leerPuerto(entrada);
  const texto = resultado.ok ? `puerto ${resultado.valor}` : `rechazado: ${resultado.detalle}`;
  console.log(`PUERTO=${entrada} -> ${texto}`);
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_03.ts
$ node fig08_03.js
PUERTO=undefined -> puerto 3000
PUERTO=8080 -> puerto 8080
PUERTO=65536 -> rechazado: PUERTO debe estar entre 1 y 65535
PUERTO=0 -> rechazado: PUERTO debe ser un entero positivo
PUERTO=hola -> rechazado: PUERTO debe ser un entero positivo
```

Port `0`, which in `fig08_01` was useful because it asked the operating system for a free port, is rejected here: it is a testing tool, not a configuration, because a published service needs a predictable port where its clients can find it. The default value `3000` is an explicit decision of the project, not a special property of Node. It is valid to choose another value or to require that `PUERTO` exist, as long as the program communicates it and tests it. What matters is not letting a missing value turn by accident into an unknown behavior. The regular expression `^[1-9]\d*$` rejects spaces, signs, leading zeros, and decimals before converting; afterwards, `Number.isSafeInteger` confirms that the conversion produced an integer that is safely representable, and the range of ports completes the contract. Validating in layers can seem repetitive compared with a simple `parseInt`, but it avoids accepting ambiguous cases such as `3000texto`, which `parseInt` would partially convert to `3000`.

Inside the `revisor`, the server configuration is not mixed with the services configuration. The validated list of `Servicio` answers which targets are checked and with what `timeoutMs`; it lives in a file, `servicios.json`, and is read with `leerServicios` from lesson 6. The port answers where the API listens; it lives in an environment variable. Keeping the two concepts separate lets you change the port without touching the contract of each target and lets you reuse the check logic from a test without opening a TCP connection. And a rule you already know from lesson 6 remains in force: if something is missing or invalid, the program reports which variable failed without printing the rest of the environment, which could contain secrets.

### Log and graceful shutdown: operating is also part of the program

A log records facts that help answer operational questions: did the process start? Which request arrived? Which code was answered and how long did it take? When did it begin to shut down? Did it finish shutting down? It does not replace the HTTP response. The response is for the client that made a request; the log is for whoever operates the system and diagnoses problems later, and that is why it must never be mixed with what is answered to the client.

Messages must have structure and purpose. A text like `something happened` does not allow filtering or comparing events. A record with `evento` and `detalle`, written as a line of JSON, keeps a stable category and a human description, and any log analysis tool knows how to read it. In a larger service you would add level, request identifier, and more fields. And do not use the log to copy secrets, full request bodies, or authorization tokens: a log file usually circulates more than you imagine. For that reason the project records the `pathname` of each request and not the full URL, because the query (`?token=…`) is exactly where people put, without thinking, what should not end up written down.

Shutdown deserves the same attention as startup. Calling `servidor.close(...)` stops accepting new connections and notifies, through its *callback*, when the server has finished closing, that is, when no active connection remains. It does not mean that a request in progress vanishes at that instant: graceful shutdown lets what was already underway finish. If the process exits without waiting for that notice, you can cut a response in half or lose the last record.

In production, whoever stops your process is almost never a person typing a command: it is a supervisor (systemd, a container orchestrator, the `Ctrl+C` keypress in your terminal) that sends a **signal** to the process. `SIGTERM` means “finish when you can” and `SIGINT` is what `Ctrl+C` sends. If you do not listen for the signal, Node ends immediately, without closing anything. If you listen for it, you decide what to do before exiting.

The following figure demonstrates the complete sequence with a case that makes it visible. The server answers slowly, after 100 ms. The program launches a request, waits for the server to receive it, and then sends itself `SIGTERM` with `process.kill(process.pid, "SIGTERM")`. Notice the order of the records: shutdown begins while the request is still in progress, the client still receives its complete response, and only afterwards is `cerrado` written.

```ts
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
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_04.ts
$ node fig08_04.js
{"evento":"solicitud","detalle":"llegó; responderá en 100 ms"}
{"evento":"cierre","detalle":"SIGTERM recibida: no se aceptan conexiones nuevas"}
{"evento":"cliente","detalle":"recibió «terminé»"}
{"evento":"cerrado","detalle":"ya no queda ninguna solicitud en curso"}
```

The order of the records shows an important property: `cerrado` is written only after `await cerrar(servidor)`. Recording it earlier would be a false statement: the process could still be serving an active connection, or even fail to close. The small promise in `cerrar` adapts the *callback*-based API of `server.close` to the asynchronous form you already know from lesson 5.

The `cierre` variable deserves attention. Two different signals can arrive with little difference between them, for example a supervisor sending `SIGTERM` while someone presses `Ctrl+C` (`SIGINT`), and each would try to close the same server. The `??=` operator assigns the shutdown promise only if it does not yet exist, so the second signal reuses the shutdown in progress instead of starting another. In addition, the handler does not call `process.exit()`: that method ends the process instantly and would cut precisely what you have just shown must be waited for. When no pending work remains, Node ends by itself, with the corresponding exit code.

A note on `process.once`: it registers the handler for a single signal of each kind. If a second `SIGINT` arrived (a second `Ctrl+C`) after the first handler already ran, Node goes back to its default behavior and ends the process immediately. It is a reasonable emergency exit for whoever presses `Ctrl+C` twice because the graceful shutdown takes too long, and it also means that, for two signals of the same kind, the protection of `??=` is never exercised. If you prefer another policy, for example waiting a maximum number of seconds and then forcing the exit, that is a decision of the project, not a property of Node.

Inside the `revisor`, record edge events, not every internal detail of a pure function. `revisarTodos` can return states without knowing whether they will be printed, exposed over HTTP, or shown on a screen. `servidor.ts` does know that it handled `GET /api/estados`, which code it answered, and how long it took. That is the right layer for the request log. And a log is not an excuse to catch any exception and carry on as if nothing happened: if you cannot open the port because it is busy, record the problem with context and let the startup fail with a nonzero exit code.

### The assembled `revisor`: the API calls the real check

Now you put the pieces together, without turning the server into the owner of the check. The model and `revisarTodos` keep the contract of the previous lessons, without a single line changed. `servidor.ts` receives a function that obtains the report and another that records events, and does not know where they come from. `main.ts` is the only piece that knows all of them: it reads the port and the services file, builds the function that really queries, opens the port, and registers the signal handlers. This figure changes shape compared with the earlier isolated examples: the states are no longer a fixed list; they are produced by calling `revisarTodos` on each request.

**A real target: `consulta.ts`.** It is the first real implementation of the `Consultar` type from lesson 5. It receives a `Servicio` and an `AbortSignal`, requests the service's URL with `fetch`, measures how long it took with `performance.now()`, and returns the HTTP code and the duration. Two details matter. First, the signal it receives is the one `revisarTodos` created with `AbortSignal.timeout(servicio.timeoutMs)`: if the service does not respond in time, `fetch` aborts by itself, without `consulta.ts` having to schedule a timer. Second, after reading the status code, the function cancels the response body with `respuesta.body?.cancel()`: the `revisor` cares that the service responds, not about downloading its content, and leaving the body unread keeps the connection busy.

What changes compared with a naive `fetch` is how failures are translated. When `fetch` cannot connect, it throws a `TypeError` with the message “fetch failed” that, on its own, says nothing useful; the real reason travels in `error.cause`, and it is another `Error` with a `code` property such as `ECONNREFUSED`. The helper function `codigoDeRed` walks that chain with the checks you already know (`instanceof Error`, `"code" in ...`, `typeof ... === "string"`) and returns the code or `undefined`, without a single assertion. With it, `consultarConFetch` throws one of three short messages: “tiempo límite agotado” if the signal was aborted, “conexión rechazada” if the code was `ECONNREFUSED`, and “no se pudo conectar” in any other case. Each `throw` carries `{ cause: error }`, which attaches the original error to the new one: ESLint, with its recommended configuration, demands exactly that (rule `preserve-caught-error`), and it is right, because that way whoever debugs still has the real cause one step away, even if the API client only sees the short message.

**The services file: `archivo.ts`.** It is the disk boundary, as lesson 7 drew it: it reads `servicios.json`, converts the text to `unknown` with `JSON.parse`, and hands that value to `leerServicios`, which already existed. It returns a `Resultado`, so that a missing file, malformed JSON, and an invalid service all end up in the same place: a readable detail, not an exception with a trace that someone must decipher. Note that `JSON.parse` returns `any`, and that it is assigned to a variable declared `unknown`: that needs no assertion, and it forces `leerServicios` to verify what it receives.

**The server: `servidor.ts`.** Its shape is that of the earlier figures, hardened. `crearServidor(opciones)` returns a `Server` without making it listen. `atender` first answers on methods: if it is not `GET`, it replies `405` with the `allow: GET` header, which is the standard way to tell the client what it can do. Then it recognizes the route with a union and a `switch` whose `default` uses the `never` guard from lesson 3. In `/api/estados` it first awaits `obtenerReporte()` and only afterwards writes the response: if it did it the other way around, a failure halfway would leave a `200` already sent with a broken body. If the report fails, it records the technical cause in the log and answers a `500` with `{"detalle":"error interno"}`: the client receives something stable and safe, and whoever operates has the cause. `escuchar` wraps `listen` in a promise that is rejected if the server emits `error` (for example, `EADDRINUSE`, port busy); without that, the error would be emitted as an event with no handler and would bring down the process with a trace. `puertoDe` encapsulates the `address()` check you saw in `fig08_01`.

There is one line that deserves explanation: `void atender(...)` inside the `createServer` handler. `atender` is an `async` function and therefore returns a promise; Node's handler does not await it. The `void` operator declares that ignoring that promise is intentional. It is safe because `crearServidor` chains a `.catch(...)` to that promise: if `atender` fails for any reason it did not foresee, the error is recorded and the client receives a generic `500`. Without that `.catch`, an exception inside `atender` would be an unhandled rejected promise, and Node would terminate the whole process: a single client with a strange request would take the service down for everyone. The destination of a request is written by the client, and not every destination can be parsed: `curl --request-target "//"` sends one for which `new URL` throws `TypeError: Invalid URL`. That is why `rutaDe` catches that error and returns `"?"`, a marker that no real route can have (every parsed route starts with `/`): it falls into the `404` and the log shows that something unreadable arrived, instead of a blank route. A test sends exactly that request.

**The entry point: `main.ts`.** It is a composition, not a place for rules. It reads and validates the port; reads and validates the services; builds the server with an `obtenerReporte` function that calls `revisarTodos` with `consultarConFetch` and converts the result with `aReportePublico`; opens the port with `escuchar`; records `escuchando`; and connects `SIGTERM` and `SIGINT` to a graceful shutdown with the same shared promise as `fig08_04`. If any of that fails before the server opens the port, it records the event, sets `process.exitCode = 1`, and returns: the process ends by itself with an error code, without calling `process.exit()`. Note the order: first it validates and then it opens the port, never the other way around.

The tests stop being toys. `configuracion.test.ts` uses a table of cases, as in lesson 7, for `leerPuerto`. `contrato.test.ts` uses another for `esReportePublico`: a valid report and four ways of getting it wrong (`null`, `estados` that is not an array, an unknown `tipo`, and a `codigoHttp` that arrives as text). `reporte.test.ts` gains a test that the public report contains neither the URL nor the `timeoutMs`. And `servidor.test.ts` does what gives the most confidence, besides testing routes, methods, the `500` without leaking the internal detail, and the request with destination `//`, which must receive `404` without bringing down the process: it starts a real target server, with four behaviors (`/ok` answers 200, `/caido` answers 503, a closed port refuses the connection, and `/lento` never answers), starts the `revisor` server with the real `consultarConFetch`, makes a real `fetch` to `/api/estados`, and checks each outcome: available, failure by HTTP 503, failure by refused connection, and failure by timeout, the latter with a `timeoutMs` of 150 ms. Afterwards it checks what must not appear: not a single `url` in the JSON. Each test closes its servers in a `finally` block, so that a failed assertion does not leave the port open and the test process hanging.

The new or modified files are these. Those that do not change from lesson 7 appear at the end of the section, complete, so that the project is reproducible from start to finish.

```ts
// fig08_05/src/contrato.ts
import { esRegistro } from "./configuracion.js";

export type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
      readonly duracionMs: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

export interface ReportePublico {
  readonly estados: readonly EstadoPublico[];
}

function esEstadoPublico(valor: unknown): valor is EstadoPublico {
  if (!esRegistro(valor) || typeof valor.nombre !== "string") {
    return false;
  }

  if (valor.tipo === "disponible") {
    return typeof valor.codigoHttp === "number" && typeof valor.duracionMs === "number";
  }

  return valor.tipo === "falla" && typeof valor.detalle === "string";
}

export function esReportePublico(valor: unknown): valor is ReportePublico {
  return esRegistro(valor) && Array.isArray(valor.estados) && valor.estados.every(esEstadoPublico);
}
```
```ts
// fig08_05/src/bitacora.ts
export interface EntradaBitacora {
  readonly evento: string;
  readonly detalle: string;
}

export type Bitacora = (entrada: EntradaBitacora) => void;

export const bitacoraEnConsola: Bitacora = (entrada) => {
  console.log(JSON.stringify({ momento: new Date().toISOString(), ...entrada }));
};
```
```ts
// fig08_05/src/consulta.ts
import type { Consultar } from "./revisar.js";

function codigoDeRed(error: unknown): string | undefined {
  if (
    error instanceof Error &&
    error.cause instanceof Error &&
    "code" in error.cause &&
    typeof error.cause.code === "string"
  ) {
    return error.cause.code;
  }

  return undefined;
}

export const consultarConFetch: Consultar = async (servicio, senal) => {
  const inicio = performance.now();

  try {
    const respuesta = await fetch(servicio.url, { signal: senal });
    await respuesta.body?.cancel();

    return {
      codigoHttp: respuesta.status,
      duracionMs: Math.round(performance.now() - inicio),
    };
  } catch (error: unknown) {
    if (senal.aborted) {
      throw new Error("tiempo límite agotado", { cause: error });
    }

    if (codigoDeRed(error) === "ECONNREFUSED") {
      throw new Error("conexión rechazada", { cause: error });
    }

    throw new Error("no se pudo conectar", { cause: error });
  }
};
```
```ts
// fig08_05/src/archivo.ts
import { readFile } from "node:fs/promises";
import { leerServicios, type Resultado } from "./configuracion.js";
import type { Servicio } from "./modelo.js";

export async function leerServiciosDeArchivo(
  ruta: string,
): Promise<Resultado<readonly Servicio[]>> {
  let texto: string;

  try {
    texto = await readFile(ruta, "utf8");
  } catch {
    return { ok: false, detalle: `no se pudo leer ${ruta}` };
  }

  let documento: unknown;

  try {
    documento = JSON.parse(texto);
  } catch {
    return { ok: false, detalle: `${ruta} no contiene JSON válido` };
  }

  return leerServicios(documento);
}
```
```ts
// fig08_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";

export type ObtenerReporte = () => Promise<ReportePublico>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly registrar: Bitacora;
}

type Ruta =
  { readonly tipo: "salud" } | { readonly tipo: "estados" } | { readonly tipo: "no-encontrada" };

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
}

async function atender(
  solicitud: IncomingMessage,
  respuesta: ServerResponse,
  opciones: OpcionesServidor,
): Promise<void> {
  const inicio = performance.now();

  respuesta.once("finish", () => {
    const duracion = Math.round(performance.now() - inicio);

    opciones.registrar({
      evento: "solicitud",
      detalle: `${solicitud.method ?? "?"} ${rutaDe(solicitud.url)} ${respuesta.statusCode} ${duracion} ms`,
    });
  });

  if (solicitud.method !== "GET") {
    respuesta.setHeader("allow", "GET");
    enviarJson(respuesta, 405, { detalle: "método no permitido" });
    return;
  }

  const ruta = reconocerRuta(solicitud.url);

  switch (ruta.tipo) {
    case "salud":
      respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      respuesta.end("ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        opciones.registrar({
          evento: "error",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        });
        enviarJson(respuesta, 500, { detalle: "error interno" });
      }
      return;
    case "no-encontrada":
      enviarJson(respuesta, 404, { detalle: "ruta no encontrada" });
      return;
    default: {
      const sinAtender: never = ruta;
      throw new Error(`ruta sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function crearServidor(opciones: OpcionesServidor): Server {
  return createServer((solicitud, respuesta) => {
    atender(solicitud, respuesta, opciones).catch((error: unknown) => {
      opciones.registrar({
        evento: "error",
        detalle: error instanceof Error ? error.message : "falla desconocida",
      });

      if (respuesta.headersSent) {
        respuesta.end();
      } else {
        enviarJson(respuesta, 500, { detalle: "error interno" });
      }
    });
  });
}

export function escuchar(servidor: Server, puerto: number): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(puerto, "127.0.0.1", () => {
      servidor.off("error", reject);
      resolve();
    });
  });
}

export function cerrar(servidor: Server): Promise<void> {
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

export function puertoDe(servidor: Server): number {
  const direccion = servidor.address();

  if (direccion === null || typeof direccion === "string") {
    throw new Error("el servidor no escucha en un puerto TCP");
  }

  return direccion.port;
}
```
```ts
// fig08_05/src/main.ts
import { leerServiciosDeArchivo } from "./archivo.js";
import { bitacoraEnConsola as registrar } from "./bitacora.js";
import { leerPuerto } from "./configuracion.js";
import { consultarConFetch } from "./consulta.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

function fallarArranque(evento: string, detalle: string): void {
  registrar({ evento, detalle });
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const puerto = leerPuerto(process.env.PUERTO);

  if (!puerto.ok) {
    fallarArranque("configuracion-invalida", puerto.detalle);
    return;
  }

  const servicios = await leerServiciosDeArchivo("servicios.json");

  if (!servicios.ok) {
    fallarArranque("configuracion-invalida", servicios.detalle);
    return;
  }

  const servidor = crearServidor({
    obtenerReporte: async () =>
      aReportePublico(await revisarTodos(servicios.valor, consultarConFetch)),
    registrar,
  });

  try {
    await escuchar(servidor, puerto.valor);
  } catch (error: unknown) {
    fallarArranque(
      "arranque-fallido",
      error instanceof Error ? error.message : "falla desconocida",
    );
    return;
  }

  registrar({ evento: "escuchando", detalle: `http://127.0.0.1:${puertoDe(servidor)}` });

  let cierre: Promise<void> | undefined;

  const detener = (senal: string): void => {
    cierre ??= (async () => {
      registrar({ evento: "cierre", detalle: `${senal} recibida` });
      await cerrar(servidor);
      registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
    })().catch((error: unknown) => {
      fallarArranque(
        "cierre-fallido",
        error instanceof Error ? error.message : "falla desconocida",
      );
    });
  };

  process.once("SIGTERM", () => detener("SIGTERM"));
  process.once("SIGINT", () => detener("SIGINT"));
}

await main();
```
`configuracion.ts` keeps `leerServicios` from lesson 7 and gains three things: `esRegistro` is now exported (`contrato.ts` uses it), and `leerEnteroPositivo` and `leerPuerto` are added. `reporte.ts` keeps `lineaReporte` and gains `aReportePublico`.

```ts
// fig08_05/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

export function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "cada servicio debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (
    typeof nombre !== "string" ||
    nombre.trim() === "" ||
    typeof url !== "string" ||
    url.trim() === "" ||
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "servicio incompleto o inválido" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

export function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return { ok: false, detalle: `servicio ${indice + 1}: ${resultado.detalle}` };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}

export function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return { ok: false, detalle: `${nombre} debe ser un entero positivo` };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return { ok: false, detalle: `${nombre} está fuera del rango seguro` };
  }

  return { ok: true, valor: numero };
}

export function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}
```
```ts
// fig08_05/src/reporte.ts
import type { EstadoPublico, ReportePublico } from "./contrato.js";
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

function aEstadoPublico(estado: Estado): EstadoPublico {
  if (estado.tipo === "disponible") {
    return {
      nombre: estado.servicio.nombre,
      tipo: "disponible",
      codigoHttp: estado.codigoHttp,
      duracionMs: estado.duracionMs,
    };
  }

  return { nombre: estado.servicio.nombre, tipo: "falla", detalle: estado.detalle };
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  return { estados: estados.map(aEstadoPublico) };
}
```
The four tests of the project:

```ts
// fig08_05/src/configuracion.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { leerPuerto } from "./configuracion.js";

const casos: readonly {
  readonly nombre: string;
  readonly entrada: string | undefined;
  readonly esperado: ReturnType<typeof leerPuerto>;
}[] = [
  { nombre: "sin variable usa 3000", entrada: undefined, esperado: { ok: true, valor: 3000 } },
  { nombre: "un puerto válido", entrada: "8080", esperado: { ok: true, valor: 8080 } },
  { nombre: "65535 es el límite", entrada: "65535", esperado: { ok: true, valor: 65535 } },
  {
    nombre: "65536 se pasa del límite",
    entrada: "65536",
    esperado: { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" },
  },
  {
    nombre: "0 no es un puerto",
    entrada: "0",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "un decimal se rechaza",
    entrada: "12.5",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "texto se rechaza",
    entrada: "hola",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
  {
    nombre: "la cadena vacía se rechaza",
    entrada: "",
    esperado: { ok: false, detalle: "PUERTO debe ser un entero positivo" },
  },
];

for (const caso of casos) {
  test(`leerPuerto: ${caso.nombre}`, () => {
    assert.deepEqual(leerPuerto(caso.entrada), caso.esperado);
  });
}
```
```ts
// fig08_05/src/contrato.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { esReportePublico } from "./contrato.js";

const casos: readonly {
  readonly nombre: string;
  readonly valor: unknown;
  readonly valido: boolean;
}[] = [
  {
    nombre: "un reporte con las dos variantes",
    valor: {
      estados: [
        { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
        { nombre: "pagos", tipo: "falla", detalle: "tiempo límite agotado" },
      ],
    },
    valido: true,
  },
  { nombre: "null", valor: null, valido: false },
  { nombre: "estados no es un arreglo", valor: { estados: "ninguno" }, valido: false },
  {
    nombre: "un estado con un tipo desconocido",
    valor: { estados: [{ nombre: "pagos", tipo: "pendiente" }] },
    valido: false,
  },
  {
    nombre: "codigoHttp llega como texto",
    valor: {
      estados: [{ nombre: "pagos", tipo: "disponible", codigoHttp: "200", duracionMs: 42 }],
    },
    valido: false,
  },
];

for (const caso of casos) {
  test(`esReportePublico: ${caso.nombre}`, () => {
    assert.equal(esReportePublico(caso.valor), caso.valido);
  });
}
```
```ts
// fig08_05/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { Estado } from "./modelo.js";
import { aReportePublico, lineaReporte } from "./reporte.js";

const servicio = { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 };

test("disponible conserva código y duración", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "disponible", codigoHttp: 204, duracionMs: 18 }),
    "catálogo: HTTP 204 en 18 ms",
  );
});

test("falla conserva detalle", () => {
  assert.equal(
    lineaReporte({ servicio, tipo: "falla", detalle: "conexión rechazada" }),
    "catálogo: falla (conexión rechazada)",
  );
});

test("el reporte público no publica la URL ni el tiempo límite", () => {
  const estados: readonly Estado[] = [
    { servicio, tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { servicio, tipo: "falla", detalle: "tiempo límite agotado" },
  ];

  assert.deepEqual(aReportePublico(estados), {
    estados: [
      { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
      { nombre: "catálogo", tipo: "falla", detalle: "tiempo límite agotado" },
    ],
  });
});
```
```ts
// fig08_05/src/servidor.test.ts
import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import test from "node:test";
import type { EntradaBitacora } from "./bitacora.js";
import { esReportePublico } from "./contrato.js";
import { consultarConFetch } from "./consulta.js";
import type { Servicio } from "./modelo.js";
import { aReportePublico } from "./reporte.js";
import { revisarTodos } from "./revisar.js";
import { cerrar, crearServidor, escuchar, puertoDe } from "./servidor.js";

async function destino(): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((solicitud, respuesta) => {
    if (solicitud.url === "/ok") {
      respuesta.writeHead(200).end("ok");
    } else if (solicitud.url === "/caido") {
      respuesta.writeHead(503).end("caído");
    }
    // /lento nunca responde: sirve para provocar el tiempo límite.
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

async function puertoCerrado(): Promise<number> {
  const servidor = createServer();
  await escuchar(servidor, 0);
  const puerto = puertoDe(servidor);
  await cerrar(servidor);
  return puerto;
}

test("GET /api/estados revisa destinos reales y publica el reporte", async () => {
  const { servidor: remoto, base } = await destino();
  const sinServicio = await puertoCerrado();
  const servicios: readonly Servicio[] = [
    { nombre: "catálogo", url: `${base}/ok`, timeoutMs: 1500 },
    { nombre: "pagos", url: `${base}/caido`, timeoutMs: 1500 },
    { nombre: "inventario", url: `http://127.0.0.1:${sinServicio}/`, timeoutMs: 1500 },
    { nombre: "reportes", url: `${base}/lento`, timeoutMs: 150 },
  ];
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => aReportePublico(await revisarTodos(servicios, consultarConFetch)),
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);

  try {
    const respuesta = await fetch(`http://127.0.0.1:${puertoDe(api)}/api/estados?orden=nombre`);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("content-type"), "application/json; charset=utf-8");

    const cuerpo: unknown = await respuesta.json();
    assert.ok(esReportePublico(cuerpo));
    assert.deepEqual(
      cuerpo.estados.map((estado) =>
        estado.tipo === "falla"
          ? [estado.nombre, estado.detalle]
          : [estado.nombre, estado.codigoHttp],
      ),
      [
        ["catálogo", 200],
        ["pagos", "HTTP 503"],
        ["inventario", "conexión rechazada"],
        ["reportes", "tiempo límite agotado"],
      ],
    );
    assert.equal(JSON.stringify(cuerpo).includes("url"), false);
    assert.match(entradas[0]?.detalle ?? "", /^GET \/api\/estados 200 \d+ ms$/);
  } finally {
    await cerrar(api);
    remoto.closeAllConnections();
    await cerrar(remoto);
  }
});

test("las rutas desconocidas, los métodos y los errores internos responden con su código", async () => {
  const entradas: EntradaBitacora[] = [];
  const api = crearServidor({
    obtenerReporte: async () => {
      throw new Error("detalle interno que no debe salir");
    },
    registrar: (entrada) => entradas.push(entrada),
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const salud = await fetch(`${base}/salud`);
    assert.equal(salud.status, 200);
    assert.equal(await salud.text(), "ok");

    const desconocida = await fetch(`${base}/api/no-existe`);
    assert.equal(desconocida.status, 404);
    assert.deepEqual(await desconocida.json(), { detalle: "ruta no encontrada" });

    const metodo = await fetch(`${base}/api/estados`, { method: "POST" });
    assert.equal(metodo.status, 405);
    assert.equal(metodo.headers.get("allow"), "GET");
    await metodo.body?.cancel();

    const interno = await fetch(`${base}/api/estados`);
    assert.equal(interno.status, 500);
    assert.deepEqual(await interno.json(), { detalle: "error interno" });
    assert.ok(entradas.some((entrada) => entrada.detalle === "detalle interno que no debe salir"));
  } finally {
    await cerrar(api);
  }
});

test("una ruta que no se puede analizar responde 404 y no derriba el servidor", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    registrar: () => {},
  });
  await escuchar(api, 0);
  const puerto = puertoDe(api);

  try {
    const codigo = await new Promise<number>((resolve, reject) => {
      const solicitud = request({ host: "127.0.0.1", port: puerto, path: "//" }, (respuesta) => {
        respuesta.resume();
        resolve(respuesta.statusCode ?? 0);
      });
      solicitud.on("error", reject);
      solicitud.end();
    });

    assert.equal(codigo, 404);
    assert.equal((await fetch(`http://127.0.0.1:${puerto}/salud`)).status, 200);
  } finally {
    await cerrar(api);
  }
});
```
The `servicios.json` file describes the targets that the program checks when you start it by hand. All three exist: the first and the second are public sites (without an internet connection you will see “no se pudo conectar” failures on them, and that is expected), and the third points to a port on your own machine where nobody listens, to see a failure without depending on anyone.

```json fig08_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
And the files that do not change from lesson 7: the npm and TypeScript configuration, ESLint and Prettier, the model, and the `revisarTodos` coordinator.

```json fig08_05/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24",
    "@typescript/native": "npm:typescript@^7.0.2",
    "eslint": "10.11.0",
    "prettier": "3.9.9",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```
```json fig08_05/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```
```js fig08_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```
```json fig08_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```ts
// fig08_05/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
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
```
```ts
// fig08_05/src/revisar.ts
import type { Estado, Servicio } from "./modelo.js";

export type Respuesta = { readonly codigoHttp: number; readonly duracionMs: number };
export type Consultar = (servicio: Servicio, senal: AbortSignal) => Promise<Respuesta>;

export async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<readonly Estado[]> {
  return Promise.all(
    servicios.map(async (servicio) => {
      try {
        const respuesta = await consultar(servicio, AbortSignal.timeout(servicio.timeoutMs));

        if (respuesta.codigoHttp >= 200 && respuesta.codigoHttp < 300) {
          return { servicio, tipo: "disponible", ...respuesta };
        }

        return { servicio, tipo: "falla", detalle: `HTTP ${respuesta.codigoHttp}` };
      } catch (error: unknown) {
        return {
          servicio,
          tipo: "falla",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        };
      }
    }),
  );
}
```
```bash
$ cd fig08_05
$ npm run verificar
> verificar
> tsc --noEmit
$ npm run lint
> lint
> eslint src
$ npm run formato
> formato
> prettier --check src

Checking formatting...
All matched files use Prettier code style!
$ npm run probar
> probar
> npm run compilar && node --test "dist/**/*.test.js"


> compilar
> tsc

✔ leerPuerto: sin variable usa 3000 (0.638417ms)
✔ leerPuerto: un puerto válido (0.069958ms)
✔ leerPuerto: 65535 es el límite (0.187208ms)
✔ leerPuerto: 65536 se pasa del límite (0.0895ms)
✔ leerPuerto: 0 no es un puerto (0.048708ms)
✔ leerPuerto: un decimal se rechaza (0.033125ms)
✔ leerPuerto: texto se rechaza (0.044541ms)
✔ leerPuerto: la cadena vacía se rechaza (0.030416ms)
✔ esReportePublico: un reporte con las dos variantes (0.406375ms)
✔ esReportePublico: null (0.301167ms)
✔ esReportePublico: estados no es un arreglo (0.160583ms)
✔ esReportePublico: un estado con un tipo desconocido (0.798917ms)
✔ esReportePublico: codigoHttp llega como texto (0.062ms)
✔ disponible conserva código y duración (0.435ms)
✔ falla conserva detalle (0.072583ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.337458ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (165.446042ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (4.957833ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (3.789583ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 239.299834
```

That block demonstrates two different limits. `npm run verificar` confirms the static contracts of all the modules; `npm run probar` compiles and then runs a real HTTP request, against real targets. No `fetch` in the tests is a simulation: Node opens local sockets, the client receives responses, the 150 ms timeout really expires, and the shutdown waits for the servers to stop listening.

You have not yet seen the program running. Compile it and start it on port 3100 (if you do not set `PUERTO`, it will use 3000). These blocks are a sample run in your terminal; the durations and times will be different in yours.

```text
$ npm run compilar
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:54:27.333Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

In another terminal:

```text
$ curl -i http://127.0.0.1:3100/salud
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

ok
$ curl http://127.0.0.1:3100/api/estados
{"estados":[{"nombre":"ejemplo","tipo":"disponible","codigoHttp":200,"duracionMs":190},{"nombre":"node","tipo":"disponible","codigoHttp":200,"duracionMs":405},{"nombre":"local-apagado","tipo":"falla","detalle":"conexión rechazada"}]}
$ curl -i http://127.0.0.1:3100/nada
HTTP/1.1 404 Not Found
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"ruta no encontrada"}
$ curl -i -X POST http://127.0.0.1:3100/api/estados
HTTP/1.1 405 Method Not Allowed
allow: GET
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"método no permitido"}
```

Go back to the first terminal and press `Ctrl+C`. The log tells the whole story, and the last pair of lines is the graceful shutdown:

```text
{"momento":"2026-10-02T20:54:28.533Z","evento":"solicitud","detalle":"GET /salud 200 2 ms"}
{"momento":"2026-10-02T20:54:28.964Z","evento":"solicitud","detalle":"GET /api/estados 200 418 ms"}
{"momento":"2026-10-02T20:54:28.978Z","evento":"solicitud","detalle":"GET /nada 404 0 ms"}
{"momento":"2026-10-02T20:54:28.992Z","evento":"solicitud","detalle":"POST /api/estados 405 0 ms"}
{"momento":"2026-10-02T20:54:28.993Z","evento":"cierre","detalle":"SIGINT recibida"}
{"momento":"2026-10-02T20:54:28.994Z","evento":"cerrado","detalle":"el servidor dejó de aceptar conexiones"}
```

Two things are worth observing. The first: `GET /api/estados` took 418 ms, barely more than the slowest target (405 ms) and much less than the sum of the three; that is the concurrency of lesson 5 doing its work over HTTP. The second: every `GET /api/estados` fires all the queries again. It is the simplest decision, the right one to start with, and it has a cost that you will see in “What gets done wrong”.

## The error you will see

The first kind of error appears when you declare correct internal routes, but call a function with a route that does not belong to the union. With TypeScript 7.0.2, `tsc` reports TS2345 at the call to `atender`.

```ts
// fig08_06.ts
type Ruta = "/salud" | "/api/estados";

function atender(ruta: Ruta): void {
  console.log(ruta);
}

atender("/api/estado");
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig08_06.ts
fig08_06.ts(8,9): error TS2345: Argument of type '"/api/estado"' is not assignable to parameter of type 'Ruta'.
```

TS2345 indicates that the argument of a call does not meet the contract of the parameter. Here it does not mean that TypeScript has a spelling preference: it reveals a pending decision. If the correct public route is `/api/estados`, fix the call. If you really need a singular route, add it to `Ruta`, teach `reconocerRuta` how to identify it, and define which response it produces. Do not solve the problem with `as Ruta`; that assertion silences precisely the check that prevents routes that are declared but not implemented.

Another frequent diagnostic appears because `IncomingMessage.url` can be `undefined`. Although normal HTTP requests have a URL, Node's type allows its absence and the handler must have an explicit policy.

```ts
// fig08_07.ts
import { createServer } from "node:http";

createServer((solicitud, respuesta) => {
  respuesta.end(solicitud.url.toUpperCase());
});
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_07.ts
fig08_07.ts(5,17): error TS18048: 'solicitud.url' is possibly 'undefined'.
```

TS18048 appears when you try to use a value that may be missing. The fix is not to write `solicitud.url!`, because that only promises the compiler that you know something the program did not check. Decide what the API must do when it is absent. To recognize a route, `solicitud.url ?? "/"` offers a default root, which is what `rutaDe` does in the project. If the URL is mandatory for a particular operation, you can answer `400` and end the request. The choice depends on the contract, but it must exist before using string methods such as `toUpperCase`.

There is a third error that is not the compiler's but Node's, and you will see it soon: starting the server on a port that another process already occupies. Without error handling, Node ends with a trace of `Error: listen EADDRINUSE`. In the project, `escuchar` converts that event into a rejection of the promise, and `main.ts` records it and exits with code 1. To provoke it, start two copies on the same port; the second prints:

```text
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:41:59.411Z","evento":"arranque-fallido","detalle":"listen EADDRINUSE: address already in use 127.0.0.1:3100"}
```

`EADDRINUSE` means the port already has an owner: it is almost always an earlier copy of your own program that you did not close. Before changing the code, look for who is listening on that port (`lsof -i :3100` on Linux) or use another port with `PUERTO=3101`.

## What gets done wrong

- **Opening the server before validating the configuration.** If you call `listen` and then discover that `PUERTO` or the list of services is invalid, the process may be left visible and half-done. Validate the external inputs first; open the port only when the program knows which contract it will work with.

- **Using `solicitud.url as Ruta`.** An assertion does not parse the request or block foreign routes. It only removes the static protection. Convert the external text through a function like `reconocerRuta` and answer `404` when there is no valid alternative.

- **Answering JSON without a `content-type` header.** Some clients will be able to interpret the body anyway, but others will have no reliable signal about how to read it. The representation and its header form a single HTTP contract.

- **Answering `200` for route or configuration errors.** A body that says “error” with code `200` forces the dashboard and other integrations to interpret phrases. Use HTTP codes for the general category and reserve the body for the detail the client needs.

- **Serializing the internal model as the response.** `JSON.stringify(estados)` is one line and works, but it publishes the URL and the timeout of each service, and ties every change in the model to a change in the API. Build the public object field by field.

- **Trusting that `new URL` never fails.** The destination of a request is written by the client, and `new URL("//", base)` throws `TypeError: Invalid URL`. An exception that nobody catches in an asynchronous handler ends the process. Catch the error when parsing and answer `404` or `400`, and chain a `.catch` to the handler's promise as a last safety net.

- **Writing the response before waiting for the result.** If you call `writeHead(200, ...)` and then `await` work that can fail, you can no longer change the code to `500`: the `200` has gone out. Wait first, answer afterwards.

- **Putting the services query inside each request's handler without a policy.** If every `GET /api/estados` fires all the remote queries, ten people opening the dashboard multiply the traffic toward your services and get different reports. It is acceptable to start with; in production, decide deliberately whether the API checks on demand, keeps a recent report for a few seconds, or runs scheduled checks.

- **Recording secrets or the full URL of each request.** Logs must serve to operate, not become a permanent copy of sensitive data. Record method, path without query, code, and duration; remove or mask credentials, tokens, and private data.

- **Calling `process.exit()` upon receiving a signal.** The process ends immediately and can cut requests, writes, and records. First start `server.close`, wait for it to finish, and let the process end naturally when no pending work remains.

- **Catching all errors and always answering the same technical detail.** The client needs a stable and safe response; the log needs context to diagnose. Separate the two audiences: a `500` can say `{"detalle":"error interno"}` while the record keeps the technical error.

## Exercises

### Exercise 1 — Version route

Add the route `GET /version` to the project's typed route recognition. It must answer `200`, a text header, and the body `revisor 1`. Keep `404` for any other route, and verify that the compiler points out the `switch` until you handle the new branch. Verify both responses with a test that uses a server on port `0`.

### Exercise 2 — A report with a summary

Add to `ReportePublico` a field `resumen: { disponibles: number; fallas: number }` and compute it in `aReportePublico`. Update the test in `reporte.test.ts` so that it checks it, and run `npm run verificar` to see which other files the compiler forces you to touch. Explain why `esReportePublico` must also change.

### Exercise 3 — One more environment variable

Add `REVISOR_MAX_SERVICIOS` (default 20) with `leerEnteroPositivo` and make `main.ts` refuse to start, with `configuracion-invalida`, if `servicios.json` has more services than that limit. Write a table-driven test for the rule.

### Exercise 4 — Shutdown with a time limit

A shutdown that waits for a request that never ends leaves the process hanging. Modify `detener` in `main.ts` so that, if `cerrar(servidor)` does not finish in 10 seconds, it records the event `cierre-forzado` and calls `servidor.closeAllConnections()`. Check your change by starting the `revisor`, making a `curl` to a slow target, and sending `SIGTERM`.

## Solutions

### Solution 1

The new route must appear both in the type and in the function that converts the external text, and that function keeps going through `rutaDe`: calling `new URL` directly would reintroduce the defect of requests with destination `//`. Leaving it in only one of the two places would produce an incomplete contract: the union would say that it exists, but no request could reach it, or a request would reach a branch that TypeScript does not recognize as part of the design. With the `never` guard of the `switch`, forgetting the branch is a compile error (TS2322) and not an oversight discovered in production.

```ts
type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "version" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/version":
      return { tipo: "version" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}
```

In `atender`, add `case "version":` with the same pattern as `salud`: `respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" })`, `respuesta.end("revisor 1")`, and `return`. The test, in `servidor.test.ts`, also checks that a different route receives `404`; testing only the successful path does not confirm that the server keeps the boundary between known and unknown routes.

```ts
test("GET /version responde el texto y una ruta parecida sigue en 404", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const version = await fetch(`${base}/version`);
    assert.equal(version.status, 200);
    assert.equal(version.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await version.text(), "revisor 1");

    const parecida = await fetch(`${base}/version/otra`);
    assert.equal(parecida.status, 404);
    await parecida.body?.cancel();
  } finally {
    await cerrar(api);
  }
});
```

### Solution 2

The type change and the computation live together, and the compiler does the rest of the work: every place that builds a `ReportePublico` without `resumen` stops compiling.

```ts
export interface ReportePublico {
  readonly resumen: { readonly disponibles: number; readonly fallas: number };
  readonly estados: readonly EstadoPublico[];
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  const publicos = estados.map(aEstadoPublico);
  const disponibles = publicos.filter((estado) => estado.tipo === "disponible").length;

  return {
    resumen: { disponibles, fallas: publicos.length - disponibles },
    estados: publicos,
  };
}
```

Here `aEstadoPublico` is the function that converts a single `Estado`, the one that was previously written inside the `map`. `esReportePublico` must also check `resumen`, because its job is to describe at runtime exactly what the type promises at compile time; if you only change the type, the guard would accept responses that the type no longer admits, and the dashboard of lesson 9 would compile against a contract that nobody verifies.

### Solution 3

Reading the limit is one more environment input and is treated like the port: a small function, a `Resultado`, and `main.ts` decides what to do with the failure.

```ts
const maximo = leerEnteroPositivo("REVISOR_MAX_SERVICIOS", process.env.REVISOR_MAX_SERVICIOS, 20);

if (!maximo.ok) {
  fallarArranque("configuracion-invalida", maximo.detalle);
  return;
}

if (servicios.valor.length > maximo.valor) {
  fallarArranque(
    "configuracion-invalida",
    `servicios.json trae ${servicios.valor.length} servicios y el máximo es ${maximo.valor}`,
  );
  return;
}
```

The rule “more services than the maximum” is pure: it is worth extracting it into a function `validarCantidad(servicios, maximo): Resultado<readonly Servicio[]>` in `configuracion.ts` and testing it with a table (0, 1, the maximum, the maximum plus one), which is where boundary errors live, instead of testing it through `main.ts`.

### Solution 4

It is a race between two promises: the graceful shutdown and a timer. If the timer wins, the connections that remain open are closed by force; that makes `server.close` finish.

```ts
const detener = (senal: string): void => {
  cierre ??= (async () => {
    registrar({ evento: "cierre", detalle: `${senal} recibida` });

    const limite = setTimeout(() => {
      registrar({ evento: "cierre-forzado", detalle: "pasaron 10 s con solicitudes abiertas" });
      servidor.closeAllConnections();
    }, 10_000);

    try {
      await cerrar(servidor);
    } finally {
      clearTimeout(limite);
    }

    registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
  })();
};
```

The `.catch(...)` that `main.ts` chains at the end of the expression is kept as is; it is omitted here to show only what changes. The `finally` cancels the timer when the shutdown did finish in time: without it, the timer would keep the process alive ten more seconds even though it was no longer needed. `closeAllConnections()` cuts requests in progress, so it is a last resort, and that is why it is recorded as its own event: whoever reads the log must be able to tell a clean shutdown from a forced one.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2` inside `~/proyectos/revisor`.
- [ ] In the `figuras/` folder, `fig08_01.ts` compiles with `--types node`, prints `200 ok`, and the process ends by itself after closing its server.
- [ ] `fig08_03.ts` rejects `65536`, `0`, and `hola` with a detail that names the variable `PUERTO`, and accepts the absence with `3000`.
- [ ] `fig08_04.ts` prints `cierre` before `cliente` and `cerrado` at the end; the request in progress receives its response.
- [ ] When compiling the route figure with `/api/estado`, TS2345 appears; when compiling the `solicitud.url` figure, TS18048 appears.
- [ ] In the project, `npm run verificar`, `npm run lint`, and `npm run formato` finish without warnings, and `npm run probar` reports 19 passing tests and 0 failing.
- [ ] `PUERTO=3100 npm run arrancar` records `escuchando`; `curl http://127.0.0.1:3100/api/estados` returns JSON with `nombre` and `tipo` per service and without `url`; `Ctrl+C` records `cierre` and `cerrado`.
- [ ] `PUERTO=hola npm run arrancar` ends with exit code 1 and the event `configuracion-invalida`, without opening any port.

## Further reading

- [Node.js: HTTP](https://nodejs.org/api/http.html) — official documentation of `createServer`, requests, responses, `listen`, and `close`; accessed on October 2, 2026.

- [Node.js: Process](https://nodejs.org/api/process.html) — official documentation on process signals, `SIGTERM`, and the lifecycle of Node; accessed on October 2, 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — official documentation on narrowing discriminated unions, checks of optional values, and exhaustiveness with `never`; accessed on October 2, 2026.

- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) — reference on HTTP status codes and their meaning for clients and servers; accessed on October 2, 2026.
