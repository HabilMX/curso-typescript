# Lesson 5 — Asynchrony: check everything at once

**Time:** 2 × 45 min

**What you build:** the concurrent `revisor`

**What you learn:** event loop, promises, `async/await`, `Promise.all` vs `allSettled`, `AbortController`, and timeouts

## By the end you will be able to

- Explain the execution order between synchronous code, promise microtasks, and tasks such as timers.
- Write an `async` function whose output contract is `Promise<Estado>`.
- Run queries to several services concurrently and keep the configuration's order in the report.
- Choose between `Promise.all` and `Promise.allSettled` according to the report's failure policy.
- Apply a timeout with `AbortController`, propagate its signal, and tell a cancellation apart from another failure.
- Fix TS2322 when transforming `Promise.allSettled` results into domain statuses.

## The why before the how

Up to the previous lesson, the `revisor` already knows what a `Servicio` is and how to represent an `Estado`: an available result carries an HTTP code and a duration; a failure carries a detail. However, the functions we have written so far could query each service one after the other. That order is easy to imagine, but it is an expensive decision when the main operation consists of waiting for a network response.

Suppose there are three services: catálogo, pagos, and inventario. If each query takes about a second and you make them in series, the report finishes about three seconds later. While the program waits for catálogo, it does not need to occupy the CPU to keep waiting. Even so, a sequential implementation decides not to start pagos until catálogo finishes, and not to start inventario until pagos finishes. The wait accumulates even though the three queries are independent.

Concurrency takes advantage of precisely that independence. The `revisor` can start the three queries, let Node attend to other events while the responses arrive, and gather the results at the end. It does not mean the program runs three JavaScript instructions simultaneously on the same thread. It means it can have several pending operations, normally input and output, without blocking while waiting for them one by one. If the slowest query takes a second, the concurrent report takes close to that second, plus the small work of organizing its results.

This difference resembles Go's concurrency, but the mental tool is not the same. In Go you can launch goroutines and coordinate them with channels, wait groups, and contexts. In Node, a process's ordinary JavaScript code runs mainly on one thread and the runtime coordinates asynchronous operations through the *event loop*, promises, and work queues. You do not need to manage threads for most HTTP queries; you need to express what happens when an operation finishes, fails, or is cancelled.

The word “concurrent” does not mean “unlimited” either. Starting everything at once can be right for a small list of independent services, but it would be irresponsible to use it without thinking against thousands of targets, a database with few connections, or a provider that imposes request limits. In this lesson the set is the `revisor`'s controlled list. Later, when the project receives configuration and serves HTTP, you will be able to decide a concurrency limit with real data.

The second problem is more important than speed: one failure should not keep you from knowing about the others. If pagos does not respond, the report is still useful if it says that catálogo is available and inventario ran out of time. A health report does not usually need the policy “if one query fails, throw away all the results”; it needs to record each result separately. That policy determines whether you will use `Promise.all`, `Promise.allSettled`, or a combination of both.

Finally, waiting without limit is another kind of error. A remote service can become slow, a connection can lose packets, and a target can accept the connection without finishing its response. If the `revisor` does not define a limit, a single query can leave the entire run pending. The `timeoutMs` of `Servicio`, which before was just part of the model, becomes a rule that must affect execution. `AbortController` is the standard mechanism for communicating: “this operation must no longer continue”.

The goal of the lesson is not to memorize the word `await`. It is to design a checking contract that can end in three clear ways: available, ordinary failure, or failure by timeout. When that decision appears in the type and in the function that coordinates the promises, the report remains complete even when part of the system is in trouble.

## The concepts

### The *event loop*: finishing one instruction before attending to the next pending thing

JavaScript first runs the synchronous code in front of it. If a function calls `console.log`, the printing happens before the program continues with the next line. When the code starts an asynchronous operation, such as a timer, a file read, or a network query, it registers a continuation for later and lets the thread keep working. It does not spin or block the process repeatedly asking whether the response has arrived.

The *event loop* is the mechanism that coordinates those continuations. When the call stack becomes free, Node can take work from its queues and run the next block of JavaScript. Resolved promises schedule microtasks; timers schedule later tasks. The visible consequence is that a pending microtask is attended to before a timer that is already ready, even if the timer was registered earlier.

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

