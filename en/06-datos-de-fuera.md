# Lesson 6 — Data that arrives from outside

**Time:** 2 × 45 min

**What you build:** validation of configuration and responses

**What you learn:** the type does not validate at runtime: validate at the boundary; types derived from the schema

## By the end you will be able to

- Tell trustworthy data inside the program apart from values that arrive from JSON, an environment variable, or an HTTP response.
- Receive external data as `unknown` and convert it to an internal contract only after validating it.
- Write type guards and validation functions that give useful errors without using `any` or assertions to hide problems.
- Read and validate a list of services from a JSON file before starting concurrent queries.
- Convert environment variables, which always arrive as text or as absence, into valid numeric settings.
- Derive the internal type from a validation schema to avoid maintaining two contracts that contradict each other.

## The why before the how

Up to the previous lesson, the `revisor` already has a list of `Servicio`, can query its targets concurrently, and converts expected failures into `Estado` values. All of that works very well as long as each object is built directly in TypeScript files. If you write `{ nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 }`, the compiler can check that the object contains the three properties and that each one has the promised type.

A real program does not live only on objects written by whoever programs. The list of services may come from a JSON file edited by someone in operations. The API's port may come from an environment variable set when starting a container. The response of a remote service may carry JSON produced by another application, with another version, another error policy, or a temporary defect. In all three cases, the program receives JavaScript values that did not pass through this project's compiler.

This is an important boundary. Inside the `revisor`, after validating, you can work with `Servicio`, `Estado`, and `Reporte` as known contracts. At the boundary, before validating, all you know is that something arrived. It may be an object, an array, `null`, text, a number, or an object that looks right except for one property. The healthy decision is to make that uncertainty explicit: receive `unknown`, inspect the value at runtime, and produce trustworthy data or an error that says what must be corrected.

It is common to think that a TypeScript annotation solves this problem. If you write `const servicio = JSON.parse(texto) as Servicio`, the editor stops showing warnings and the following code can read `servicio.timeoutMs`. But no check took place. `as Servicio` asks the compiler to trust you; it does not examine the JSON, does not convert a string into a number, and does not add a missing property. When Node runs the emitted JavaScript, the `Servicio` alias will no longer exist.

The difference resembles the one in Go between deserializing JSON and validating a `struct`. Go can fill known fields of a structure, but you still have to decide whether the received values are acceptable: an empty URL, a zero port, or a negative limit can fit in their types and still be invalid configurations. TypeScript has an additional responsibility: before even asserting that a value has the shape of an object, it must check it. The static type protects the relationships of your code; validation protects the entry from the outside world.

The boundary is not a place to repeat validations all over the application. If ten functions ask whether `timeoutMs` is a number, you end up with ten versions of the same rule and ten different messages. If you validate once when loading the configuration, the rest receives `readonly Servicio[]` and concentrates on querying, coordinating, and presenting results. Validation does not make the other remote services trustworthy; it establishes where the `revisor` decides which data it can accept as its own.

It also matters to distinguish structure from business rule. Confirming that `timeoutMs` is a number eliminates one class of errors, but it still admits `-50`, `NaN`, or `3.14`. For this project, the limit is a whole number of milliseconds and must be positive. Confirming that `url` is a string does not prove that the target responds or that it belongs to the right network either; it only checks that the configuration contains a non-empty text that the next step can interpret as a URL. Each layer answers a different question and none replaces the others.

The goal of the lesson is not to build an enormous validation library. It is to learn an order of work that holds up when the project grows: define an executable rule at the boundary, obtain from it a trustworthy internal value, and keep a clear explanation for when the input does not comply. That order will prepare the `revisor` for the API of lesson 8 and the dashboard of lesson 9, where both the server and the browser will cross data boundaries again.

## The concepts

### Types are erased; `unknown` keeps the right doubt

TypeScript analyzes the code before emitting JavaScript. Aliases, interfaces, generic parameters, and annotations help the compiler, but they do not turn into automatic checks at runtime. Node receives ordinary JavaScript: it cannot ask whether an object “is a `Servicio`” because that name does not exist as a value during execution.

