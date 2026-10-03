# Lesson 4 — Collections, generics, and errors

**Time:** 2 × 45 min

**What you build:** the list of services and the report

**What you learn:** arrays, `Map`/`Set`, generics, utility types; errors: exceptions vs result, `unknown` in `catch`

## By the end you will be able to

- Build and iterate over a typed list of `Servicio` without losing the relationship between each service and its configuration.
- Choose between an array, `Map`, and `Set` according to the question the `revisor` needs to answer.
- Write a generic function that preserves the relationship between the type it receives and the type it returns.
- Use `Pick`, `Omit`, `Readonly`, and `Record` to derive contracts without duplicating the model.
- Represent an operation that can fail with a discriminated union for the result.
- Fix an unsafe access to an `unknown` value inside `catch` without using `any`.

## The why before the how

The model from the previous lesson defined what a `Servicio` is and which shapes an `Estado` can have. That solved an important part of the problem: every value now has an explicit shape. However, a real checker does not query a single service. It needs to keep a list of targets, check each one, gather their statuses, and produce a report that can answer concrete questions: how many services were configured, which ones failed, which result belongs to catálogo, and which names were accidentally repeated.

In JavaScript it is easy to start with several loose values. You can create `catalogo`, `pagos`, and `inventario` as independent variables and then call a function for each one. The approach works for a small demonstration, but the program becomes fragile as soon as the configuration changes. Adding a service forces you to hunt through several places; sorting the report requires repeating logic; and avoiding duplicate names remains a rule that nobody is verifying.

Collections let you express that the data forms a set with a concrete relationship. An array answers “which are the services and in what order do I want to iterate over them?”. A `Map` answers “given this name, what is its status?”. A `Set` answers “have I already seen this name?”. All three structures can hold related data, but they do not do the same job. Choosing a structure out of habit, instead of by the question you need to answer, usually produces code that is slower to read and easier to break.

A difficulty also appears that you do not see with a single type. The `revisor` will process arrays of services, arrays of statuses, and perhaps arrays of messages for the dashboard. You could write a different function for each array, but you would end up copying the same logic. A generic function lets you describe the relationship that is preserved even when the type of the elements changes. It is not about replacing all types with a mysterious letter: it is about saying precisely that the result is still of the same type as the input.

Lastly, this lesson needs to talk about failures before lesson 5 adds asynchronous operations and real queries. A program can fail because a service did not respond, because the configuration has incoherent data, or because a function received something it did not expect. JavaScript allows throwing almost any value with `throw`: an instance of `Error`, a string, a number, or even an incomplete object. Strict TypeScript starts from that reality and treats the `catch` value as `unknown`. That decision may seem awkward at first, but it prevents the error-handling code itself from failing when it tries to read a property that may not exist.

In Go, a function usually returns a value and an `error`, and the caller decides whether it can continue. JavaScript and TypeScript also have exceptions: an operation can interrupt the normal flow with `throw`, and another block can catch it with `catch`. Neither mechanism is automatically better. The useful difference is deciding what kind of failure each one represents. An exception is for an exceptional problem that crosses several layers or for interoperating with a library that already throws errors. A typed result is for when failing is a normal possibility of the domain and the caller must make a visible decision.

The `revisor`'s report must not depend on an invisible exception cutting off the whole run. If pagos fails and catálogo responds, the report still needs to show both facts. That is why the result of checking each service will be modeled as a discriminated union: success with a value, or failure with a detail. The exception, if it appears in a lower layer, is converted into that result before going further. That way the rest of the program works with explicit data and the dashboard can show a complete report.

This separation also avoids a false promise. TypeScript can check that a function returning `Resultado<Estado>` delivers one of the two declared alternatives. It cannot guarantee that a URL exists or that an HTTP response correctly describes a service's health. The validation of external data will arrive in lesson 6. Here you will build the internal structures and contracts that will make it possible to receive, organize, and report that data without mistaking an absence for a success.

## The concepts

### Arrays: an ordered, typed list

