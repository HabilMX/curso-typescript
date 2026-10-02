# Lección 8 — El servidor

**Tiempo:** 2 × 45 min

**Qué construyes:** la API HTTP del `revisor`

**Qué aprendes:** servidor HTTP, rutas tipadas, JSON, configuración, bitácora, cierre ordenado

## Al terminar vas a poder

- Crear un servidor HTTP de Node que escuche conexiones, responda una solicitud y se cierre sin dejar recursos abiertos.
- Modelar las rutas conocidas como una unión de TypeScript y responder de forma explícita los caminos que no existen y los métodos que no admites.
- Enviar respuestas JSON con el código de estado y el encabezado `content-type` correctos, y publicar un contrato que no filtre datos internos.
- Leer la variable de entorno `PUERTO` como texto no confiable y validarla antes de entregársela al servidor.
- Registrar eventos operativos sin mezclar la bitácora con las reglas de negocio ni con las respuestas al cliente.
- Cerrar el servidor de forma ordenada al recibir `SIGTERM` o `SIGINT`, esperando las solicitudes que ya estaban en curso.
- Ensamblar el `revisor` de las lecciones anteriores en un proceso que consulta destinos reales y responde `GET /api/estados`.

## El porqué antes del cómo

Hasta la lección anterior, el `revisor` ya sabe hacer trabajo útil. Tiene un modelo `Servicio`, representa cada desenlace con una unión discriminada `Estado`, consulta varios destinos a la vez con `revisarTodos`, valida su configuración antes de usarla y está organizado en módulos con pruebas. Pero todo eso vive dentro de un proceso que tú arrancas y lees desde la terminal. Es útil para desarrollar, y tiene una limitación importante: cualquier otro programa que quiera conocer el reporte tendría que ejecutar el `revisor` por su cuenta, interpretar texto pensado para personas o importar módulos internos de un proyecto ajeno.

Una API HTTP cambia esa frontera. En vez de pedirle a cada consumidor que sepa leer archivos, lanzar consultas y ordenar resultados, el proceso del `revisor` conserva esa responsabilidad y ofrece una operación pública: «dame el estado actual». Una **API** (interfaz de programación de aplicaciones) es justamente eso: un conjunto de operaciones que un programa ofrece a otros programas, con un contrato que dice qué se puede pedir y qué se recibe a cambio. Un panel web, el de la lección 9, podrá solicitar esa información desde un navegador. También podría hacerlo una alerta, una integración de despliegue o una herramienta de soporte. La API no reemplaza la lógica que ya construiste: la coloca detrás de una puerta con un contrato visible.

HTTP es una conversación sencilla entre dos participantes. Un cliente envía una solicitud con un método (`GET`, `POST`…), una ruta, encabezados y, a veces, un cuerpo. El servidor decide cómo atenderla y devuelve una respuesta con un código de estado, encabezados y un cuerpo. En el caso más pequeño, un cliente solicita `GET /salud`, el servidor responde `200` y el cuerpo `ok`. En el caso del `revisor`, un cliente solicitará `GET /api/estados` y recibirá JSON con el resultado de revisar todos los servicios en ese momento.

La palabra «servidor» puede parecer más grande de lo que es. No necesitas una cuenta, un servicio externo ni una biblioteca adicional para empezar: Node incluye el módulo `node:http`, que acepta conexiones TCP, las convierte en objetos de solicitud y respuesta y ejecuta una función por cada petición. Un marco web puede ahorrar código cuando un proyecto tiene muchas rutas, validadores y *middleware* (funciones intermedias que procesan una solicitud antes o después del manejador final), pero conviene entender primero el contrato básico que ese marco administra. Si no sabes cuándo se escribe un encabezado, qué ocurre con una ruta desconocida o cómo se cierra el proceso, cambiar de sintaxis no elimina el problema; sólo lo esconde.

También conviene distinguir dos direcciones de comunicación. La lección 5 dejó preparado el tipo `Consultar`, que describe cómo el `revisor` pregunta por un servicio ajeno; en esta lección escribirás la primera implementación real de ese tipo, con `fetch`. Y el `revisor` será, además, servidor HTTP para sus propios consumidores. Ambos roles usan códigos HTTP, URL y cuerpos de respuesta, pero sus responsabilidades son opuestas. Como cliente, el `revisor` traduce respuestas remotas y fallas de red a un `Estado`. Como servidor, traduce sus `Estado` internos a una respuesta estable que otras personas y programas puedan consumir sin conocer sus tripas.

El tipo de TypeScript ayuda especialmente en esta capa porque una API reúne varias decisiones pequeñas que en JavaScript suelen quedar implícitas. ¿Qué rutas existen? ¿Qué forma tiene la respuesta de cada una? ¿Qué configuración es válida para arrancar? ¿Qué eventos se registran? ¿Qué ocurre al recibir una señal de cierre? Un tipo no detiene una conexión ni protege por sí solo el puerto de un proceso, pero vuelve visibles los contratos que debes mantener mientras el programa crece.

El servidor tampoco debe convertirse en una segunda aplicación que duplica todo. La validación de archivos sigue perteneciendo a `configuracion.ts`. La consulta concurrente sigue perteneciendo a `revisar.ts`. La presentación para personas sigue perteneciendo a `reporte.ts`. El servidor es una capa exterior: interpreta una solicitud, llama a las funciones del dominio y adapta el resultado a HTTP. Esa separación permite que una misma revisión alimente la API, la consola y el panel sin que cada consumidor reinvente las reglas de disponibilidad.

Go ofrece una comparación útil. Con `net/http`, Go también permite registrar una función que atiende solicitudes y arrancar un servidor desde la biblioteca estándar. Node sigue una idea semejante: un proceso escucha, una función recibe solicitud y respuesta, y el programa decide rutas, códigos y cierre. La diferencia está en cómo se expresa la espera. En Go es común que una función de cierre devuelva un `error`; en Node muchas operaciones de red se expresan con eventos o *callbacks* que tú envuelves en una promesa para poder usar `await`, como harás en esta lección.