`JSON.parse` converts JSON text into a JavaScript value. The standard allows that value to be any of the possible JSON types: object, array, string, number, boolean, or `null`. Even though you know the file should contain services, that expectation does not change what arrived. That is why it is advisable to keep the result as `unknown` before inspecting it.

```ts
// fig06_01.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const bruto: unknown = JSON.parse(
  '{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":"rápido"}',
);

const supuesto = bruto as Servicio;

console.log(typeof supuesto.timeoutMs);
console.log(supuesto.timeoutMs);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_01.ts
$ node fig06_01.js
string
rápido
```

The figure compiles because the assertion orders the compiler to treat the value as `Servicio`. However, execution shows the reality: `timeoutMs` is still a string. If a later function did arithmetic with that value, JavaScript might convert it unexpectedly or produce `NaN`. The problem did not start at the arithmetic operation; it started at the moment a contract was asserted without evidence.

`unknown` does not mean the value is useless. It means you cannot yet read properties or call it as a function. That restriction is useful because it forces you to make the check in the right place. After proving that the value is a non-null object, you can examine its keys; after proving that a key holds a positive integer, you can use it as a limit.

Do not confuse `unknown` with `any`. `any` switches off checking and lets you access any property as if it were valid. It is comfortable for a few seconds and expensive afterward: an external error can travel silently through several functions until it shows up far from its origin. `unknown`, on the other hand, keeps the uncertainty visible. It is the right type for JSON, `catch` values, messages between processes, and data that arrives from a network.

Inside the `revisor`, the configured list is a boundary. The JSON file must not feed `revisarTodos` directly; it must first pass through a function that proves there is a list of usable services. After that function, `revisarTodos` can keep the contract from lesson 5: it receives a collection of `Servicio` and returns a promise of statuses. It does not need to know about JSON or misspelled properties.

### Type guards: checking the shape JavaScript really has

A type guard is a function that makes a check at runtime and whose signature tells the compiler what you learned if it returns `true`. The smallest form to start with is checking whether something is a record of properties. `typeof valor === "object"` is not enough because in JavaScript `typeof null` is also `"object"`, and because arrays are objects even though they do not represent a service's configuration.

A guard for records does not validate a `Servicio` by itself. It only opens the door to consulting properties safely. From it you can take `nombre`, `url`, and `timeoutMs` as `unknown` values and validate each one with its own rules. Separating those steps avoids giving too broad a meaning to a small check.

Figure 06_01 uses a simplified, mutable version of `Servicio` to isolate the risk of an assertion. From figure 06_02 on, the model recovers its three `readonly` properties, because the configuration has already been accepted and must not change during a check.

```ts
// fig06_02.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, detalle: "nombre debe ser texto no vacío" };
  }

  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  if (
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "timeoutMs debe ser un entero positivo" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

for (const entrada of [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: "1500" },
]) {
  const resultado = leerServicio(entrada);

  if (resultado.ok) {
    console.log(`${resultado.valor.nombre}: ${resultado.valor.timeoutMs} ms`);
  } else {
    console.log(`inválido: ${resultado.detalle}`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_02.ts
$ node fig06_02.js
catálogo: 1500 ms
inválido: timeoutMs debe ser un entero positivo
```

The function returns `Resultado<Servicio>` and does not throw an exception for an expected bad configuration. That lets the caller decide whether startup must stop, all the errors must be shown, or it should continue with a default configuration. For a list of targets that defines what is going to be checked, stopping startup with an explanation is usually better than starting only part of it without warning.

The integer rule uses `Number.isSafeInteger`, not just `typeof timeoutMs === "number"`. In JavaScript, `NaN`, `Infinity`, and `2.5` also have type `number`, but none of them correctly represents a whole number of milliseconds. The `timeoutMs <= 0` part expresses a decision of this project: zero does not mean “no limit”; it is an invalid configuration. If the product needed to represent “no limit”, it should have a deliberate alternative, not take advantage of an ambiguous number.