A TypeScript array uses the same structure as a JavaScript array. It keeps insertion order, lets you iterate over its elements, and has a length accessible through `length`. The difference is that TypeScript can describe which kind of elements belong in the list. `Servicio[]` means “array whose elements are services”; it does not mean “an object that happens to have some similar properties”.

Order is an important property. If the configuration lists catálogo, pagos, and inventario in that order, the report can respect that order so that whoever reads it finds the results where they expect them. An array is appropriate when you want to iterate over all the elements, keep their sequence, or transform each one with operations such as `map`, `filter`, and `find`.

```ts
// fig04_01.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDe(servicios: readonly Servicio[]): string {
  return servicios.map((servicio) => servicio.nombre).join(", ");
}

const servicios: Servicio[] = [
  {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
];

servicios.push({
  nombre: "inventario",
  url: "https://inventario.example",
  timeoutMs: 2000,
});

console.log(`cantidad: ${servicios.length}`);
console.log(nombresDe(servicios));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_01.ts
$ node fig04_01.js
cantidad: 3
catálogo, pagos, inventario
```

The `Servicio[]` annotation protects both the creation and the later changes. If you tried to add a string, an object without a URL, or a value with a `timeoutMs` of type string, the compiler would flag the problem before running. This is especially useful because `push` changes the existing array: you are not creating a new list that could be checked only at its initial literal.

Notice the parameter of `nombresDe`: it is `readonly Servicio[]`, not `Servicio[]`. The function only needs to read the list. Declaring the parameter as read-only communicates that intent and prevents the function from accidentally doing `push`, `pop`, or reassigning a position. It does not freeze the array at runtime; like `readonly` on a property, it is a static protection. The person who owns the list decides whether it can be modified; a function that only consults it receives a view with fewer permissions.

Inside the `revisor`, the array of services is the working source. The configuration will have an ordered list of `Servicio`, lesson 5 will iterate over it to start concurrent queries, and the report will keep a list of `Estado` so that the dashboard has a representation that is easy to show. Do not turn that list into a `Map` just because each service has a name: you would lose the declared sequence and force the presentation code to decide an order later.

JavaScript admits nonexistent positions and lets you read past the end of an array. `servicios[10]` produces `undefined` if there are only three elements. `strictNullChecks` makes `null` and `undefined` explicit alternatives when a contract already declares them, as happens with `find`, but `strict` by itself does not change the type of an index access: for TypeScript, `servicios[10]` is still `Servicio`. If you want every index access to be treated as potentially absent, turn on `noUncheckedIndexedAccess`; the type then becomes `Servicio | undefined` and you must check it before reading a property. Figure 04_08 shows the diagnostic that option produces. Before indexing a list that came from outside, you must check its length or use an operation that communicates absence, such as `find`.

To isolate the collections, figures 04_01, 04_02, and 04_04 deliberately simplify the final model from lesson 3: `timeoutMs` is mutable and, in figure 04_02, `Estado.servicio` is just the name as a string. In the assembled `revisor`, `Servicio` keeps its configuration properties as read-only and each `Estado` keeps the complete `Servicio`; here the reduced form lets you concentrate on each collection's operation.

Also avoid using `forEach` by reflex. `forEach` is useful for running an effect per element, such as printing a line, but it does not build a result and does not let you exit early in a simple way. `map` transforms all the elements into another array; `filter` keeps only those that meet a condition; `find` gets the first one or `undefined`. Choosing the method by the value you produce makes it more evident what the function intends.

### `Map` and `Set`: lookups by key and membership without duplicates

A `Map<K, V>` associates a key of type `K` with a value of type `V`. Unlike an ordinary object used as a dictionary, a `Map` expresses that its purpose is to store dynamic associations, offers clear methods such as `set`, `get`, `has`, and `delete`, and can use keys that are not strings. For the `revisor`, the natural key will be the service's name and the value will be its status.

`Map#get` returns `V | undefined`, even when the value type does not admit `undefined`. The reason is correct: the key may not exist. Do not ignore that union. An absent status means something different from an available status, and the compiler forces you to resolve the difference before using properties of the result.