The timer's `0` does not mean “run it now”. It means “do not run it before at least this turn of the current work finishes”. That is why `fin síncrono` appears first. The continuation of `Promise.resolve().then(...)` is not run on the same line that created it either: it stays pending as a microtask and is attended to after the synchronous code, before moving on to the timer's task.

Do not turn this order into a formula for controlling the program with clock precision. The order between microtasks and tasks is a useful rule; the concrete duration of a network query, a timer, or an operating system operation is not. A correct program does not depend on a response arriving “within ten milliseconds” on your computer. It depends on reacting correctly when the response arrives, fails, or is cancelled.

Inside the `revisor`, an HTTP query starts work that will continue outside the immediate JavaScript code. When the function calls `fetch`, it does not obtain the response body synchronously. It obtains a promise and lets the process keep starting other queries. When a response is ready, the continuation associated with that promise enters the pending work the *event loop* will be able to attend to.

This explains an important difference from an ordinary function. A synchronous function returns a finished value, such as `string` or `Estado`. A function that needs to wait for a network returns a promise of that value. The work is not complete on returning from the call; it is represented by an object that promises a future result.

### Promises and `async`/`await`: making visible that a result will arrive later

A `Promise<T>` represents an operation that eventually ends with a value of type `T` or ends rejected with a reason. The promise does not guarantee that everything went well: it guarantees that there will be an outcome. A promise can be pending, fulfilled, or rejected. If it is fulfilled, it contains the expected value; if it is rejected, it expresses that the operation could not produce it.

The word `async` changes a function's contract. If a function is marked `async`, it always returns a promise, even when inside it you write `return "listo"`. In that case its type is `Promise<string>`, not `string`. `await` waits for the outcome of a promise inside an `async` function; if it is fulfilled, it produces its value. If it is rejected, `await` throws that reason as an exception at that point.

Figures 05_02 through 05_07 use top-level `await`. Run them inside the `figuras/` folder you created in lesson 1, whose `package.json` contains `{ "type": "module" }`; that way `--module nodenext` treats them as ESM modules. Without that configuration, TypeScript rejects the top-level `await`.

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

`await` does not turn an asynchronous operation into a synchronous one. It only lets you write the continuation in a form similar to sequential code. While `obtenerEtiqueta` waits for the promise, the function is suspended; it does not stop the *event loop* or keep other pending operations from advancing. When the promise is fulfilled, the function resumes its execution and resolves its own promise with the final string.

A common confusion is to think that `await` must be used on every call to an asynchronous function. It must be used when you need the value before continuing with that branch. If you first want to start several queries and then wait for all of them, putting `await` inside each turn of a loop makes them sequential. The position of `await` describes a dependency: if the next operation depends on the previous result, wait; if it does not depend on it, start it and coordinate it later.

Inside the `revisor`, the natural contract of an individual check is `Promise<Estado>`. The function cannot return a finished `Estado` right away because it does not yet know whether the service will respond. Instead, it promises to deliver a status when the query finishes or when it converts a failure into a domain result.

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

The `Promise<Estado>` annotation matters because it documents the function's temporal edge. Whoever calls `revisarUno` knows they cannot read `estado.tipo` directly from the call. They must use `await`, `then`, or hand the promise to a coordinator. TypeScript does not know how long a network will take, but it can stop you from confusing a pending promise with the status it will produce.

In Go, a function that queries a service can return a value and an `error` after the goroutine or function finishes. In TypeScript, an asynchronous function expresses that wait inside `Promise`. Both options force you to model the failure; the difference is that in TypeScript the future result is an explicit part of the return type.

### `Promise.all`: start everything and wait for the whole set

`Promise.all` receives an iterable of promises and returns a new promise. It is fulfilled when all the promises are fulfilled, with an array of values in the same order as the input. That last part is useful for the `revisor`: the responses can finish in any order, but the report can keep the order in which the person configured the services.