Inside the `revisor`, this same function converts an external object into an internal `Servicio`. The `readonly` type recovers its usefulness after the boundary: once the configuration has been accepted, nobody should change the name, the URL, or the limit of a check that has already started. The guard does not validate that the URL responds. That check belongs to the asynchronous query, which can produce an `EstadoFalla` even when the configuration was perfectly valid.

### Configuration JSON: validate the whole document before working

A valid JSON file can contain incorrect data for your application. `JSON.parse` only answers whether the text follows JSON's grammar; it does not know that you expect an array of services or that their names must be distinct. For example, `{"timeoutMs":"mil"}` is valid JSON, but it is not a usable configuration.

It is worth separating three failures that tend to get mixed up. The first is being unable to read the file: perhaps it does not exist or the process lacks permission. The second is that the text is not valid JSON. The third is that the JSON is syntactically correct but does not meet the `revisor`'s contract. Each one requires a different explanation to fix it, even though all of them keep the check from starting.

The following program loads a file next to the module. It uses `node:fs/promises`, the prefix required for native Node modules, and a URL relative to `import.meta.url` so as not to depend on the directory from which Node was invoked. The JSON is received as `unknown`; the array is validated element by element before being returned.

This figure uses top-level `await` in the file. Save it inside the `figuras/` folder created in lesson 1, whose `package.json` contains `{"type":"module"}`; that way TypeScript and Node treat it as an ESM module. Without that configuration, `await` would only be valid inside an `async` function.

```json fig06_03.servicios.json
[
  {
    "nombre": "catálogo",
    "url": "https://catalogo.example",
    "timeoutMs": 1500
  },
  {
    "nombre": "pagos",
    "url": "https://pagos.example",
    "timeoutMs": 3000
  }
]
```

```ts
// fig06_03.ts
import { readFile } from "node:fs/promises";

type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
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

function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return {
        ok: false,
        detalle: `servicio ${indice + 1}: ${resultado.detalle}`,
      };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}

const archivo = new URL("./fig06_03.servicios.json", import.meta.url);
const texto = await readFile(archivo, "utf8");
const resultado = leerServicios(JSON.parse(texto) as unknown);

if (resultado.ok) {
  console.log(`configuración: ${resultado.valor.length} servicios`);
} else {
  console.log(`configuración inválida: ${resultado.detalle}`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig06_03.ts
$ node fig06_03.js
configuración: 2 servicios
```

Since TypeScript 6, `@types/node` is no longer loaded automatically when compiling an isolated file. Because this figure imports `node:fs/promises`, `--types node` explicitly includes the installed Node declarations and lets TypeScript recognize that native module. The flag only contributes types for compilation; Node still provides the module when the program runs.

The `as unknown` at the end of `JSON.parse` does not assert that the document is valid. It does the opposite: it avoids trusting the broad type the library exposes and forces `leerServicios` to treat it as unverified input. The evidence comes from the concrete checks of `Array.isArray`, `esRegistro`, `typeof`, and `Number.isSafeInteger`.

This example stops validation at the first invalid service to keep the function short. Another valid policy is to accumulate all the problems in an array of errors, especially if a person will edit a large file and it is convenient to fix everything in one pass. The important rule does not change: the report must not start until it has been decided whether the complete configuration is acceptable. Silencing an invalid entry and continuing can leave services unchecked without anyone noticing.

A useful rule for production is also missing: duplicate names. Lesson 4 already showed how to detect them with `Set`. That rule must run after validating the shape of each service, because only then do you know that `nombre` is a string. First you convert each external entry to a trustworthy contract; then you apply the rules that relate several services to one another.

### Environment variables: text, absence, and explicit conversion

Environment variables also cross a boundary. In Node, `process.env.PUERTO` has type `string | undefined`, even if the person preparing the deployment believes they wrote a number. The operating system carries text; there is no numeric environment variable. If the value is `"8080"`, you must convert it. If it is `"ocho-mil-ochenta"`, the conversion must fail in a readable way.

Do not use `Number(valor)` without an additional decision. `Number("")` produces `0`, `Number(" ")` also produces `0`, and `Number("3.5")` produces a number even though it is not an integer port. Do not use `parseInt` as a complete validation either: `parseInt("3000ms", 10)` returns `3000`, silently accepting text that was probably a mistake. A check of the format before converting keeps the contract clear.