```ts
// fig04_02.ts
type Estado = {
  readonly servicio: string;
  readonly tipo: "disponible" | "falla";
};

const estados = new Map<string, Estado>();
estados.set("catálogo", { servicio: "catálogo", tipo: "disponible" });
estados.set("pagos", { servicio: "pagos", tipo: "falla" });

const nombres = new Set<string>(["catálogo", "pagos", "catálogo"]);

console.log(`estados: ${estados.size}`);
console.log(`catálogo existe: ${estados.has("catálogo")}`);
console.log(`inventario: ${estados.get("inventario") ?? "sin resultado"}`);
console.log(`nombres únicos: ${[...nombres].join(", ")}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_02.ts
$ node fig04_02.js
estados: 2
catálogo existe: true
inventario: sin resultado
nombres únicos: catálogo, pagos
```

The `??` operator means “use the right-hand value only if the left-hand one is `null` or `undefined`”. Here it does not ask whether the status is truthy or falsy; it asks whether it does not exist. It is better than `||` when a valid value can be `0`, `false`, or an empty string. Although the statuses in the example are objects and therefore always truthy values, it is worth learning the distinction now.

A `Set<T>` stores values without repeating them. When you add an equal string a second time, the set keeps a single entry. This does not sort the elements alphabetically or turn uppercase into lowercase: `"Pagos"` and `"pagos"` are different strings. If the domain considers those names equal, you must deliberately normalize them before adding them. The structure cannot guess the business rules.

Inside the `revisor`, a `Set<string>` is useful for validating that the configuration does not repeat names. The array keeps the original list and a `Set` is used as support during the check. If every name is added and the size of the set does not grow, you found a duplicate. A `Map<string, Estado>` will be useful after producing the report if you want to get a status by name without iterating over the whole list.

Do not use a `Map` as a universal substitute for an array. The insertion order of `Map` is defined, but that does not mean it should control the presentation of a report. Nor should you use an object with signatures like `{ [nombre: string]: Estado }` just to avoid learning `Map`. A simple object is excellent when you know its properties in advance; a `Map` is clearer when keys appear dynamically during the operation.

### Generics: keeping type information when reusing a function

A generic function uses a type parameter, by convention `T`, to express a relationship between parts of its signature. It is not a value available while Node runs the program; like all TypeScript types, it is erased at compile time. Its job is to let the compiler keep track of the concrete type that arrives at a function and preserve it in the result.

Without a generic, a function that gets the first element of a list could receive `unknown[]` and return `unknown`. That forces the caller to inspect the result again, even though the compiler already knew the list contained `Servicio`. If you write the function to receive `Servicio[]`, you lose the possibility of reusing it with `Estado[]` or another list. The generic joins both needs: it works with several types and preserves which type was chosen in each call.

```ts
// fig04_03.ts
function primero<T>(valores: readonly T[]): T | undefined {
  return valores[0];
}

const puertos = [443, 8080];
const servicios = ["catálogo", "pagos"];

const primerPuerto = primero(puertos);
const primerServicio = primero(servicios);

