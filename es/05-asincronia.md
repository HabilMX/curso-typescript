# Lección 5 — Asincronía: que revise todo a la vez

**Tiempo:** 2 × 45 min

**Qué construyes:** el `revisor` concurrente

**Qué aprendes:** *event loop*, promesas, `async/await`, `Promise.all` vs `allSettled`, `AbortController` y tiempos límite

## Al terminar vas a poder

- Explicar el orden de ejecución entre código síncrono, microtareas de promesas y tareas como temporizadores.
- Escribir una función `async` cuyo contrato de salida sea `Promise<Estado>`.
- Ejecutar consultas de varios servicios de forma concurrente y conservar el orden de la configuración en el reporte.
- Elegir entre `Promise.all` y `Promise.allSettled` según la política de fallas del reporte.
- Aplicar un tiempo límite con `AbortController`, propagar su señal y diferenciar una cancelación de otra falla.
- Corregir TS2322 al transformar resultados de `Promise.allSettled` en estados del dominio.

## El porqué antes del cómo

Hasta la lección anterior, el `revisor` ya sabe qué es un `Servicio` y cómo representar un `Estado`: un resultado disponible trae código HTTP y duración; una falla trae un detalle. Sin embargo, las funciones que hemos escrito hasta ahora podrían consultar cada servicio uno después del otro. Ese orden es fácil de imaginar, pero es una decisión costosa cuando la operación principal consiste en esperar una respuesta de red.

Supón que hay tres servicios: catálogo, pagos e inventario. Si cada consulta tarda aproximadamente un segundo y las haces en serie, el reporte termina aproximadamente tres segundos después. Mientras el programa espera catálogo, no necesita ocupar la CPU para seguir esperando. Aun así, una implementación secuencial decide no iniciar pagos hasta que catálogo termine, y no iniciar inventario hasta que pagos termine. La espera se acumula aunque las tres consultas sean independientes.

La concurrencia aprovecha precisamente esa independencia. El `revisor` puede iniciar las tres consultas, dejar que Node atienda otros eventos mientras llegan las respuestas y reunir los resultados al final. No significa que el programa ejecute tres instrucciones de JavaScript simultáneamente en el mismo hilo. Significa que puede tener varias operaciones pendientes, normalmente de entrada y salida, sin bloquearse esperando una por una. Si la consulta más lenta tarda un segundo, el reporte concurrente tarda cerca de ese segundo, más el trabajo pequeño de organizar sus resultados.

Esta diferencia se parece a la concurrencia de Go, pero la herramienta mental no es la misma. En Go puedes lanzar goroutines y coordinarlas con canales, grupos de espera y contextos. En Node, el código JavaScript ordinario de un proceso corre principalmente en un hilo y el sistema de ejecución coordina operaciones asíncronas mediante el *event loop*, promesas y colas de trabajo. No necesitas administrar hilos para la mayoría de las consultas HTTP; necesitas expresar qué ocurre cuando una operación termina, falla o se cancela.

La palabra “concurrente” tampoco significa “sin límite”. Iniciar todo a la vez puede ser correcto para una lista pequeña de servicios independientes, pero sería irresponsable usarlo sin pensar ante miles de destinos, una base de datos con pocas conexiones o un proveedor que impone límites de solicitudes. En esta lección el conjunto es la lista controlada del `revisor`. Más adelante, cuando el proyecto reciba configuración y atienda HTTP, podrás decidir un límite de concurrencia con datos reales.

El segundo problema es más importante que la velocidad: una falla no debería impedirte conocer las demás. Si pagos no responde, el reporte sigue siendo útil si dice que catálogo está disponible e inventario agotó su tiempo límite. Un reporte de salud no suele necesitar la política “si una consulta falla, borra todos los resultados”; necesita registrar cada resultado por separado. Esa política determina si usarás `Promise.all`, `Promise.allSettled` o una combinación de ambas.

Finalmente, esperar sin límite es otra clase de error. Un servicio remoto puede quedar lento, una conexión puede perder paquetes y un destino puede aceptar la conexión sin terminar su respuesta. Si el `revisor` no define un límite, una sola consulta puede dejar pendiente toda la corrida. El `timeoutMs` de `Servicio`, que antes era sólo parte del modelo, se vuelve una regla que debe afectar la ejecución. `AbortController` es el mecanismo estándar para comunicar: “esta operación ya no debe continuar”.