```ts
// fig06_04.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return {
      ok: false,
      detalle: `${nombre} debe ser un entero positivo`,
    };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return {
      ok: false,
      detalle: `${nombre} está fuera del rango seguro`,
    };
  }

  return { ok: true, valor: numero };
}

const entorno: Record<string, string | undefined> = {
  PUERTO: "8080",
  REVISOR_MAX_SERVICIOS: "muchos",
};

const puerto = leerEnteroPositivo(
  "PUERTO",
  entorno.PUERTO,
  3000,
);
const maximo = leerEnteroPositivo(
  "REVISOR_MAX_SERVICIOS",
  entorno.REVISOR_MAX_SERVICIOS,
  20,
);

console.log(puerto.ok ? `puerto: ${puerto.valor}` : puerto.detalle);
console.log(maximo.ok ? `máximo: ${maximo.valor}` : `máximo inválido: ${maximo.detalle}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_04.ts
$ node fig06_04.js
puerto: 8080
máximo inválido: REVISOR_MAX_SERVICIOS debe ser un entero positivo
```

The `entorno` object makes the example deterministic. In the real program, the second argument will be `process.env.PUERTO`. The function does not need to change: it still receives a string or `undefined`, and returns a trustworthy number or a detail. The default value is used only when the variable is missing; it must not hide a variable that is present but badly written. An absence can have a safe value chosen by the project; an explicit and invalid setting must ask for correction.

Inside the `revisor`, the port setting belongs to the server of lesson 8 and the services-limit setting can protect startup. Do not mix these variables with the list of `Servicio`: the port describes how the API listens; the list describes which targets it queries. Having small functions per category lets you give precise messages and prevents an arbitrary variable from ending up as an optional property of a service.

Validating environment variables is also a security boundary. Never print the contents of all the variables to debug a failed conversion: an environment can contain secrets. For a non-sensitive value such as a port, you can name the variable that failed. For a future credential, report that it is missing or invalid without reproducing the secret or any part of it in a log or HTTP response.

### Schemas and derived types: a single rule for execution and compilation

As more inputs appear, writing a type on one side and an independent validation on the other can duplicate decisions. You could update `Servicio` to add `equipo` and forget to update the validator; the compiler would watch over internal constructions, but an external input could arrive without the new field. A schema aims to reduce that distance: it is a value that knows how to read `unknown` at runtime and that also lets you derive its output type.

A schema is not magic. It still needs explicit rules for text, integers, URLs, and objects. The difference is that the validation function has a generic contract: it receives `unknown` and delivers `Resultado<T>`. The parameter `T` describes the value that remains available after validating. A conditional type can extract that `T` from the schema without writing a second definition by hand.

### Conditional types, `infer`, and mapped types, step by step

A **conditional type** is a type rule of the form `A extends B ? X : Y`: if `A` is compatible with `B`, it produces `X`; otherwise, it produces `Y`. `infer` is a reserved word that, inside that comparison, captures a part of the type that TypeScript can deduce. A **mapped type** walks over the keys of another type to build one property for each; the form `[K in keyof T]` means “for each key `K` of `T`”. All three exist only for the compiler: they do not generate JavaScript instructions.

This small example shows one piece at a time. `Salida` is conditional because it only extracts `T` when it receives an `Esquema<T>`; `infer T` names that extracted type. `ValoresDe` is mapped: it keeps `nombre` and `timeoutMs` from `campos`, but replaces each schema with its output. Compilation confirms that `servicio` has both properties with the correct type before Node prints the text.

```ts
// fig06_07.ts
type Esquema<T> = { ejemplo: T };

type Salida<E> = E extends Esquema<infer T> ? T : never;

type ValoresDe<T extends Record<string, Esquema<unknown>>> = {
  [K in keyof T]: Salida<T[K]>;
};

const texto: Esquema<string> = { ejemplo: "catálogo" };
const entero: Esquema<number> = { ejemplo: 1500 };

const campos = { nombre: texto, timeoutMs: entero };

type ServicioDerivado = ValoresDe<typeof campos>;