console.log(`puerto: ${primerPuerto ?? "ninguno"}`);
console.log(`servicio: ${primerServicio ?? "ninguno"}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_03.ts
$ node fig04_03.js
puerto: 443
servicio: catálogo
```

`T` does not mean “anything, with no rules”. It means “a type not yet decided, but consistent within this call”. In the first call, TypeScript infers `T` as `number`; that is why `primerPuerto` is `number | undefined`. In the second, it infers `string`; that is why `primerServicio` is `string | undefined`. The `undefined` remains because an empty array has no first element, regardless of the type of its elements.

Generics can also have constraints. If a function needs to access `nombre`, writing `<T>` is not enough, because not all values have that property. You can write `T extends { nombre: string }` to declare the minimum capability required. The constraint does not force the values to be exactly that object; it allows objects that have at least that property. This takes advantage of the structural typing you saw in lesson 3.

Inside the `revisor`, a generic function will be useful to avoid duplicating infrastructure. For example, the report will be able to group statuses, look up the first element of a list, or wrap a successful result without losing the value's type. Do not make a function generic just because you can. If the operation is designed exclusively for `Servicio`, using `Servicio` in the signature communicates the domain better. A generic is worth it when the logic really works the same for several types and the relationship between types matters to whoever receives the result.

In Go, a generic function also declares type parameters, although the syntax and some rules are different. The useful idea in both languages is the same: you do not write a generic function to avoid thinking about its contracts, but to express that a contract repeats without degrading all its values to a shape that is too broad.

### Utility types: deriving contracts from the model

A utility type takes an existing type and produces another type at compile time. It does not change objects at runtime. `Pick`, `Omit`, `Readonly`, and `Record` are tools included with TypeScript to express frequent relationships without manually copying all the properties of a model.

Copying types seems harmless when a `Servicio` has three properties. The problem arrives when the model changes. If you add `reintentos` to `Servicio` and there are three hand-written partial copies, those copies can become outdated in different ways. Deriving the contract makes clear that it depends on the original and lets the compiler point out changes that now require a decision.

```ts
// fig04_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type ServicioPublico = Omit<Servicio, "url">;
type CambioTimeout = Pick<Servicio, "timeoutMs">;
type ServiciosPorNombre = Record<string, ServicioPublico>;

const cambio: CambioTimeout = { timeoutMs: 2500 };
const visibles: ServiciosPorNombre = {
  catálogo: { nombre: "catálogo", timeoutMs: cambio.timeoutMs },
  pagos: { nombre: "pagos", timeoutMs: 3000 },
};

console.log(visibles.catálogo.nombre);
console.log(visibles.pagos.timeoutMs);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_04.ts
$ node fig04_04.js
catálogo
3000
```

`Pick<Servicio, "timeoutMs">` keeps only the selected properties. It is suitable for a change that must carry exclusively the data that can be modified. `Omit<Servicio, "url">` creates a view without a URL, useful if the dashboard needs to show services but must not receive that property. This is not a security measure by itself: the runtime object may still contain a URL if you send it without transforming it. The type prevents TypeScript code from using it within that contract; the layer that builds the response must decide which data it serializes.

`Readonly<T>` makes the first-level properties of `T` read-only. Use it when a function receives a configuration that must not change. It is not deep: if a property contains another object, the inner properties remain modifiable unless you also declare them `readonly` or use a type designed for that. Nor does it call `Object.freeze`; it does not change JavaScript's behavior.

`Record<K, V>` describes an object whose keys are `K` and whose values are `V`. It is especially useful for representing a serializable structure that already has keys known by type, or a table that you will send as JSON. For a dynamic collection that you will manage with methods such as `has` and `delete`, `Map` usually communicates the intent better. The difference is not automatic performance but operations and meaning.

Inside the `revisor`, `Omit<Servicio, "url">` can define the safe view that will reach the dashboard, `Pick` can represent a limited timeout update, and `Record<string, Estado>` can serve as a report form indexed by name when the HTTP contract really needs a JSON object. The central model is still `Servicio`; utility types are derived views for concrete cases, not anonymous substitutes that hide the domain.

### Errors: exception to interrupt, result to continue

An exception changes the normal flow. When a function runs `throw`, JavaScript looks for the nearest `catch` that can handle it. If it does not find one, the program ends with an error. This mechanism is useful for errors that cannot be resolved locally or for APIs that already report failures through exceptions.

The problem appears when the failure is an expected alternative of the operation. The `revisor` needs to report that pagos failed; it does not need to abandon the entire report. If `revisarServicio` throws an exception for each unreachable service and nobody transforms it, the first problem can keep you from knowing the status of the others. For expected results, a discriminated union keeps the decision in the program's normal flow.

```ts
// fig04_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function dividir(dividendo: number, divisor: number): Resultado<number> {
  if (divisor === 0) {
    return { ok: false, detalle: "el divisor no puede ser cero" };
  }

  return { ok: true, valor: dividendo / divisor };
}

function mostrar(resultado: Resultado<number>): string {
  if (resultado.ok) {
    return `resultado: ${resultado.valor}`;
  }

  return `falla: ${resultado.detalle}`;
}

console.log(mostrar(dividir(12, 3)));
console.log(mostrar(dividir(12, 0)));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_05.ts
$ node fig04_05.js
resultado: 4
falla: el divisor no puede ser cero
```

The `ok` property is the discriminant. When TypeScript sees `if (resultado.ok)`, it knows that inside that branch `valor` exists; in the other branch it knows that `detalle` exists. You do not need to write optional properties such as `valor?: T` and `detalle?: string`, because those optional properties would allow ambiguous states: both pieces of data present or both absent.

In the `revisor`, `Resultado<Estado>` can represent the internal result of a query before integrating it into the report. If a library throws a network exception, a layer close to the operation can catch it, convert it into `{ ok: false, detalle }`, and let the run continue. Lesson 5 will add promises and concurrent operations; the important idea is already in place: a failure per service must be information in the report, not necessarily the end of the process.

Do not turn all errors into results or all alternatives into exceptions. An invalid configuration at startup can be a correct reason to stop the program, because there is no trustworthy run to continue. The lack of response from one out of ten services, on the other hand, is exactly one of the things the report must show. The question is not “which mechanism looks more modern?”, but “who can recover and what information must they receive?”.

### `unknown` in `catch`: inspect before trusting

JavaScript allows throwing any value. Although the healthy convention is to throw instances of `Error`, foreign code can do `throw "sin red"`, `throw 503`, or `throw { mensaje: "falló" }`. That is why, with `strict`, TypeScript treats the `catch` variable as `unknown`: you do not yet have evidence that it is an `Error` or that it has a `message` property.

The solution is not to change the type to `any`. `any` turns off checks exactly where the data is least trustworthy. The solution is to narrow `unknown` with a check that actually runs. `error instanceof Error` checks that the value belongs to the `Error` hierarchy; after that condition, TypeScript lets you read `message`.

```ts
// fig04_06.ts
function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "falla sin detalle legible";
}

try {
  throw new Error("tiempo límite agotado");
} catch (error) {
  console.log(textoError(error));
}

try {
  throw "servicio no alcanzable";
} catch (error) {
  console.log(textoError(error));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_06.ts
$ node fig04_06.js
tiempo límite agotado
servicio no alcanzable
```

The `textoError` function concentrates a small but important policy: which text will be shown when a lower layer throws something. The final case does not try to arbitrarily serialize an object or reveal potentially sensitive details. In a real application you might keep more context in an internal log, but the message that reaches the report or the dashboard must be deliberate.

Inside the `revisor`, the network queries of the next lesson will use this conversion close to the `try/catch`. The result for the rest of the program will be an `EstadoFalla` with a safe detail. This reduces the number of places that need to understand exceptions and prevents React, the API, and the report logic from implementing three different versions of the same inspection.

## The error you will see

With TypeScript 7.0.2 and `strict`, accessing `message` without checking the caught value produces TS18046. The error does not say that exceptions are invalid. It says that the compiler cannot prove that the caught value has a `message` property, because JavaScript allows throwing any value.

```ts
// fig04_07.ts
function mensaje(error: unknown): string {
  return error.message;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_07.ts
fig04_07.ts(3,10): error TS18046: 'error' is of type 'unknown'.
```

The fix is not an assertion like `error as Error`. An assertion only forces the compiler to trust; it checks nothing while the program runs. If someone threw a string, the later access may produce `undefined` or fail in another way. Use a check such as `error instanceof Error` before reading `message`, just as in figure 04_06.

It is also normal to run into TS2322 when trying to store a value of the wrong type in a typed array or `Map`. For example, if a `Map<string, Estado>` expects an `Estado` whose `tipo` property can only be `"disponible" | "falla"`, the string `"correcto"` is not compatible even though it seems to express a similar idea. The diagnostic means that the program's vocabulary is defined in a literal type and the new string does not belong to it. Fix the value to use the agreed literal or, if the domain really gained a new status, modify the union and handle the new case in all the functions that use it.

When a `Map#get` returns a value that may be `undefined`, the usual diagnostic is not a nuisance from the compiler but a design signal. An absent key is a possible case. Decide what should happen: return a failure result, use an explicit default value, stop an operation, or check `has` before reading. Do not use `!` to erase the `undefined` unless you can prove locally that the key exists and the proof is next to the access.

If you turned on `noUncheckedIndexedAccess` in the project, the compiler applies the same caution to an index access. This option does not belong to `strict`: add it explicitly to `tsconfig.json` when the project indexes arrays or tables with indices it cannot prove valid. The result is an additional check that avoids treating as existing an element that JavaScript may return as `undefined`.

```ts
// fig04_08.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

const servicios: Servicio[] = [];
const nombre = servicios[10].nombre;

console.log(nombre);
```

```bash
$ npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts
fig04_08.ts(9,16): error TS2532: Object is possibly 'undefined'.
```

With the same file and only `strict`, TypeScript accepts the access because the index keeps the type `Servicio`; when you add `noUncheckedIndexedAccess`, it demands that you attend to `undefined`. Do not use this option as a replacement for validating external data: it only improves the static contract of accesses to collections that already exist in memory.

## What gets done wrong

Using `any[]` to “make the list accept everything” removes the contract exactly when the collection mixes data from different places. A list of services must not accept numbers, strings, or partially formed objects. If there is a point where you do not yet know the elements, use `unknown[]` and validate each one at the boundary; if the program already knows the contract, use `Servicio[]`.

Copying the definition of `Servicio` to create a dashboard view seems faster than using `Pick` or `Omit`, but it creates contracts that drift apart over time. The problem is not only the repeated text: the central model can change and the copies can keep an old version without the compiler relating the two. Derive a view when its relationship with the model is real, and use a new named type when it represents a different concept.

Using a `Set` to build the report is another frequent mistake. A set answers whether something belongs or does not belong; it does not keep the status associated with each service. If you need to ask “what status did pagos have?”, you need a `Map` or an array of statuses with a lookup. If you need to preserve the display order, also keep an ordered list.

Throwing exceptions for the expected result of each service makes the control flow hard to follow. The caller needs to guess which operations can throw, which errors to catch, and which to let through. For a failure that must appear in the report, return a result alternative or convert it into `EstadoFalla` close to the operation that failed.

Catching an exception and writing `catch (error) { return error.message; }` assumes a guarantee that JavaScript does not offer. It is especially dangerous because the recovery code can fail and hide the original cause. Treat the value as `unknown`, check its shape, and keep a fallback message for unrecognized values.

Finally, do not use `as` or the `!` operator to silence a type you do not like. `map.get(nombre)!` asserts that the result exists, but it does not create an entry in the map. `valor as Estado` asserts that a value meets the model, but it does not validate JSON or an HTTP response. These tools have occasional uses when there is already evidence the compiler cannot infer; they do not replace a check or a design decision.

## Exercises

### Exercise 1 — Detecting repeated names

Write a function `nombresDuplicados(servicios: readonly Servicio[]): string[]`. It must iterate over the list, detect names that appear more than once, and return each duplicated name only once. Use a `Set` for the names seen and another for the duplicates. Test the function with catálogo, pagos, catálogo, and inventario; the output must contain only `catálogo`.

### Exercise 2 — Finding a service by name

Write `buscarServicio(servicios: readonly Servicio[], nombre: string): Servicio | undefined`. It must return the service whose name matches exactly or `undefined` if it does not exist. Then write a line that shows the URL found or the text `servicio no configurado`. Do not use a type assertion to eliminate the `undefined` case.

### Exercise 3 — Turning an array into an index

Write a generic function `porClave<T extends { nombre: string }>(valores: readonly T[]): Map<string, T>`. It must create a `Map` whose key is `nombre` and whose value is the original object. Test it both with an array of `Servicio` and with an array of objects that have `nombre` and a different additional property.

### Exercise 4 — Turning an exception into a result

Define `Resultado<T>` with the alternatives `ok: true` and `ok: false`. Write `ejecutar<T>(operacion: () => T): Resultado<T>` to run a synchronous operation. If the operation returns a value, it must produce success; if it throws any value, it must return a failure with a detail obtained from a function that receives `unknown`. Test an operation that returns `200` and another that throws `new Error("sin conexión")`.

## Solutions

### Solution 1

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDuplicados(servicios: readonly Servicio[]): string[] {
  const vistos = new Set<string>();
  const duplicados = new Set<string>();

  for (const servicio of servicios) {
    if (vistos.has(servicio.nombre)) {
      duplicados.add(servicio.nombre);
    }

    vistos.add(servicio.nombre);
  }

  return [...duplicados];
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "inventario", url: "https://inventario.example", timeoutMs: 2000 },
];