Antes de escribir rutas, adopta una idea operativa: un servidor no es una función que «termina y ya». Vive mientras escucha conexiones, así que sus límites importan más que en un programa corto. Debe tener configuración validada antes de abrir el puerto, registrar los acontecimientos que ayudan a diagnosticarlo y cerrarse de manera deliberada cuando el sistema necesita detenerlo. Si esas decisiones se dejan para el final, aparecen como procesos que no terminan, puertos ocupados o registros que no explican por qué una solicitud falló.

Esta lección conserva la estructura que fijaste en las lecciones 1 y 7: la entrada única es `src/main.ts`, que `tsc` compila a `dist/main.js`; el `rootDir` es `./src` y el `outDir` es `./dist`; y los scripts se llaman `compilar`, `verificar`, `arrancar`, `probar`, `lint` y `formato`. No se instala ninguna dependencia nueva: `node:http` y `fetch` vienen con Node. Lo que cambia son los archivos de `src/`: se agregan `contrato.ts`, `consulta.ts`, `archivo.ts`, `bitacora.ts` y `servidor.ts`, y se reescribe `main.ts` para que, en lugar de imprimir un reporte de ejemplo, arranque un servidor.

## Los conceptos

### Un servidor HTTP: escuchar no es responder

`createServer` construye un objeto servidor. Ese objeto todavía no ocupa ningún puerto ni recibe tráfico. Para comenzar a escuchar debes llamar a `listen`. Cada vez que llegue una solicitud, Node invocará la función que entregaste a `createServer` con dos objetos: `IncomingMessage`, que representa la solicitud, y `ServerResponse`, que representa la respuesta que vas a construir.

La separación importa porque crear, escuchar y responder son fases distintas. Puedes construir el servidor sin arrancarlo para probar su manejador. Puedes elegir un puerto en la configuración antes de abrirlo. Y puedes detener el servidor después de usarlo. Si juntas todo en una llamada larga y sin nombres, es más difícil ver cuál operación falló: si no se pudo leer la configuración, si el puerto estaba ocupado o si la ruta respondió mal.

Una respuesta HTTP mínima tiene dos partes relevantes. El código de estado comunica el resultado general: `200` indica éxito, `404` indica que no existe el recurso solicitado y `500` representa una falla del servidor. El cuerpo contiene el detalle que el cliente puede leer. Los encabezados indican cómo interpretar ese cuerpo; para texto, `text/plain; charset=utf-8` declara tanto el tipo de contenido como la codificación de los caracteres.

El siguiente programa crea una ruta de salud. Usa el puerto `0`, que pide al sistema operativo elegir uno disponible. Eso evita depender de que el puerto 3000, 8080 u otro puerto fijo esté libre en tu máquina. El programa obtiene el puerto elegido sólo para que su propio `fetch` pueda hacer una solicitud; no lo imprime, porque esa elección varía entre corridas. Como usa `await` en el nivel superior, ejecútalo dentro de la carpeta `figuras/` que preparaste en la lección 1, cuyo `package.json` declara `"type": "module"`.

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

El prefijo `node:` identifica módulos propios de Node y evita confundirlos con un paquete instalado por el proyecto. Como el programa importa un módulo de Node, el comando incluye `--types node`: TypeScript necesita esas declaraciones para conocer `createServer` y las propiedades de las solicitudes, y Node aporta el comportamiento real al ejecutar el JavaScript.

`respuesta.end(...)` es decisivo. Escribe el cuerpo final y señala que la respuesta terminó. Si olvidas terminarla, el cliente puede quedarse esperando aunque el servidor ya haya calculado su contenido. También es buena práctica usar `return` después de una respuesta que cierra una rama: no es necesario para que HTTP funcione, pero evita que el código posterior intente escribir una segunda respuesta sobre la misma conexión.

Observa también cómo se obtiene el puerto. `servidor.address()` devuelve `string | AddressInfo | null`: una cadena si el servidor escucha en un socket de Unix, un objeto con el puerto si escucha en TCP y `null` si todavía no escucha. La figura descarta los dos casos que no le sirven con una comprobación explícita y lanza un error si ocurren. Esa comprobación hace el trabajo que una aserción de tipo sólo fingiría: después de ella, TypeScript sabe que `direccion` es un `AddressInfo` y `direccion.port` existe, sin que tengas que prometerle nada.

Dentro del `revisor`, `/salud` no necesita consultar todos los servicios ni leer el reporte completo. Su pregunta es más pequeña: «¿el proceso HTTP está vivo y puede responder?». Esa distinción resulta útil en operación. Si `/salud` no responde, el problema puede ser el proceso, el puerto o la red local. Si `/salud` responde pero `/api/estados` informa fallas, el proceso funciona y el problema está en los servicios revisados o en su consulta. No declares disponible a toda la plataforma sólo porque el servidor responda `200`: una ruta de salud verifica la vida del proceso, y el reporte de estados representa el resultado de destinos externos. Son preguntas distintas y deben conservar nombres y respuestas distintos.

### Rutas tipadas: el URL externo no es una unión confiable

Una ruta recibida por HTTP llega como texto. Cualquier cliente puede pedir `/api/estados`, `/api/estado`, `/API/ESTADOS`, `/borrar-todo` o una ruta con parámetros inesperados. El tipo de `solicitud.url` refleja esa realidad: es `string | undefined`. No puedes declarar que esa entrada externa ya es una de tus rutas sólo porque te gustaría que lo fuera.

La operación correcta tiene dos pasos. Primero analizas el texto externo y lo conviertes a una representación interna. Después, el resto del manejador trabaja con una unión limitada. Es el mismo patrón de frontera de la lección 6: desde fuera llega un valor amplio; después de validar y clasificar, el dominio recibe alternativas conocidas.