If one of the promises is rejected, `Promise.all` is rejected as soon as it knows about that rejection. The other operations are not automatically cancelled; they may keep working. What changes is the result of the coordinating promise: there will no longer be a complete array of values. This policy is appropriate when every part is indispensable, for example when loading three files needed to build a single valid configuration.

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

The `map(consultar)` calls `consultar` once per name without waiting inside the loop. The result is an array of promises, and `Promise.all` waits for the whole set. If you write this:

```ts
for (const servicio of servicios) {
  const resultado = await consultar(servicio);
  console.log(resultado);
}
```

the queries would happen one by one. It is not always wrong: it would be suitable if the second query needed an identifier obtained by the first. But for independent services it would be an accumulated wait with no benefit.

Inside the `revisor`, `Promise.all` can indeed be the right tool even though each service can fail. The key is to convert each individual failure into an `EstadoFalla` value inside `revisarUno`. Then the individual promise is not rejected by an anticipated failure: it is fulfilled with a status that describes that failure. The coordinator can use `Promise.all` because all the normal paths produce an element of the report.

This separation clarifies responsibilities. `revisarUno` decides how to translate a network exception, a cancellation, or an invalid response into `EstadoFalla`. `revisarTodos` only coordinates a collection of `Promise<Estado>`. The report always receives a list of statuses and does not need to know technical exceptions for each service.

### `Promise.allSettled`: keeping each outcome before deciding what it means

`Promise.allSettled` also waits for the complete set, but it is not rejected if an individual promise fails. It returns an array of discriminated objects. Each object has `status: "fulfilled"` and `value`, or `status: "rejected"` and `reason`. It is a useful tool when the coordination needs to observe all the technical outcomes, even if some operations did not manage to produce a value.

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

The second collection of tasks is intentional. A promise already has an outcome; it is not “restarted” when awaited again. The `tareas` function creates a new set to demonstrate separately the policy of `all` and that of `allSettled`.

Notice the *narrowing* too. TypeScript does not let you read `resultado.value` without checking that `status` is `"fulfilled"`, because rejected results do not have that property. Equivalently, `reason` belongs to the rejected case. It is the same principle as the discriminated unions of lesson 3, applied to a standard library type.

`Promise.allSettled` is not automatically better. It has a conceptual cost: now the coordinator knows details of promises that perhaps should have been converted earlier into the domain's vocabulary. For the `revisor`, use it if you really need to distinguish between “the checking function produced a status” and “the function itself had an unexpected failure”. If all the expected failures are already transformed into `EstadoFalla`, `Promise.all` makes the contract smaller and more direct.

In Go, a collection of goroutines can send each result through a channel and the coordinator decides whether to interrupt at the first error or wait for all of them. `Promise.all` and `Promise.allSettled` offer equivalent policies for a collection of asynchronous operations. Neither replaces the design of the result: you must decide whether the error is a piece of data in the report or a condition that invalidates the whole operation.

### `AbortController` and timeouts: cancelling is an explicit decision

A timeout is not a promise that an operation will finish quickly. It is a decision to stop waiting for it when it crosses a limit. To apply that decision you need two pieces: something that schedules the cancellation and an operation that listens for the abort signal. `AbortController` produces an `AbortSignal`; the coordinating function keeps the controller and hands the signal to the operation.

When you call `controller.abort(razon)`, `signal.aborted` changes to `true` and the consumers of the signal receive the cancellation event. APIs such as `fetch` accept `signal` to interrupt a pending request. Your own asynchronous functions can also accept the signal and reject their promise when it is cancelled.

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

The `finally` is not decoration. If the query finishes before the timeout, you must clear the timer so that it does not cancel an operation that has already finished or keep unnecessary work pending. In the same way, do not create a single controller for all the services if each `timeoutMs` is independent. A cancellation of inventario must not abort catálogo by accident.

The reason for aborting deserves to be turned into a readable detail. An `AbortSignal` communicates that something was cancelled, but the report must decide whether it was due to a limit, a graceful shutdown, or a cancellation requested from elsewhere. In this lesson, a cancellation by limit is converted into an `EstadoFalla` with `detalle: "tiempo límite"`; later the model can add a specific variant if the domain needs to tell it apart visually.