console.log(nombresDuplicados(servicios).join(", "));
```

The function separates two questions. `vistos` answers whether the name has already appeared; `duplicados` avoids adding it several times to the result. If there were three entries called catálogo, the result would still be a single string.

### Solution 2

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function buscarServicio(
  servicios: readonly Servicio[],
  nombre: string,
): Servicio | undefined {
  return servicios.find((servicio) => servicio.nombre === nombre);
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
];

const encontrado = buscarServicio(servicios, "pagos");
console.log(encontrado?.url ?? "servicio no configurado");
```

`find` expresses exactly the contract: it may find an element or find none. The optional chaining `?.` avoids reading `url` when `encontrado` is `undefined`; `??` supplies the fallback text.

### Solution 3

```ts
function porClave<T extends { nombre: string }>(
  valores: readonly T[],
): Map<string, T> {
  const indice = new Map<string, T>();

  for (const valor of valores) {
    indice.set(valor.nombre, valor);
  }

  return indice;
}

const servicios = porClave([
  { nombre: "catálogo", timeoutMs: 1500 },
  { nombre: "pagos", timeoutMs: 3000 },
]);

const equipos = porClave([
  { nombre: "operación", turno: "mañana" },
  { nombre: "soporte", turno: "tarde" },
]);

console.log(servicios.get("pagos")?.timeoutMs);
console.log(equipos.get("soporte")?.turno);
```