const servicio: ServicioDerivado = {
  nombre: "catálogo",
  timeoutMs: 1500,
};

console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_07.ts
$ node fig06_07.js
catálogo: 1500 ms
```

`Salida<Esquema<string>>` resolves to `string`; `Salida<Esquema<number>>`, to `number`. That is why the mapped type ends up as `{ nombre: string; timeoutMs: number }`. If you change `timeoutMs` to text in the final object, compilation fails: that is the static check that accompanies the figure's output. Now you can read the more compact form of `Inferir` and of `{ [K in keyof T]: ... }` that the complete schema uses.

The following implementation is deliberately small. It teaches the relationship between an executable rule and the derived type; it does not pretend to replace a mature schema library in a large system. Notice that the only assertion is inside `objeto`, after each key has been validated. It stays concentrated in the generic infrastructure, not spread among those who consume external data.

```ts
// fig06_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

type Esquema<T> = {
  leer(valor: unknown): Resultado<T>;
};

type Inferir<E extends Esquema<unknown>> =
  E extends Esquema<infer T> ? T : never;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

const textoNoVacio: Esquema<string> = {
  leer(valor) {
    if (typeof valor === "string" && valor.trim() !== "") {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser texto no vacío" };
  },
};

const enteroPositivo: Esquema<number> = {
  leer(valor) {
    if (
      typeof valor === "number" &&
      Number.isSafeInteger(valor) &&
      valor > 0
    ) {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser entero positivo" };
  },
};

function objeto<T extends Record<string, Esquema<unknown>>>(
  campos: T,
): Esquema<{ [K in keyof T]: Inferir<T[K]> }> {
  return {
    leer(valor) {
      if (!esRegistro(valor)) {
        return { ok: false, detalle: "debe ser un objeto" };
      }

      const salida: Record<string, unknown> = {};

      for (const [clave, esquema] of Object.entries(campos)) {
        const resultado = esquema.leer(valor[clave]);

        if (!resultado.ok) {
          return { ok: false, detalle: `${clave}: ${resultado.detalle}` };
        }

        salida[clave] = resultado.valor;
      }

      return {
        ok: true,
        valor: salida as { [K in keyof T]: Inferir<T[K]> },
      };
    },
  };
}

const esquemaServicio = objeto({
  nombre: textoNoVacio,
  url: textoNoVacio,
  timeoutMs: enteroPositivo,
});

type Servicio = Inferir<typeof esquemaServicio>;

const resultado = esquemaServicio.leer({
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
});

if (resultado.ok) {
  const servicio: Servicio = resultado.valor;
  console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_05.ts
$ node fig06_05.js
catálogo: 1500 ms
```

`Inferir<typeof esquemaServicio>` does not create a new validation. It takes the output type that the value `esquemaServicio` already describes. If you add `equipo: textoNoVacio` to the fields object, the derived type will gain `equipo` and the validation will demand it at the same time. This relationship reduces a common source of contradictions between static definition and runtime checking.

Inside the `revisor`, a schema can describe both the input configuration and an HTTP response you expect from a particular service. The configuration validation builds `Servicio`; the response validation can build a contract specific to that service before the checking code extracts useful information. You must not use a generic schema to pretend that all remote services respond the same way. Each boundary needs the contract it really promises and the operational rules the project decides to accept.

## The error you will see

With TypeScript 7.0.2 and `strict`, trying to read a property directly from `unknown` produces TS18046. It is the diagnostic that protects the boundary: the compiler knows that you have not yet made a runtime check.

```ts
// fig06_06.ts
function nombreDe(valor: unknown): string {
  return valor.nombre;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_06.ts
fig06_06.ts(3,10): error TS18046: 'valor' is of type 'unknown'.
```

TS18046 is not fixed with `valor as { nombre: string }`. That assertion only changes the compiler's opinion and leaves execution just as exposed. First check that the value is a record, take the property as `unknown`, and check that it is a string. A guard like `esRegistro` from figure 06_02 solves the first part; `typeof valor.nombre === "string"` solves the second.

Another common diagnostic appears when you try to use an environment variable as a number without converting it. `process.env.PUERTO` may be missing and, even when it exists, it is still text. If a function needs a `number`, TypeScript must not accept `string | undefined` as a substitute. The fix is to choose a policy: use a default value for the absence, reject startup, or convert and validate the text. None of those decisions is expressed with a type assertion.

JSON errors have another form because they happen at runtime. `JSON.parse` throws `SyntaxError` if the file contains an extra comma, is missing a quote, or does not have valid JSON syntax. Catch that error close to the file read and convert it into a configuration message. Do not confuse it with an object of the wrong shape: a file can pass `JSON.parse` and still fail later in `leerServicios`.

## What gets done wrong

- **Using `as Servicio` on a JSON.** The assertion does not inspect any value. It can silence the compiler and delay the failure until a remote operation or a part of the dashboard that no longer has context about the original file.

- **Declaring the external result as `any`.** `any` lets properties, calls, and conversions advance without evidence. At a boundary, that comfort eliminates precisely the check the program needs. Receive `unknown` and narrow the type with observable rules.

- **Validating only with `typeof valor === "object"`.** `null` and arrays force you to handle different cases. An object does not guarantee the required properties or their types either; it is only the first step of a structure validation.

- **Accepting invalid numbers because `typeof valor === "number"`.** `NaN`, infinity, fractions, and negative values are numbers to JavaScript. Domain rules must decide which subset represents a valid limit, port, or duration.

- **Converting with `parseInt` and accepting the result without checking the whole text.** `parseInt("3000ms", 10)` accepts a numeric prefix and discards the rest. For configuration, it is preferable to reject the value and ask for an explicit correction.

- **Using default values to hide a variable that is present but badly written.** If `PUERTO=abc`, silently starting on another port creates a difference between the intention and the real process. The default is for deliberate absence, not for replacing errors.

- **Repeating the static definition and the validator without a clear relationship.** Two lists of fields can drift apart when the contract changes. A schema that derives the type, or tests that compare both rules, keeps the obligation to update them together visible.

- **Showing secrets in configuration errors.** Indicating the name of a missing variable can be useful; printing its content can expose credentials in terminals, logs, or HTTP responses. Design the messages to correct without revealing sensitive information.

## Exercises

### Exercise 1 — A URL reader

Write `leerUrl(valor: unknown): Resultado<string>`. It must accept only non-empty text that can be turned into `new URL(valor)`. If the text is not a valid URL, it must return `ok: false` with a readable detail. Test it with `https://catalogo.example` and with `no-es-url`.

### Exercise 2 — A list with unique names

Start from `leerServicios` of figure 06_03. After validating each individual entry, use a `Set<string>` to reject duplicate names. The error must mention the repeated name. Test a list with two entries named `pagos` and confirm that no partial list is delivered to the checking code.

### Exercise 3 — Startup configuration

Define a type `ConfiguracionServidor` with `puerto` and `maxServicios`, both positive integers. Write `leerConfiguracion(entorno: Record<string, string | undefined>): Resultado<ConfiguracionServidor>`. Use `3000` as the default for the port and `20` for the maximum number of services. A variable that is present with invalid content must produce an error, not activate the default.

### Exercise 4 — Available response schema

Use the `Esquema<T>` and `Inferir` pattern to create a schema for a response with `codigoHttp` as a positive integer and `duracionMs` as a non-negative integer. Derive its output type and write a function that receives that type and produces `HTTP 200 en 42 ms`. Explain why that function must not directly receive the result of `JSON.parse`.

## Solutions

### Solution 1

The function first confirms that it received text and then delegates the syntax to `URL`. The constructor can throw, so it is caught only to convert an invalid input into the expected result of the validation.

```ts
function leerUrl(valor: unknown): Resultado<string> {
  if (typeof valor !== "string" || valor.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  try {
    new URL(valor);
    return { ok: true, valor };
  } catch {
    return { ok: false, detalle: "url no tiene un formato válido" };
  }
}
```

This function does not need to query the network. A well-formed URL can point to a target that does not exist; that is a failure of the asynchronous check, not of the configuration.

### Solution 2

The names are checked after each individual object has produced a `Servicio`. That way `servicio.nombre` is already a trustworthy string and you do not need to mix type validation with the uniqueness rule.

```ts
function sinDuplicados(
  servicios: readonly Servicio[],
): Resultado<readonly Servicio[]> {
  const nombres = new Set<string>();

  for (const servicio of servicios) {
    if (nombres.has(servicio.nombre)) {
      return {
        ok: false,
        detalle: `nombre duplicado: ${servicio.nombre}`,
      };
    }

    nombres.add(servicio.nombre);
  }

  return { ok: true, valor: servicios };
}
```

The complete load can call `leerServicios` first and, if it succeeds, pass `resultado.valor` to `sinDuplicados`. If either one fails, no query is started.

### Solution 3

The configuration gathers startup decisions that do not belong to an individual service. Each conversion keeps the variable's name in the detail to make the correction easier.

```ts
type ConfiguracionServidor = {
  puerto: number;
  maxServicios: number;
};

function leerConfiguracion(
  entorno: Record<string, string | undefined>,
): Resultado<ConfiguracionServidor> {
  const puerto = leerEnteroPositivo(
    "PUERTO",
    entorno.PUERTO,
    3000,
  );

  if (!puerto.ok) {
    return puerto;
  }

  const maxServicios = leerEnteroPositivo(
    "REVISOR_MAX_SERVICIOS",
    entorno.REVISOR_MAX_SERVICIOS,
    20,
  );

  if (!maxServicios.ok) {
    return maxServicios;
  }

  return {
    ok: true,
    valor: {
      puerto: puerto.valor,
      maxServicios: maxServicios.valor,
    },
  };
}
```

The default value is applied only in the `valor === undefined` branch. An empty string or a negative number goes through the error branch and forces the environment to be corrected.

### Solution 4

The derived type only exists after validating the object. The presentation function receives an already trustworthy response and does not have to repeat `unknown` checks.

```ts
const respuestaDisponible = objeto({
  codigoHttp: enteroPositivo,
  duracionMs: {
    leer(valor: unknown): Resultado<number> {
      if (
        typeof valor === "number" &&
        Number.isSafeInteger(valor) &&
        valor >= 0
      ) {
        return { ok: true, valor };
      }

      return { ok: false, detalle: "debe ser entero no negativo" };
    },
  },
});

type RespuestaDisponible = Inferir<typeof respuestaDisponible>;

function lineaRespuesta(respuesta: RespuestaDisponible): string {
  return `HTTP ${respuesta.codigoHttp} en ${respuesta.duracionMs} ms`;
}
```

`JSON.parse` must first go through `respuestaDisponible.leer`. Without that validation, the derived type would only be a static promise about a value that may have another shape at runtime.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2`.
- [ ] When you compile and run `fig06_01.ts`, `string` and `rápido` appear, demonstrating that an assertion does not transform the JSON.
- [ ] When you compile and run `fig06_02.ts`, a valid service appears and then the detail that `timeoutMs` must be a positive integer.
- [ ] When you compile and run `fig06_03.ts`, exactly `configuración: 2 servicios` appears.
- [ ] When you compile and run `fig06_04.ts`, the port `8080` appears and an error for `REVISOR_MAX_SERVICIOS`.
- [ ] When you compile and run `fig06_07.ts`, `catálogo: 1500 ms` appears; changing `timeoutMs` to text prevents compiling, because the type was derived from the schemas.
- [ ] When you compile `fig06_06.ts`, TS18046 appears on the line that tries to read `nombre` from `unknown`.
- [ ] In `fig06_03.ts`, with `figuras/package.json` configured as an ESM module, compilation and execution end with `configuración: 2 servicios`.

## Further reading

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — official documentation on type guards and narrowing `unknown`; accessed on October 2, 2026.
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) — official documentation on conditional types and inference with `infer`; accessed on October 2, 2026.
- [Node.js: `process.env`](https://nodejs.org/api/process.html#processenv) — official documentation on environment variables in Node; accessed on October 2, 2026.
- [MDN: `JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — JavaScript reference on parsing JSON text and its syntax errors; accessed on October 2, 2026.