El objetivo de la lección no es memorizar la palabra `await`. Es diseñar un contrato de revisión que pueda terminar de tres maneras claras: disponible, falla normal o falla por tiempo límite. Cuando esa decisión aparece en el tipo y en la función que coordina las promesas, el reporte sigue siendo completo aun cuando una parte del sistema esté en problemas.

## Los conceptos

### El *event loop*: terminar una instrucción antes de atender la siguiente cosa pendiente

JavaScript ejecuta primero el código síncrono que tiene enfrente. Si una función llama a `console.log`, la impresión ocurre antes de que el programa continúe con la línea siguiente. Cuando el código inicia una operación asíncrona, como un temporizador, una lectura de archivo o una consulta de red, registra una continuación para después y permite que el hilo siga trabajando. No se queda girando ni bloquea el proceso preguntando repetidamente si ya llegó la respuesta.

El *event loop* es el mecanismo que coordina esas continuaciones. Cuando la pila de llamadas queda libre, Node puede tomar trabajo de sus colas y ejecutar el siguiente bloque de JavaScript. Las promesas resueltas programan microtareas; los temporizadores programan tareas posteriores. La consecuencia visible es que una microtarea pendiente se atiende antes que un temporizador ya listo, aunque el temporizador se haya registrado antes.

```ts
// fig05_01.ts
console.log("inicio síncrono");

setTimeout(() => {
  console.log("tarea de temporizador");
}, 0);

Promise.resolve().then(() => {
  console.log("microtarea de promesa");
});

console.log("fin síncrono");
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_01.ts
$ node fig05_01.js
inicio síncrono
fin síncrono
microtarea de promesa
tarea de temporizador
```

El `0` del temporizador no quiere decir “ejecútalo ahora”. Quiere decir “no lo ejecutes antes de que termine al menos esta vuelta del trabajo actual”. Por eso `fin síncrono` aparece antes. La continuación de `Promise.resolve().then(...)` tampoco se ejecuta dentro de la misma línea que la creó: queda pendiente como microtarea y se atiende después del código síncrono, antes de pasar a la tarea del temporizador.

No conviertas este orden en una fórmula para controlar el programa con precisión de reloj. El orden entre microtareas y tareas sí es una regla útil; la duración concreta de una consulta de red, de un temporizador o de una operación del sistema operativo no lo es. Un programa correcto no depende de que una respuesta llegue “antes de diez milisegundos” en tu computadora. Depende de reaccionar correctamente cuando la respuesta llegue, falle o sea cancelada.

Dentro del `revisor`, una consulta HTTP inicia trabajo que continuará fuera del código JavaScript inmediato. Cuando la función llama a `fetch`, no obtiene el cuerpo de la respuesta de forma síncrona. Obtiene una promesa y permite que el proceso siga iniciando otras consultas. Cuando una respuesta está lista, la continuación asociada con esa promesa entra al trabajo pendiente que el *event loop* podrá atender.

Esto explica una diferencia importante con una función común. Una función síncrona devuelve un valor terminado, como `string` o `Estado`. Una función que necesita esperar una red devuelve una promesa de ese valor. El trabajo no está completo al regresar de la llamada; está representado por un objeto que promete un resultado futuro.

### Promesas y `async`/`await`: hacer visible que un resultado llegará después

Una `Promise<T>` representa una operación que eventualmente termina con un valor de tipo `T` o termina rechazada con una razón. La promesa no garantiza que todo salió bien: garantiza que habrá un desenlace. Una promesa puede estar pendiente, cumplida o rechazada. Si está cumplida, contiene el valor esperado; si está rechazada, expresa que la operación no pudo producirlo.

La palabra `async` cambia el contrato de una función. Si una función está marcada como `async`, siempre devuelve una promesa, incluso cuando dentro escribes `return "listo"`. En ese caso su tipo es `Promise<string>`, no `string`. `await` espera el desenlace de una promesa dentro de una función `async`; si se cumple, produce su valor. Si se rechaza, `await` lanza esa razón como una excepción en ese punto.

Las figuras 05_02 a 05_07 usan `await` en el nivel superior. Ejecútalas dentro de la carpeta `figuras/` que creaste en la lección 1, cuyo `package.json` contiene `{ "type": "module" }`; así `--module nodenext` las trata como módulos ESM. Sin esa configuración, TypeScript rechaza el `await` de nivel superior.