La unión `Ruta` no cambia lo que una persona puede escribir en la barra del navegador. Sí evita que el resto del programa trate una ruta desconocida como si fuera válida. Si agregas una ruta futura, TypeScript puede ayudarte a encontrar los puntos donde debes decidir su código de estado, su cuerpo y su formato de respuesta; en el proyecto final lo hará con la guarda de exhaustividad con `never` que viste en la lección 3. En esta figura los estados están escritos a mano dentro del archivo para que el programa sea ejecutable por sí solo; en el proyecto vendrán de `revisarTodos`.

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

`new URL` separa la ruta de otros componentes de una URL, como la consulta y el fragmento. Así, `/api/estados?orden=nombre` sigue reconociendo la misma ruta base aunque más adelante decidas interpretar el parámetro `orden`. No compares texto contra una URL completa si sólo te interesa el `pathname`: una consulta añadida por un cliente cambiaría el texto aunque el recurso sea el mismo. El segundo argumento de `new URL` es una base ficticia, `http://revisor.local`, que sólo existe para que el constructor acepte rutas relativas como `/salud`; nunca se usa para conectarse a nada.

Observa que `Ruta` usa una unión discriminada. El campo `tipo` cumple la misma función que en `Estado`: permite que TypeScript reduzca el tipo dentro de cada rama. Una ruta de salud no necesita los estados. Una ruta no encontrada no debe devolver por accidente la colección interna. A medida que agregues rutas, esta estructura mantiene juntas la decisión de reconocimiento y la decisión de respuesta.

Un `404` no es una excepción ni un texto opcional. Es la respuesta correcta cuando el proceso existe pero no ofrece el recurso solicitado. Responder `200` con una frase que dice «no encontrado» obliga a cada cliente a inventar reglas para interpretar el cuerpo. Los códigos HTTP ya comunican esa categoría de resultado; úsalos para que navegadores, herramientas y el panel compartan el mismo idioma.

La figura anterior también contiene un defecto a propósito, y conviene que lo veas ahora. Su JSON incluye, para cada estado, el `servicio` completo: su `url` y su `timeoutMs`. Eso es cómodo para el programador, porque es exactamente el objeto que ya existe en memoria, y es un error para una API: acabas de publicar la dirección de tus servicios internos y cada cambio en el modelo cambiará la respuesta sin que nadie lo haya decidido. La siguiente sección corrige eso.

### JSON y contrato público: lo que sale no es lo que hay adentro

JSON es un formato de datos, no una prueba de que los datos son correctos. `JSON.stringify` convierte objetos del `revisor` en texto para una respuesta HTTP. Del otro lado, `respuesta.json()` convierte texto JSON en un valor que el cliente debe tratar como externo hasta validarlo. La diferencia se parece a la de la lección 6: el servidor conoce sus `Estado`; el panel de la siguiente lección recibirá JSON y tendrá que decidir si la respuesta cumple el contrato que espera.

El encabezado `content-type: application/json; charset=utf-8` forma parte de ese acuerdo. Muchos clientes pueden adivinar que un cuerpo es JSON por su primer carácter, pero no deberían tener que hacerlo. El encabezado declara qué formato se envía y permite que herramientas HTTP, navegadores y bibliotecas lo traten correctamente. No envíes JSON con `text/plain` sólo porque se vea bien en una terminal.

Lo que importa más es la forma. El modelo interno, `Estado`, conserva el `Servicio` completo porque `revisarTodos` necesita relacionar cada resultado con su configuración. El contrato público es otra cosa: es lo que una persona o un programa ajeno necesita saber, y nada más. Por eso el proyecto crea `src/contrato.ts` con dos tipos, `EstadoPublico` y `ReportePublico`. `EstadoPublico` también es una unión discriminada por `tipo`, pero en lugar de `servicio: Servicio` lleva sólo el `nombre`. No hay `url`, no hay `timeoutMs`. Y una función, `aReportePublico`, en `reporte.ts`, construye cada objeto público campo por campo. Construirlo así, en vez de copiar el `Estado` y quitarle propiedades, tiene una ventaja que se aprecia con el tiempo: si mañana `Servicio` agrega un token, una cuenta o una política de reintentos, la API no lo publica por accidente, porque la respuesta sólo contiene lo que alguien escribió ahí a propósito.

El mismo archivo lleva una tercera pieza, `esReportePublico(valor: unknown): valor is ReportePublico`, que comprueba en ejecución que un valor desconocido tiene esa forma. Parece que sobra en el servidor, que es quien produce el JSON. No sobra por dos razones. Primero, las pruebas de esta lección la usan para leer la respuesta de la API sin aceptar a ciegas lo que `respuesta.json()` devuelve. Segundo, el panel de la lección 9 consume exactamente este contrato desde el navegador, y ahí sí es una frontera de red: el archivo `contrato.ts` no importa nada de Node, así que puede viajar tal cual al navegador junto con el panel. Es el primer tipo compartido entre el servidor y la pantalla, y comparte las dos cosas que deben viajar juntas: la forma y la manera de comprobarla.

También evita publicar detalles que no forman parte del contrato. El JSON de `/api/estados` puede incluir `nombre`, `tipo`, código, duración o detalle porque son datos útiles del reporte. No debe devolver variables de entorno, rutas de archivos locales, encabezados de solicitudes ni mensajes técnicos crudos por comodidad. Una API pública conserva datos mínimos, deliberados y documentados. Esta regla se extiende al `detalle` de una falla: ese texto llega al cliente, así que el proyecto lo construye con un vocabulario corto y controlado («tiempo límite agotado», «conexión rechazada», «HTTP 503») en lugar de reenviar el mensaje original de una excepción de red, que podría revelar direcciones o rutas.

### Configuración: el puerto es texto, no un número

La configuración sigue el mismo principio de frontera. `process.env.PUERTO` llega del entorno y no es un número seguro: Node entrega siempre una cadena, aunque quien despliega haya escrito `PUERTO=8080`. Puede faltar, tener espacios, contener `ochenta`, ser `0`, ser decimal o superar el rango válido de puertos. Convertirlo con `Number(...)` sin revisar el resultado mueve el problema hasta `listen`, donde el mensaje depende del sistema operativo y es menos claro para quien configuró el proceso.