Inside the `revisor`, the signal crosses the contract of the function that makes the query. It is important not to hide it inside a global variable or to create it in a place the query function cannot observe. Whoever starts the check owns the controller; whoever does cancellable work receives the signal.

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

The example uses a replaceable query function to separate the coordination from the transport details. It does not open real connections or measure real durations; that is why the test query returns `duracionMs: 0` and that value does not appear in the output. Here `Servicio` is deliberately simplified to `nombre` and `timeoutMs`: it does not need `url` yet. The `Consultar` contract already delivers both `codigoHttp` and `duracionMs`, so that the later implementation can measure a real HTTP query and lesson 8 can plug in the transport without changing the report's contract. The concurrent policy does not change: each service receives its own signal, translates its outcome into `Estado`, and the coordinator waits for all the checks.

## The error you will see

`Promise.allSettled` does not directly return the value type of the promises. It returns `PromiseSettledResult<T>[]`, because it needs to represent both fulfillments and rejections. If you try to assign it to `Estado[]`, TypeScript produces TS2322.

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

TS2322 means that you are trying to assign one type to another incompatible one. With TypeScript 7.0.2, the diagnostic first points out that even the fulfilled case is a `PromiseFulfilledResult<Estado>` wrapper and not an `Estado`: it directly lacks `tipo`. The rejected case has, instead, `status` and `reason`. The solution is not an assertion like `as Estado[]`, because that would erase the decision that is still missing. You must iterate over the results, check `status`, and convert each case into the corresponding status.

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

This solution forces you to decide which service corresponds to the rejected result. That is why it is advisable to preserve the `servicios` array and not depend on the order of completion. It also shows why, when `revisarUno` already converts its own failures into `EstadoFalla`, it can be clearer to use `Promise.all`: the coordinated result already has the report's final type.

Another frequent error has no TypeScript code: forgetting to catch a promise's rejection. In Node, an unhandled rejection can end the process or produce a warning depending on the execution mode. Do not fix it by adding a `catch(() => {})` that erases the information. Catch the reason and convert it into a failure the report can explain, or rethrow it if it really must stop the whole run.

## What gets done wrong

- **Putting `await` inside a loop for independent operations.** The code looks tidy, but each query waits for the previous one. First create the array of promises and then use `Promise.all` or `Promise.allSettled` to coordinate them.

- **Using `Promise.all` expecting an automatic partial report.** `Promise.all` rejects at the first rejection observed. The other operations may stay alive, but their result stops being available through that coordinating promise. Use `allSettled` or convert the individual failure into `EstadoFalla`.

- **Using `Promise.allSettled` out of habit.** It can hide that an individual function did not correctly define its error contract. If every check must end as `Estado`, translate the error in `revisarUno` and use `Promise.all` to express that the set always produces statuses.

- **Confusing concurrency with parallelism.** Several requests can be pending at once without JavaScript running several parts of your function at the same time. The benefit comes from not blocking the thread while you wait for input and output, not from a promise of more CPU.

- **Waiting with `setTimeout` to “give a promise time”.** A timer does not prove that an operation finished or correctly synchronize results. Wait for the promise that represents the work; use a timer only as an explicit part of a timeout.

- **Creating an `AbortController` and not passing `signal` to the operation.** Calling `abort()` does not magically stop any code. The operation must accept and observe the signal, like `fetch` or a function of your own that registers the `abort` event.

- **Not clearing the timer in `finally`.** If the operation finishes early, the timer stays pending and may abort later or keep the process alive. `clearTimeout` must run both on success and on failure.

- **Converting any error to text with an assertion.** In `catch`, the value is `unknown` with `strict`. Check `error instanceof Error` before reading `message`; for other values, use a safe, consciously decided detail.

- **Measuring duration with made-up values in production.** The example uses `0` so that its output is deterministic. The real implementation must measure around the operation and decide what unit and precision `duracionMs` will have.

## Exercises

### Exercise 1 — Two queries without accumulated wait