```ts
// fig05_02.ts
async function obtenerEtiqueta(): Promise<string> {
  const nombre = await Promise.resolve("catálogo");
  return `revisando ${nombre}`;
}

const etiqueta = await obtenerEtiqueta();
console.log(etiqueta);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_02.ts
$ node fig05_02.js
revisando catálogo
```

El `await` no convierte una operación asíncrona en síncrona. Sólo permite escribir la continuación con una forma parecida a código secuencial. Mientras `obtenerEtiqueta` espera la promesa, la función queda suspendida; no detiene el *event loop* ni impide que otras operaciones pendientes avancen. Cuando la promesa se cumple, la función retoma su ejecución y resuelve su propia promesa con la cadena final.

Una confusión común es pensar que `await` debe usarse en toda llamada a una función asíncrona. Debe usarse cuando necesitas el valor antes de continuar con esa rama. Si primero quieres iniciar varias consultas y luego esperar por todas, poner `await` dentro de cada vuelta de un ciclo las vuelve secuenciales. La posición de `await` describe una dependencia: si la siguiente operación depende del resultado anterior, espera; si no depende, iníciala y coordínala después.

Dentro del `revisor`, el contrato natural de una revisión individual es `Promise<Estado>`. La función no puede devolver un `Estado` terminado de inmediato porque todavía no sabe si el servicio responderá. En cambio, promete entregar un estado cuando termine la consulta o cuando convierta una falla en un resultado del dominio.

```ts
// fig05_03.ts
interface Servicio {
  readonly nombre: string;
}

type Estado = {
  servicio: Servicio;
  tipo: "disponible";
};

async function revisarUno(servicio: Servicio): Promise<Estado> {
  await Promise.resolve();
  return {
    servicio,
    tipo: "disponible",
  };
}

const estado = await revisarUno({ nombre: "catálogo" });
console.log(`${estado.servicio.nombre}: ${estado.tipo}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_03.ts
$ node fig05_03.js
catálogo: disponible
```

La anotación `Promise<Estado>` importa porque documenta el borde temporal de la función. Quien llame a `revisarUno` sabe que no puede leer `estado.tipo` directamente de la llamada. Debe usar `await`, `then` o entregar la promesa a un coordinador. TypeScript no sabe cuánto tardará una red, pero sí puede impedir que confundas una promesa pendiente con el estado que producirá.

En Go, una función que consulta un servicio puede devolver un valor y un `error` después de que la goroutine o función termine. En TypeScript, una función asíncrona expresa esa espera dentro de `Promise`. Las dos opciones obligan a modelar la falla; la diferencia es que en TypeScript el resultado futuro es parte explícita del tipo de retorno.

### `Promise.all`: iniciar todo y esperar el conjunto

`Promise.all` recibe un iterable de promesas y devuelve una nueva promesa. Se cumple cuando todas las promesas se cumplen, con un arreglo de valores en el mismo orden de entrada. Esto último es útil para el `revisor`: las respuestas pueden terminar en cualquier orden, pero el reporte puede conservar el orden con que la persona configuró los servicios.

Si una de las promesas se rechaza, `Promise.all` se rechaza tan pronto como conoce ese rechazo. Las demás operaciones no se cancelan automáticamente; pueden seguir trabajando. Lo que cambia es el resultado de la promesa coordinadora: ya no habrá un arreglo completo de valores. Esta política es apropiada cuando cada parte es indispensable, por ejemplo al cargar tres archivos necesarios para construir una sola configuración válida.

```ts
// fig05_04.ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const servicios = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(servicios.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_04.ts
$ node fig05_04.js
catálogo: disponible
pagos: disponible
inventario: disponible
```

El `map(consultar)` llama a `consultar` una vez por cada nombre sin esperar dentro de la vuelta. El resultado es un arreglo de promesas, y `Promise.all` espera el conjunto. Si escribes esto:

```ts
for (const servicio of servicios) {
  const resultado = await consultar(servicio);
  console.log(resultado);
}
```

las consultas ocurrirían una por una. No siempre es incorrecto: sería adecuado si la segunda consulta necesitara un identificador obtenido por la primera. Pero para servicios independientes sería una espera acumulada sin beneficio.

Dentro del `revisor`, `Promise.all` sí puede ser la herramienta correcta aunque cada servicio pueda fallar. La clave es convertir cada falla individual en un valor `EstadoFalla` dentro de `revisarUno`. Entonces la promesa individual no se rechaza por una falla prevista: se cumple con un estado que describe esa falla. El coordinador puede usar `Promise.all` porque todos los caminos normales producen un elemento del reporte.

Esta separación aclara responsabilidades. `revisarUno` decide cómo traducir una excepción de red, una cancelación o una respuesta inválida a `EstadoFalla`. `revisarTodos` sólo coordina una colección de `Promise<Estado>`. El reporte recibe siempre una lista de estados y no necesita conocer excepciones técnicas para cada servicio.

### `Promise.allSettled`: conservar cada desenlace antes de decidir qué significa

`Promise.allSettled` también espera el conjunto completo, pero no se rechaza si una promesa individual falla. Devuelve un arreglo de objetos discriminados. Cada objeto tiene `status: "fulfilled"` y `value`, o `status: "rejected"` y `reason`. Es una herramienta útil cuando la coordinación necesita observar todos los desenlaces técnicos, incluso si algunas operaciones no llegaron a producir un valor.

```ts
// fig05_05.ts
function tareas(): Promise<string>[] {
  return [
    Promise.resolve("catálogo"),
    Promise.reject(new Error("conexión rechazada")),
    Promise.resolve("inventario"),
  ];
}