La lección 6 ya te dio la herramienta: `leerEnteroPositivo(nombre, valor, predeterminado)`, que comprueba el formato con una expresión regular antes de convertir, usa el predeterminado sólo cuando la variable falta y rechaza un valor presente pero inválido. Aquí se agrega a `configuracion.ts`, tal cual, y se construye encima `leerPuerto`, que añade la regla propia de los puertos: no pueden pasar de 65535. La figura siguiente reúne las dos funciones y las prueba con cinco entradas, incluyendo la ausencia de la variable.

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

El puerto `0`, que en `fig08_01` era útil porque le pedía al sistema operativo un puerto libre, aquí se rechaza: es una herramienta de pruebas, no una configuración, porque un servicio publicado necesita un puerto predecible donde sus clientes puedan encontrarlo. El valor predeterminado `3000` es una decisión explícita del proyecto, no una propiedad especial de Node. Es válido elegir otro valor o exigir que `PUERTO` exista, siempre que el programa lo comunique y lo pruebe. Lo importante es no dejar que un valor ausente se convierta por accidente en un comportamiento desconocido. La expresión regular `^[1-9]\d*$` rechaza espacios, signos, ceros iniciales y decimales antes de convertir; después, `Number.isSafeInteger` confirma que la conversión produjo un entero representable de forma segura, y el rango de puertos completa el contrato. Validar en capas puede parecer repetitivo frente a un simple `parseInt`, pero evita aceptar casos ambiguos como `3000texto`, que `parseInt` convertiría parcialmente a `3000`.

Dentro del `revisor`, la configuración del servidor no se mezcla con la configuración de los servicios. La lista validada de `Servicio` responde qué destinos se revisan y con qué `timeoutMs`; vive en un archivo, `servicios.json`, y se lee con `leerServicios` de la lección 6. El puerto responde dónde escucha la API; vive en una variable de entorno. Mantener los dos conceptos separados permite cambiar el puerto sin tocar el contrato de cada destino y permite reutilizar la lógica de revisión desde una prueba sin abrir una conexión TCP. Y una regla que ya conoces de la lección 6 sigue vigente: si falta algo o es inválido, el programa informa qué variable falló sin imprimir el resto del entorno, que podría contener secretos.

### Bitácora y cierre ordenado: operar también es parte del programa

Una bitácora registra hechos que ayudan a responder preguntas operativas: ¿el proceso arrancó?, ¿qué solicitud llegó?, ¿qué código se respondió y cuánto tardó?, ¿cuándo comenzó a cerrarse?, ¿terminó de cerrar? No sustituye la respuesta HTTP. La respuesta es para el cliente que hizo una solicitud; la bitácora es para quien opera el sistema y diagnostica problemas después, y por eso nunca debe mezclarse con lo que se le responde al cliente.

Los mensajes deben tener estructura y propósito. Un texto como `algo pasó` no permite filtrar ni comparar eventos. Un registro con `evento` y `detalle`, escrito como una línea de JSON, conserva una categoría estable y una descripción humana, y cualquier herramienta de análisis de registros sabe leerlo. En un servicio mayor agregarías nivel, identificador de solicitud y más campos. Y no uses la bitácora para copiar secretos, cuerpos completos de solicitudes o tokens de autorización: un archivo de bitácora suele circular más de lo que imaginas. Por esa razón el proyecto registra el `pathname` de cada solicitud y no la URL completa, porque la consulta (`?token=…`) es justo donde la gente pone, sin pensar, lo que no debería quedar escrito.

El cierre merece la misma atención que el arranque. Llamar a `servidor.close(...)` detiene la aceptación de conexiones nuevas y avisa, mediante su *callback*, cuando el servidor terminó de cerrarse, es decir, cuando ya no queda ninguna conexión activa. No significa que una solicitud en curso desaparezca en ese instante: el cierre ordenado permite terminar lo que ya estaba en marcha. Si el proceso sale sin esperar ese aviso, puedes cortar una respuesta a la mitad o perder el último registro.

En producción, quien detiene tu proceso casi nunca es una persona escribiendo un comando: es un supervisor (systemd, un orquestador de contenedores, la pulsación de `Ctrl+C` en tu terminal) que le envía una **señal** al proceso. `SIGTERM` significa «termina cuando puedas» y `SIGINT` es lo que envía `Ctrl+C`. Si no escuchas la señal, Node termina de inmediato, sin cerrar nada. Si la escuchas, tú decides qué hacer antes de salir.

La figura siguiente demuestra la secuencia completa con un caso que la hace visible. El servidor responde de forma lenta, a los 100 ms. El programa lanza una solicitud, espera a que el servidor la reciba y entonces se envía a sí mismo `SIGTERM` con `process.kill(process.pid, "SIGTERM")`. Fíjate en el orden de los registros: el cierre empieza mientras la solicitud sigue en curso, el cliente aun así recibe su respuesta completa, y sólo después se escribe `cerrado`.

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

El orden de los registros muestra una propiedad importante: `cerrado` sólo se escribe después de `await cerrar(servidor)`. Registrarlo antes sería una afirmación falsa: el proceso podría seguir atendiendo una conexión activa, o incluso fallar al cerrar. La promesa pequeña de `cerrar` adapta la API basada en *callback* de `server.close` a la forma asíncrona que ya conoces de la lección 5.

La variable `cierre` merece atención. Dos señales distintas pueden llegar con poca diferencia, por ejemplo un supervisor que envía `SIGTERM` mientras alguien pulsa `Ctrl+C` (`SIGINT`), y cada una intentaría cerrar el mismo servidor. El operador `??=` asigna la promesa del cierre sólo si todavía no existe, de modo que la segunda señal reutiliza el cierre en curso en lugar de iniciar otro. Además, el manejador no llama a `process.exit()`: ese método termina el proceso al instante y cortaría justo lo que acabas de demostrar que debe esperar. Cuando no queda ningún trabajo pendiente, Node termina solo, con el código de salida que corresponda.