Write `consultar(nombre): Promise<string>` using `Promise.resolve`. Receive the names `catálogo`, `pagos`, and `inventario`, start the three queries with `map`, and use `Promise.all` to print each one's result in the order of the list. Then rewrite the program with a `for...of` and `await` inside the loop; explain why that second version would be sequential if the function made a real network query.

### Exercise 2 — A report that keeps failures

Create three tasks: one fulfilled for catálogo, one rejected with `new Error("sin conexión")` for pagos, and one fulfilled for inventario. Use `Promise.allSettled` to convert them into an array of `Estado`. Each result must have `tipo: "disponible"` or `tipo: "falla"` and keep the service's name. Do not use `as Estado[]`.

### Exercise 3 — Timeout per service

Define `Consultar` as `(servicio: Servicio, signal: AbortSignal) => Promise<{ codigoHttp: number; duracionMs: number }>` and use it in `revisarUno(servicio, consultar)`. Add an `AbortController`, a timer based on `servicio.timeoutMs`, and a `finally` block that clears the timer. Write a test query that resolves for catálogo and waits for the abort signal for inventario. The report must show catálogo available and inventario with a failure whose detail is `tiempo límite`.

### Exercise 4 — The coordinator's policy

Implement two coordinators for the same list of services. The first must use `Promise.all` over a version of `revisarUno` that always converts anticipated failures into `EstadoFalla`. The second must use `Promise.allSettled` over a function that can be rejected. Describe, in one paragraph, which one you would use for the `revisor`'s main report and what concrete condition would make you choose the other.

## Solutions

### Solution 1

The essential part is to separate starting the operations from waiting for their values. `map` produces all the promises before `Promise.all` waits for the complete array.

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

With a real network, `await consultar(nombre)` inside the loop would prevent starting pagos while catálogo is still pending. The result might look the same, but the total time would accumulate the waits.

### Solution 2

The solution must narrow each `PromiseSettledResult` with its discriminant `status`. The `servicios` array keeps the service associated with each position.

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

There is no automatic conversion from a rejected result to `EstadoFalla`. That translation is a domain decision and must be written down.

### Solution 3

Each call needs its own controller and its own timer. The signal is handed to the function that can be cancelled; the `finally` block clears the temporary resource on every path.

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

The function returns an `Estado` even when the query does not respond. That lets the report's coordinator use `Promise.all` without losing the other results.

### Solution 4

For the main report I would use `Promise.all` over checks that convert anticipated failures into `EstadoFalla`. The result has a uniform contract: one check per configured service, in the same order, with no technical exceptions for the dashboard to interpret.

I would use `Promise.allSettled` when a lower layer could reject for reasons that still need separate diagnosis, for example a batch of initialization tasks where I need to record which ones did not even manage to create a status. In that case, the coordinator must explicitly transform each rejection before handing data to the rest of the program.

## How I know I got it

- [ ] `node --version` starts with `v24`.
- [ ] `npx tsc --version` prints `Version 7.0.2`.
- [ ] When you compile and run `fig05_01.ts`, the lines appear in this order: initial synchronous code, final synchronous code, promise microtask, and timer task.
- [ ] When you compile and run `fig05_05.ts`, a failure for pagos appears without keeping catálogo and inventario from being printed as available.
- [ ] When you compile and run `fig05_07.ts`, the output contains exactly one line each for catálogo, pagos, and inventario, with the timeout failure for inventario.
- [ ] When you compile `fig05_08.ts`, you get TS2322 on the assignment of `Promise.allSettled` to `Estado[]` and you can explain why an assertion is not a fix.
- [ ] You can point out where the `AbortSignal` of a check is created, where it is propagated, and where it is consumed.

## Further reading

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — official documentation on function contracts and return types; accessed on October 2, 2026.

- [Node.js: `AbortController` and `AbortSignal`](https://nodejs.org/api/globals.html#class-abortcontroller) — official documentation of the global cancellation APIs in Node; accessed on October 2, 2026.

- [MDN: `Promise.allSettled()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) — reference for the fulfilled and rejected results of a collection of promises; accessed on October 2, 2026.

- [MDN: JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) — explanation of the *event loop*, the call stack, and the work queues; accessed on October 2, 2026.