try {
  await Promise.all(tareas());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(`Promise.all: ${error.message}`);
  }
}

const resultados = await Promise.allSettled(tareas());

for (const resultado of resultados) {
  if (resultado.status === "fulfilled") {
    console.log(`${resultado.value}: disponible`);
  } else if (resultado.reason instanceof Error) {
    console.log(`pagos: falla (${resultado.reason.message})`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_05.ts
$ node fig05_05.js
Promise.all: conexión rechazada
catálogo: disponible
pagos: falla (conexión rechazada)
inventario: disponible
```

La segunda colección de tareas es intencional. Una promesa ya tiene un desenlace; no se “reinicia” al volver a esperarla. La función `tareas` crea un conjunto nuevo para demostrar por separado la política de `all` y la de `allSettled`.

Observa también el *narrowing*. TypeScript no permite leer `resultado.value` sin comprobar que `status` es `"fulfilled"`, porque los resultados rechazados no tienen esa propiedad. De forma equivalente, `reason` pertenece al caso rechazado. Es el mismo principio de las uniones discriminadas de la lección 3, aplicado a un tipo de la biblioteca estándar.

`Promise.allSettled` no es automáticamente mejor. Tiene un costo conceptual: ahora el coordinador conoce detalles de promesas que tal vez deberían haberse convertido antes al vocabulario del dominio. Para el `revisor`, úsalo si realmente necesitas distinguir entre “la función de revisión produjo un estado” y “la propia función tuvo un fallo inesperado”. Si todas las fallas esperadas ya se transforman en `EstadoFalla`, `Promise.all` hace el contrato más pequeño y directo.

En Go, una colección de goroutines puede enviar cada resultado por un canal y el coordinador decide si interrumpe al primer error o espera todos. `Promise.all` y `Promise.allSettled` ofrecen políticas equivalentes para una colección de operaciones asíncronas. Ninguna sustituye el diseño del resultado: debes decidir si el error es un dato del reporte o una condición que invalida toda la operación.

### `AbortController` y tiempos límite: cancelar es una decisión explícita

Un tiempo límite no es una promesa de que una operación terminará rápido. Es una decisión de dejar de esperarla cuando cruza un límite. Para aplicar esa decisión necesitas dos piezas: algo que programe la cancelación y una operación que escuche la señal de cancelación. `AbortController` produce un `AbortSignal`; la función coordinadora conserva el controlador y entrega la señal a la operación.

Cuando llamas `controller.abort(razon)`, `signal.aborted` cambia a `true` y los consumidores de la señal reciben el evento de cancelación. APIs como `fetch` aceptan `signal` para interrumpir una solicitud pendiente. Tus propias funciones asíncronas también pueden aceptar la señal y rechazar su promesa cuando se cancele.

```ts
// fig05_06.ts
function esperarCancelacion(signal: AbortSignal): Promise<void> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

async function conLimite(): Promise<void> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, 0);

  try {
    await esperarCancelacion(controlador.signal);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  } finally {
    clearTimeout(temporizador);
  }
}

await conLimite();
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_06.ts
$ node fig05_06.js
tiempo límite
```

El `finally` no es decoración. Si la consulta termina antes del tiempo límite, debes limpiar el temporizador para que no cancele una operación que ya terminó ni mantenga trabajo innecesario pendiente. Del mismo modo, no crees un único controlador para todos los servicios si cada `timeoutMs` es independiente. Una cancelación de inventario no debe abortar catálogo por accidente.

La razón de abortar merece convertirse en un detalle legible. Un `AbortSignal` comunica que se canceló algo, pero el reporte debe decidir si fue por límite, por cierre ordenado o por una cancelación solicitada desde otra parte. En esta lección, una cancelación por límite se convierte en `EstadoFalla` con `detalle: "tiempo límite"`; más adelante el modelo puede agregar una variante específica si el dominio necesita diferenciarla visualmente.

Dentro del `revisor`, la señal atraviesa el contrato de la función que hace la consulta. Es importante no esconderla dentro de una variable global ni crearla en un lugar que la función de consulta no pueda observar. Quien inicia la revisión posee el controlador; quien hace trabajo cancelable recibe la señal.

```ts
// fig05_07.ts
interface Servicio {
  readonly nombre: string;
  readonly timeoutMs: number;
}

type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

type Consultar = (
  servicio: Servicio,
  signal: AbortSignal,
) => Promise<{ codigoHttp: number; duracionMs: number }>;

function esperarAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

const consultarDePrueba: Consultar = async (servicio, signal) => {
  if (servicio.nombre === "catálogo") {
    return { codigoHttp: 200, duracionMs: 0 };
  }

  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return esperarAbort(signal);
};

async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<Estado[]> {
  return Promise.all(
    servicios.map((servicio) => revisarUno(servicio, consultar)),
  );
}

function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

const estados = await revisarTodos(
  [
    { nombre: "catálogo", timeoutMs: 100 },
    { nombre: "pagos", timeoutMs: 100 },
    { nombre: "inventario", timeoutMs: 0 },
  ],
  consultarDePrueba,
);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_07.ts
$ node fig05_07.js
catálogo: HTTP 200
pagos: falla (conexión rechazada)
inventario: falla (tiempo límite)
```

El ejemplo usa una función de consulta reemplazable para separar la coordinación de los detalles de transporte. No abre conexiones reales ni mide duraciones reales; por eso la consulta de prueba devuelve `duracionMs: 0` y ese dato no aparece en la salida. Aquí `Servicio` se simplifica deliberadamente a `nombre` y `timeoutMs`: todavía no necesita `url`. El contrato `Consultar` ya entrega tanto `codigoHttp` como `duracionMs`, para que la implementación posterior pueda medir una consulta HTTP real y la lección 8 pueda conectar el transporte sin cambiar el contrato del reporte. La política concurrente no cambia: cada servicio recibe su propia señal, traduce su desenlace a `Estado` y el coordinador espera todas las revisiones.

## El error que vas a ver

`Promise.allSettled` no devuelve directamente el tipo de valor de las promesas. Devuelve `PromiseSettledResult<T>[]`, porque necesita representar tanto cumplimientos como rechazos. Si intentas asignarlo a `Estado[]`, TypeScript produce TS2322.

```ts
// fig05_08.ts
type Estado = {
  tipo: "disponible";
};

async function revisar(): Promise<Estado[]> {
  const tareas: Promise<Estado>[] = [];
  const resultados: Estado[] = await Promise.allSettled(tareas);
  return resultados;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_08.ts
fig05_08.ts(8,9): error TS2322: Type 'PromiseSettledResult<Estado>[]' is not assignable to type 'Estado[]'.
  Type 'PromiseSettledResult<Estado>' is not assignable to type 'Estado'.
    Property 'tipo' is missing in type 'PromiseFulfilledResult<Estado>' but required in type 'Estado'.
```

TS2322 significa que estás intentando asignar un tipo a otro incompatible. Con TypeScript 7.0.2, el diagnóstico señala primero que incluso el caso cumplido es un envoltorio `PromiseFulfilledResult<Estado>` y no un `Estado`: le falta directamente `tipo`. El caso rechazado tiene, en cambio, `status` y `reason`. La solución no es una aserción como `as Estado[]`, porque eso borraría la decisión que todavía falta. Debes recorrer los resultados, comprobar `status` y convertir cada caso en el estado que corresponda.

```ts
const resultados = await Promise.allSettled(tareas);

return resultados.map((resultado, indice): Estado => {
  if (resultado.status === "fulfilled") {
    return resultado.value;
  }

  return {
    servicio: servicios[indice],
    tipo: "falla",
    detalle: "la revisión no terminó",
  };
});
```

Esta solución obliga a decidir qué servicio corresponde al resultado rechazado. Por eso conviene preservar el arreglo de `servicios` y no depender del orden de terminación. También muestra por qué, cuando `revisarUno` ya convierte sus propias fallas en `EstadoFalla`, puede ser más claro usar `Promise.all`: el resultado coordinado ya tiene el tipo final del reporte.

Otro error frecuente no tiene código de TypeScript: olvidar capturar el rechazo de una promesa. En Node, un rechazo no atendido puede terminar el proceso o producir una advertencia según el modo de ejecución. No lo arregles agregando un `catch(() => {})` que borra la información. Captura la razón y conviértela en una falla que el reporte pueda explicar, o vuelve a lanzarla si realmente debe detener la corrida completa.

## Lo que se hace mal

- **Poner `await` dentro de un ciclo para operaciones independientes.** El código parece ordenado, pero cada consulta espera la anterior. Primero crea el arreglo de promesas y después usa `Promise.all` o `Promise.allSettled` para coordinarlas.

- **Usar `Promise.all` esperando un reporte parcial automático.** `Promise.all` rechaza al primer rechazo observado. Las otras operaciones pueden seguir vivas, pero su resultado deja de estar disponible a través de esa promesa coordinadora. Usa `allSettled` o convierte la falla individual en `EstadoFalla`.

- **Usar `Promise.allSettled` por costumbre.** Puede esconder que una función individual no definió correctamente su contrato de error. Si toda revisión debe terminar como `Estado`, traduce el error en `revisarUno` y usa `Promise.all` para expresar que el conjunto siempre produce estados.

- **Confundir concurrencia con paralelismo.** Varias solicitudes pueden estar pendientes a la vez sin que JavaScript ejecute varias partes de tu función al mismo tiempo. El beneficio viene de no bloquear el hilo mientras esperas entrada y salida, no de una promesa de más CPU.

- **Esperar con `setTimeout` para “darle tiempo” a una promesa.** Un temporizador no prueba que una operación terminó ni sincroniza correctamente resultados. Espera la promesa que representa el trabajo; usa un temporizador sólo como parte explícita de un tiempo límite.

- **Crear un `AbortController` y no pasar `signal` a la operación.** Llamar `abort()` no detiene mágicamente cualquier código. La operación debe aceptar y observar la señal, como `fetch` o una función propia que registra el evento `abort`.

- **No limpiar el temporizador en `finally`.** Si la operación termina pronto, el temporizador sigue pendiente y puede abortar después o mantener vivo el proceso. `clearTimeout` debe ejecutarse tanto en éxito como en falla.

- **Convertir cualquier error a texto con una aserción.** En `catch`, el valor es `unknown` con `strict`. Comprueba `error instanceof Error` antes de leer `message`; para otros valores, usa un detalle seguro y decidido conscientemente.

- **Medir duración con valores inventados en producción.** El ejemplo usa `0` para que su salida sea determinista. La implementación real debe medir alrededor de la operación y decidir qué unidad y precisión tendrá `duracionMs`.

## Ejercicios

### Ejercicio 1 — Dos consultas sin espera acumulada

Escribe `consultar(nombre): Promise<string>` usando `Promise.resolve`. Recibe los nombres `catálogo`, `pagos` e `inventario`, inicia las tres consultas con `map` y usa `Promise.all` para imprimir el resultado de cada una en el orden de la lista. Después reescribe el programa con un `for...of` y `await` dentro del ciclo; explica por qué esa segunda versión sería secuencial si la función hiciera una consulta de red real.

### Ejercicio 2 — Un reporte que conserva fallas

Crea tres tareas: una cumplida para catálogo, una rechazada con `new Error("sin conexión")` para pagos y una cumplida para inventario. Usa `Promise.allSettled` para convertirlas en un arreglo de `Estado`. Cada resultado debe tener `tipo: "disponible"` o `tipo: "falla"` y conservar el nombre del servicio. No uses `as Estado[]`.

### Ejercicio 3 — Tiempo límite por servicio

Define `Consultar` como `(servicio: Servicio, signal: AbortSignal) => Promise<{ codigoHttp: number; duracionMs: number }>` y úsalo en `revisarUno(servicio, consultar)`. Agrega un `AbortController`, un temporizador basado en `servicio.timeoutMs` y un bloque `finally` que limpie el temporizador. Escribe una consulta de prueba que se resuelva para catálogo y espere la señal de aborto para inventario. El reporte debe mostrar catálogo disponible e inventario con una falla cuyo detalle sea `tiempo límite`.

### Ejercicio 4 — Política del coordinador

Implementa dos coordinadores para la misma lista de servicios. El primero debe usar `Promise.all` sobre una versión de `revisarUno` que siempre convierte fallas previstas en `EstadoFalla`. El segundo debe usar `Promise.allSettled` sobre una función que puede rechazarse. Describe, en un párrafo, cuál usarías para el reporte principal del `revisor` y qué condición concreta te haría elegir la otra.

## Soluciones

### Solución 1

La parte esencial es separar el inicio de las operaciones de la espera por sus valores. `map` produce todas las promesas antes de que `Promise.all` espere el arreglo completo.

```ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const nombres = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(nombres.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

Con una red real, `await consultar(nombre)` dentro del ciclo impediría iniciar pagos mientras catálogo sigue pendiente. El resultado podría verse igual, pero el tiempo total acumularía las esperas.

### Solución 2

La solución debe reducir cada `PromiseSettledResult` con su discriminante `status`. El arreglo `servicios` conserva el servicio asociado a cada posición.

```ts
const estados = resultados.map((resultado, indice): Estado => {
  const servicio = servicios[indice];

  if (resultado.status === "fulfilled") {
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: resultado.value.codigoHttp,
      duracionMs: resultado.value.duracionMs,
    };
  }

  return {
    servicio,
    tipo: "falla",
    detalle:
      resultado.reason instanceof Error
        ? resultado.reason.message
        : "falla desconocida",
  };
});
```

No hay una conversión automática de resultado rechazado a `EstadoFalla`. Esa traducción es una decisión del dominio y debe quedar escrita.

### Solución 3

Cada llamada necesita su propio controlador y su propio temporizador. La señal se entrega a la función que puede ser cancelada; el bloque `finally` limpia el recurso temporal en cualquier camino.

```ts
async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}
```

La función devuelve un `Estado` incluso cuando la consulta no responde. Eso permite que el coordinador del reporte use `Promise.all` sin perder los demás resultados.

### Solución 4

Para el reporte principal usaría `Promise.all` sobre revisiones que convierten fallas previstas en `EstadoFalla`. El resultado tiene un contrato uniforme: una revisión por cada servicio configurado, en el mismo orden, sin excepciones técnicas que el panel deba interpretar.

Usaría `Promise.allSettled` cuando una capa inferior pudiera rechazar por razones que todavía necesitan diagnóstico separado, por ejemplo un lote de tareas de inicialización donde necesito registrar cuáles no llegaron siquiera a crear un estado. En ese caso, el coordinador debe transformar explícitamente cada rechazo antes de entregar datos al resto del programa.

## Cómo sé que lo logré

- [ ] `node --version` empieza con `v24`.
- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Al compilar y ejecutar `fig05_01.ts`, las líneas aparecen en este orden: código síncrono inicial, código síncrono final, microtarea de promesa y tarea de temporizador.
- [ ] Al compilar y ejecutar `fig05_05.ts`, aparece una falla de pagos sin impedir que catálogo e inventario se impriman como disponibles.
- [ ] Al compilar y ejecutar `fig05_07.ts`, la salida contiene exactamente una línea por catálogo, pagos e inventario, con la falla de tiempo límite para inventario.
- [ ] Al compilar `fig05_08.ts`, obtienes TS2322 en la asignación de `Promise.allSettled` a `Estado[]` y puedes explicar por qué una aserción no es una corrección.
- [ ] Puedes señalar dónde se crea, dónde se propaga y dónde se consume el `AbortSignal` de una revisión.

## Para leer más

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentación oficial sobre contratos de funciones y tipos de retorno; consultado el 2 de octubre de 2026.

- [Node.js: `AbortController` y `AbortSignal`](https://nodejs.org/api/globals.html#class-abortcontroller) — documentación oficial de las APIs globales de cancelación en Node; consultado el 2 de octubre de 2026.

- [MDN: `Promise.allSettled()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) — referencia de los resultados cumplidos y rechazados de una colección de promesas; consultado el 2 de octubre de 2026.

- [MDN: Modelo de ejecución de JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) — explicación del *event loop*, la pila de llamadas y las colas de trabajo; consultado el 2 de octubre de 2026.