Una nota sobre `process.once`: registra el manejador para una sola señal de cada tipo. Si llegara una segunda `SIGINT` (un segundo `Ctrl+C`) después de que el primer manejador ya corrió, Node vuelve a su comportamiento predeterminado y termina el proceso de inmediato. Es una salida de emergencia razonable para quien pulsa `Ctrl+C` dos veces porque el cierre ordenado tarda demasiado, y también significa que, para dos señales del mismo tipo, la protección de `??=` no llega a ejercerse. Si prefieres otra política, por ejemplo esperar un máximo de segundos y luego forzar la salida, es una decisión del proyecto, no una propiedad de Node.

Dentro del `revisor`, registra eventos de borde, no cada detalle interno de una función pura. `revisarTodos` puede devolver estados sin saber si se imprimirán, se expondrán por HTTP o se mostrarán en una pantalla. `servidor.ts` sí sabe que atendió `GET /api/estados`, qué código respondió y cuánto tardó. Esa es la capa correcta para la bitácora de solicitudes. Y una bitácora tampoco es una excusa para atrapar cualquier excepción y seguir como si nada: si no puedes abrir el puerto porque está ocupado, registra el problema con contexto y deja que el arranque falle con un código de salida distinto de cero.

### El `revisor` ensamblado: la API llama a la revisión real

Ahora juntas las piezas, sin convertir el servidor en dueño de la revisión. El modelo y `revisarTodos` conservan el contrato de las lecciones anteriores, sin una sola línea cambiada. `servidor.ts` recibe una función que obtiene el reporte y otra que registra eventos, y no sabe de dónde vienen. `main.ts` es la única pieza que conoce a todas: lee el puerto y el archivo de servicios, arma la función que consulta de verdad, abre el puerto y registra los manejadores de señales. Esta figura cambia de forma respecto de los ejemplos aislados anteriores: los estados ya no son una lista fija; se producen al llamar a `revisarTodos` en cada solicitud.

**Un destino de verdad: `consulta.ts`.** Es la primera implementación real del tipo `Consultar` de la lección 5. Recibe un `Servicio` y una `AbortSignal`, pide la URL del servicio con `fetch`, mide cuánto tardó con `performance.now()` y devuelve el código HTTP y la duración. Dos detalles importan. Primero, la señal que recibe es la que `revisarTodos` creó con `AbortSignal.timeout(servicio.timeoutMs)`: si el servicio no responde a tiempo, `fetch` se aborta solo, sin que `consulta.ts` tenga que programar un temporizador. Segundo, después de leer el código de estado, la función cancela el cuerpo de la respuesta con `respuesta.body?.cancel()`: al `revisor` le interesa que el servicio responda, no descargar su contenido, y dejar el cuerpo sin leer mantiene la conexión ocupada.

Lo que cambia respecto de un `fetch` ingenuo es cómo se traducen los fallos. Cuando `fetch` no logra conectarse, lanza un `TypeError` con el mensaje «fetch failed» que, por sí solo, no dice nada útil; el motivo real viaja en `error.cause`, y es otro `Error` con una propiedad `code` como `ECONNREFUSED`. La función auxiliar `codigoDeRed` recorre esa cadena con las comprobaciones que ya conoces (`instanceof Error`, `"code" in ...`, `typeof ... === "string"`) y devuelve el código o `undefined`, sin una sola aserción. Con él, `consultarConFetch` lanza uno de tres mensajes cortos: «tiempo límite agotado» si la señal se abortó, «conexión rechazada» si el código fue `ECONNREFUSED` y «no se pudo conectar» en cualquier otro caso. Cada `throw` lleva `{ cause: error }`, que adjunta el error original al nuevo: ESLint, con su configuración recomendada, exige justo eso (regla `preserve-caught-error`), y tiene razón, porque así quien depure sigue teniendo la causa real a un paso, aunque el cliente de la API sólo vea el mensaje corto.

**El archivo de servicios: `archivo.ts`.** Es la frontera de disco, tal como la dibujó la lección 7: lee `servicios.json`, convierte el texto a `unknown` con `JSON.parse` y entrega ese valor a `leerServicios`, que ya existía. Devuelve un `Resultado`, de modo que un archivo ausente, un JSON mal formado y un servicio inválido terminan en el mismo lugar: un detalle legible, no una excepción con una traza que alguien debe descifrar. Nota que `JSON.parse` devuelve `any`, y que se asigna a una variable declarada `unknown`: eso no necesita ninguna aserción, y obliga a `leerServicios` a verificar lo que recibe.

**El servidor: `servidor.ts`.** Su forma es la de las figuras anteriores, endurecida. `crearServidor(opciones)` devuelve un `Server` sin ponerlo a escuchar. `atender` responde primero a los métodos: si no es `GET`, contesta `405` con el encabezado `allow: GET`, que es la manera estándar de decirle al cliente qué sí puede hacer. Después reconoce la ruta con una unión y un `switch` cuyo `default` usa la guarda `never` de la lección 3. En `/api/estados` primero espera `obtenerReporte()` y sólo después escribe la respuesta: si lo hiciera al revés, un fallo a mitad de camino dejaría un `200` ya enviado con un cuerpo roto. Si el reporte falla, registra la causa técnica en la bitácora y responde un `500` con `{"detalle":"error interno"}`: el cliente recibe algo estable y seguro, y quien opera tiene la causa. `escuchar` envuelve `listen` en una promesa que se rechaza si el servidor emite `error` (por ejemplo, `EADDRINUSE`, puerto ocupado); sin eso, el error se emitiría como evento sin manejador y derribaría el proceso con una traza. `puertoDe` encapsula la comprobación de `address()` que viste en `fig08_01`.