The constraint demands the property necessary to form the key, but it keeps all the other properties. That is why the first `Map` keeps `timeoutMs` and the second keeps `turno`.

### Solution 4

```ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "falla sin detalle legible";
}

function ejecutar<T>(operacion: () => T): Resultado<T> {
  try {
    return { ok: true, valor: operacion() };
  } catch (error) {
    return { ok: false, detalle: textoError(error) };
  }
}

console.log(ejecutar(() => 200));
console.log(ejecutar(() => {
  throw new Error("sin conexión");
}));
```

The generic function preserves the type the operation returns. If the operation produces a number, the successful result contains a number; if it produced an `Estado`, it would contain an `Estado`. The exception does not leave `ejecutar`: it is transformed into an explicit alternative that the caller can show or combine with other results.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2`.
- [ ] When you run `npx tsc --strict --target ES2022 --module nodenext fig04_01.ts` and `node fig04_01.js`, a count of three services appears, with the names in the order catálogo, pagos, and inventario.
- [ ] When you run `npx tsc --strict --target ES2022 --module nodenext fig04_02.ts` and `node fig04_02.js`, the set prints two unique names even though an attempt was made to add catálogo twice.
- [ ] When you run `npx tsc --strict --target ES2022 --module nodenext fig04_05.ts` and `node fig04_05.js`, both `resultado: 4` and `falla: el divisor no puede ser cero` appear.
- [ ] When you run `npx tsc --strict --target ES2022 --module nodenext fig04_07.ts`, TS18046 appears on the line that tries to read `message` from `unknown`.
- [ ] When you run `npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts`, TS2532 appears when reading a property of the indexed element without checking `undefined`.

## Further reading

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — official documentation on type parameters, inference, and constraints; accessed on October 2, 2026.
- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — official documentation for `Pick`, `Omit`, `Readonly`, `Record`, and other utility types; accessed on October 2, 2026.
- [TSConfig: useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) — official documentation on the use of `unknown` in `catch` variables; accessed on October 2, 2026.
- [TSConfig: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) — official documentation for the additional check on indexed accesses; accessed on October 2, 2026.