Hay una línea que merece explicación: `void atender(...)` dentro del manejador de `createServer`. `atender` es una función `async` y por tanto devuelve una promesa; el manejador de Node no la espera. El operador `void` declara que ignorar esa promesa es intencional. Es seguro porque `crearServidor` encadena un `.catch(...)` a esa promesa: si `atender` falla por cualquier razón que no previó, el error se registra y el cliente recibe un `500` genérico. Sin ese `.catch`, una excepción dentro de `atender` sería una promesa rechazada sin manejar, y Node terminaría el proceso entero: un solo cliente con una solicitud rara tumbaría el servicio para todos. El destino de una solicitud lo escribe el cliente, y no todo destino se puede analizar: `curl --request-target "//"` envía uno para el que `new URL` lanza `TypeError: Invalid URL`. Por eso `rutaDe` atrapa ese error y devuelve `"?"`, un marcador que ninguna ruta real puede tener (toda ruta analizada empieza con `/`): cae en el `404` y la bitácora muestra que llegó algo ilegible, en vez de una ruta en blanco. Una prueba envía justo esa solicitud.

**El punto de entrada: `main.ts`.** Es una composición, no un lugar de reglas. Lee y valida el puerto; lee y valida los servicios; arma el servidor con una función `obtenerReporte` que llama a `revisarTodos` con `consultarConFetch` y convierte el resultado con `aReportePublico`; abre el puerto con `escuchar`; registra `escuchando`; y conecta `SIGTERM` y `SIGINT` a un cierre ordenado con la misma promesa compartida de `fig08_04`. Si algo de eso falla antes de que el servidor abra el puerto, registra el evento, fija `process.exitCode = 1` y regresa: el proceso termina solo con un código de error, sin llamar a `process.exit()`. Fíjate en el orden: primero se valida y después se abre el puerto, nunca al revés.

Las pruebas dejan de ser de juguete. `configuracion.test.ts` usa una tabla de casos, como en la lección 7, para `leerPuerto`. `contrato.test.ts` usa otra para `esReportePublico`: un reporte válido y cuatro formas de equivocarse (`null`, `estados` que no es un arreglo, un `tipo` desconocido y un `codigoHttp` que llega como texto). `reporte.test.ts` gana una prueba de que el reporte público no contiene la URL ni el `timeoutMs`. Y `servidor.test.ts` hace lo que da más confianza, además de probar rutas, métodos, el `500` sin filtrar el detalle interno y la solicitud con destino `//`, que debe recibir `404` sin derribar el proceso: levanta un servidor de destino de verdad, con cuatro comportamientos (`/ok` responde 200, `/caido` responde 503, un puerto cerrado rechaza la conexión y `/lento` nunca responde), levanta el servidor del `revisor` con `consultarConFetch` de verdad, hace un `fetch` real a `/api/estados` y comprueba cada desenlace: disponible, falla por HTTP 503, falla por conexión rechazada y falla por tiempo límite, esta última con un `timeoutMs` de 150 ms. Después comprueba lo que no debe aparecer: ni una sola `url` en el JSON. Cada prueba cierra sus servidores en un bloque `finally`, para que un fallo de una aserción no deje el puerto abierto y el proceso de pruebas colgado.

Los archivos nuevos o modificados son estos. Los que no cambian respecto de la lección 7 aparecen al final de la sección, completos, para que el proyecto sea reproducible de principio a fin.

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
`configuracion.ts` conserva `leerServicios` de la lección 7 y gana tres cosas: `esRegistro` ahora se exporta (la usa `contrato.ts`), y se agregan `leerEnteroPositivo` y `leerPuerto`. `reporte.ts` conserva `lineaReporte` y gana `aReportePublico`.

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
Las cuatro pruebas del proyecto:

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
El archivo `servicios.json` describe los destinos que revisa el programa cuando lo arrancas a mano. Los tres existen: el primero y el segundo son sitios públicos (sin conexión a internet verás fallas «no se pudo conectar» en ellos, y es lo esperado), y el tercero apunta a un puerto de tu propia máquina donde nadie escucha, para ver una falla sin depender de nadie.

```json fig08_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
Y los archivos que no cambian respecto de la lección 7: la configuración de npm y de TypeScript, ESLint y Prettier, el modelo y el coordinador `revisarTodos`.

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

Ese bloque demuestra dos límites distintos. `npm run verificar` confirma los contratos estáticos de todos los módulos; `npm run probar` compila y después ejecuta una petición HTTP real, contra destinos reales. Ningún `fetch` de las pruebas es una simulación: Node abre sockets locales, el cliente recibe respuestas, el tiempo límite de 150 ms vence de verdad y el cierre espera a que los servidores dejen de escuchar.

Todavía no has visto el programa corriendo. Compílalo y arráncalo en el puerto 3100 (si no pones `PUERTO`, usará 3000). Estos bloques son una corrida de ejemplo en tu terminal; las duraciones y las horas serán distintas en la tuya.

```text
$ npm run compilar
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:54:27.333Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

En otra terminal:

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

Vuelve a la primera terminal y pulsa `Ctrl+C`. La bitácora cuenta toda la historia, y el último par de líneas es el cierre ordenado:

```text
{"momento":"2026-10-02T20:54:28.533Z","evento":"solicitud","detalle":"GET /salud 200 2 ms"}
{"momento":"2026-10-02T20:54:28.964Z","evento":"solicitud","detalle":"GET /api/estados 200 418 ms"}
{"momento":"2026-10-02T20:54:28.978Z","evento":"solicitud","detalle":"GET /nada 404 0 ms"}
{"momento":"2026-10-02T20:54:28.992Z","evento":"solicitud","detalle":"POST /api/estados 405 0 ms"}
{"momento":"2026-10-02T20:54:28.993Z","evento":"cierre","detalle":"SIGINT recibida"}
{"momento":"2026-10-02T20:54:28.994Z","evento":"cerrado","detalle":"el servidor dejó de aceptar conexiones"}
```

Dos cosas conviene observar. La primera: `GET /api/estados` tardó 418 ms, apenas más que el destino más lento (405 ms) y mucho menos que la suma de los tres; esa es la concurrencia de la lección 5 haciendo su trabajo a través de HTTP. La segunda: cada `GET /api/estados` dispara de nuevo todas las consultas. Es la decisión más simple, la correcta para empezar, y tiene un costo que verás en «Lo que se hace mal».

## El error que vas a ver

La primera clase de error aparece cuando declaras rutas internas correctas, pero llamas a una función con una ruta que no pertenece a la unión. Con TypeScript 7.0.2, `tsc` informa TS2345 en la llamada a `atender`.

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

TS2345 indica que el argumento de una llamada no cumple el contrato del parámetro. Aquí no significa que TypeScript tenga una preferencia ortográfica: revela una decisión pendiente. Si la ruta pública correcta es `/api/estados`, corrige la llamada. Si realmente necesitas una ruta singular, agrégala a `Ruta`, enséñale a `reconocerRuta` cómo identificarla y define qué respuesta produce. No soluciones el problema con `as Ruta`; esa aserción silencia precisamente la comprobación que evita rutas declaradas pero no implementadas.

Otro diagnóstico frecuente aparece porque `IncomingMessage.url` puede ser `undefined`. Aunque las solicitudes HTTP normales tienen URL, el tipo de Node permite su ausencia y el manejador debe tener una política explícita.

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

TS18048 aparece cuando intentas usar un valor que puede faltar. El arreglo no es escribir `solicitud.url!`, porque eso sólo promete al compilador que sabes algo que el programa no comprobó. Decide qué debe hacer la API ante la ausencia. Para reconocer una ruta, `solicitud.url ?? "/"` ofrece una raíz predeterminada, que es lo que hace `rutaDe` en el proyecto. Si la URL es obligatoria para una operación concreta, puedes responder `400` y terminar la solicitud. La elección depende del contrato, pero debe existir antes de usar métodos de cadena como `toUpperCase`.

Hay un tercer error que no es del compilador sino de Node, y lo verás pronto: arrancar el servidor en un puerto que otro proceso ya ocupa. Sin manejo de errores, Node termina con una traza de `Error: listen EADDRINUSE`. En el proyecto, `escuchar` convierte ese evento en un rechazo de la promesa, y `main.ts` lo registra y sale con código 1. Para provocarlo, arranca dos copias en el mismo puerto; la segunda imprime:

```text
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:41:59.411Z","evento":"arranque-fallido","detalle":"listen EADDRINUSE: address already in use 127.0.0.1:3100"}
```

`EADDRINUSE` significa que el puerto ya tiene dueño: casi siempre es una copia anterior de tu mismo programa que no cerraste. Antes de cambiar el código, busca quién escucha en ese puerto (`lsof -i :3100` en Linux) o usa otro puerto con `PUERTO=3101`.

## Lo que se hace mal

- **Abrir el servidor antes de validar la configuración.** Si llamas a `listen` y luego descubres que `PUERTO` o la lista de servicios es inválida, el proceso puede quedar visible y a medias. Valida primero las entradas externas; abre el puerto sólo cuando el programa sabe con qué contrato va a trabajar.

- **Usar `solicitud.url as Ruta`.** Una aserción no analiza la solicitud ni bloquea rutas ajenas. Sólo elimina la protección estática. Convierte el texto externo mediante una función como `reconocerRuta` y responde `404` cuando no exista una alternativa válida.

- **Responder JSON sin encabezado `content-type`.** Algunos clientes podrán interpretar el cuerpo de todos modos, pero otros no tendrán una señal confiable de cómo leerlo. La representación y su encabezado forman un solo contrato HTTP.

- **Responder `200` para errores de ruta o de configuración.** Un cuerpo que dice «error» con código `200` obliga al panel y a otras integraciones a interpretar frases. Usa códigos HTTP para la categoría general y reserva el cuerpo para el detalle que el cliente necesita.

- **Serializar el modelo interno como respuesta.** `JSON.stringify(estados)` es una línea y funciona, pero publica la URL y el tiempo límite de cada servicio, y ata cada cambio del modelo a un cambio de la API. Construye el objeto público campo por campo.

- **Confiar en que `new URL` nunca falla.** El destino de una solicitud lo escribe el cliente, y `new URL("//", base)` lanza `TypeError: Invalid URL`. Una excepción que nadie atrapa en un manejador asíncrono termina el proceso. Atrapa el error al analizar y responde `404` o `400`, y encadena un `.catch` a la promesa del manejador como última red.

- **Escribir la respuesta antes de esperar el resultado.** Si llamas a `writeHead(200, ...)` y después `await` un trabajo que puede fallar, ya no puedes cambiar el código a `500`: el `200` salió. Espera primero, responde después.

- **Meter la consulta de servicios dentro del manejador de cada solicitud sin una política.** Si cada `GET /api/estados` dispara todas las consultas remotas, diez personas abriendo el panel multiplican el tráfico hacia tus servicios y obtienen reportes distintos. Para empezar es aceptable; en producción decide deliberadamente si la API revisa bajo demanda, conserva un reporte reciente unos segundos o ejecuta revisiones programadas.

- **Registrar secretos o la URL completa de cada solicitud.** Las bitácoras deben servir para operar, no convertirse en una copia permanente de datos sensibles. Registra método, ruta sin consulta, código y duración; elimina o enmascara credenciales, tokens y datos privados.

- **Llamar a `process.exit()` al recibir una señal.** El proceso termina de inmediato y puede cortar solicitudes, escrituras y registros. Primero inicia `server.close`, espera su finalización y deja que el proceso termine de manera natural cuando no quede trabajo pendiente.

- **Atrapar todos los errores y responder siempre el mismo detalle técnico.** El cliente necesita una respuesta estable y segura; la bitácora necesita contexto para diagnosticar. Separa ambos públicos: un `500` puede decir `{"detalle":"error interno"}` mientras el registro conserva el error técnico.

## Ejercicios

### Ejercicio 1 — Ruta de versión

Agrega la ruta `GET /version` al reconocimiento tipado de rutas del proyecto. Debe responder `200`, encabezado de texto y el cuerpo `revisor 1`. Conserva `404` para cualquier otra ruta, y comprueba que el compilador te señala el `switch` hasta que atiendes la rama nueva. Verifica ambas respuestas con una prueba que use un servidor en el puerto `0`.

### Ejercicio 2 — Un reporte con resumen

Agrega a `ReportePublico` un campo `resumen: { disponibles: number; fallas: number }` y calcúlalo en `aReportePublico`. Actualiza la prueba de `reporte.test.ts` para que lo compruebe, y corre `npm run verificar` para ver qué otros archivos te obliga a tocar el compilador. Explica por qué `esReportePublico` también debe cambiar.

### Ejercicio 3 — Una variable de entorno más

Agrega `REVISOR_MAX_SERVICIOS` (por omisión 20) con `leerEnteroPositivo` y haz que `main.ts` rechace el arranque, con `configuracion-invalida`, si `servicios.json` trae más servicios que ese límite. Escribe una prueba con tabla de casos para la regla.

### Ejercicio 4 — Cierre con tiempo máximo

Un cierre que espera a una solicitud que nunca termina deja el proceso colgado. Modifica `detener` en `main.ts` para que, si `cerrar(servidor)` no termina en 10 segundos, registre el evento `cierre-forzado` y llame a `servidor.closeAllConnections()`. Comprueba tu cambio arrancando el `revisor`, haciendo `curl` a un destino lento y enviando `SIGTERM`.

## Soluciones

### Solución 1

La ruta nueva debe aparecer tanto en el tipo como en la función que convierte el texto externo, y esa función sigue pasando por `rutaDe`: llamar a `new URL` directamente reintroduciría el defecto de las solicitudes con destino `//`. Dejarla sólo en una de las dos partes produciría un contrato incompleto: la unión diría que existe, pero ninguna solicitud podría alcanzarla, o una solicitud llegaría a una rama que TypeScript no reconoce como parte del diseño. Con la guarda `never` del `switch`, olvidar la rama es un error de compilación (TS2322) y no un descuido que se descubre en producción.

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

En `atender`, agrega `case "version":` con el mismo patrón que `salud`: `respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" })`, `respuesta.end("revisor 1")` y `return`. La prueba, en `servidor.test.ts`, comprueba también que una ruta distinta recibe `404`; probar sólo el camino exitoso no confirma que el servidor conserve el límite entre rutas conocidas y desconocidas.

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

### Solución 2

El cambio de tipo y el cálculo viven juntos, y el compilador hace el resto del trabajo: cada lugar que construye un `ReportePublico` sin `resumen` deja de compilar.

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

Aquí `aEstadoPublico` es la función que convierte un solo `Estado`, la que antes estaba escrita dentro del `map`. `esReportePublico` debe comprobar también `resumen`, porque su trabajo es describir en ejecución exactamente lo que el tipo promete en compilación; si sólo cambias el tipo, la guarda aceptaría respuestas que el tipo ya no admite, y el panel de la lección 9 compilaría contra un contrato que nadie verifica.

### Solución 3

La lectura del límite es una entrada de entorno más y se trata igual que el puerto: una función pequeña, un `Resultado`, y `main.ts` decide qué hacer con el fallo.

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

La regla «más servicios que el máximo» es pura: conviene extraerla a una función `validarCantidad(servicios, maximo): Resultado<readonly Servicio[]>` en `configuracion.ts` y probarla con una tabla (0, 1, el máximo, el máximo más uno), que es donde viven los errores de frontera, en lugar de probarla a través de `main.ts`.

### Solución 4

La carrera es entre dos promesas: el cierre ordenado y un temporizador. Si gana el temporizador, se cierran a la fuerza las conexiones que sigan abiertas; eso hace que `server.close` termine.

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

El `.catch(...)` que `main.ts` encadena al final de la expresión se conserva tal cual; se omite aquí para mostrar sólo lo que cambia. El `finally` cancela el temporizador cuando el cierre sí terminó a tiempo: sin él, el temporizador mantendría vivo el proceso diez segundos más aunque ya no hiciera falta. `closeAllConnections()` corta las solicitudes en curso, así que es un último recurso, y por eso se registra como un evento propio: quien lea la bitácora debe poder distinguir un cierre limpio de uno forzado.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2` dentro de `~/proyectos/revisor`.
- [ ] En la carpeta `figuras/`, `fig08_01.ts` compila con `--types node`, imprime `200 ok` y el proceso termina solo después de cerrar su servidor.
- [ ] `fig08_03.ts` rechaza `65536`, `0` y `hola` con un detalle que nombra la variable `PUERTO`, y acepta la ausencia con `3000`.
- [ ] `fig08_04.ts` imprime `cierre` antes de `cliente` y `cerrado` al final; la solicitud en curso recibe su respuesta.
- [ ] Al compilar la figura de la ruta con `/api/estado`, aparece TS2345; al compilar la figura de `solicitud.url`, aparece TS18048.
- [ ] En el proyecto, `npm run verificar`, `npm run lint` y `npm run formato` terminan sin avisos, y `npm run probar` reporta 19 pruebas aprobadas y 0 fallidas.
- [ ] `PUERTO=3100 npm run arrancar` registra `escuchando`; `curl http://127.0.0.1:3100/api/estados` devuelve JSON con `nombre` y `tipo` por servicio y sin `url`; `Ctrl+C` registra `cierre` y `cerrado`.
- [ ] `PUERTO=hola npm run arrancar` termina con código de salida 1 y el evento `configuracion-invalida`, sin abrir ningún puerto.

## Para leer más

- [Node.js: HTTP](https://nodejs.org/api/http.html) — documentación oficial de `createServer`, solicitudes, respuestas, `listen` y `close`; consultado el 2 de octubre de 2026.

- [Node.js: Process](https://nodejs.org/api/process.html) — documentación oficial sobre señales de proceso, `SIGTERM` y el ciclo de vida de Node; consultado el 2 de octubre de 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentación oficial sobre reducción de uniones discriminadas, comprobaciones de valores opcionales y exhaustividad con `never`; consultado el 2 de octubre de 2026.

- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) — referencia sobre códigos de estado HTTP y su significado para clientes y servidores; consultado el 2 de octubre de 2026.
