# Lesson 3 — Objects and the data model

**Time:** 2 × 45 min

**What you build:** the `Servicio` / `Estado` model

**What you learn:** `type` vs `interface`, structural typing, `readonly`, discriminated unions for states

## By the end you will be able to

- Define a `Servicio` object with required properties and explain which contract each one represents.
- Choose between `type` and `interface` when modeling a data shape or a union.
- Explain why TypeScript accepts objects by their shape and not by a nominal label.
- Protect properties that must not be reassigned with `readonly` and recognize its limit at runtime.
- Represent successful and failed results by means of a discriminated union.
- Fix the diagnostics TS2540, TS2339, and TS2741 without turning off `strict`.

## The why before the how

So far the `revisor` has had simple values: a name, a URL, a string that describes a status. That is enough to explain a function or to check that the environment compiles, but it leaves an important question unresolved: how do you keep the data that belongs to the same service from ending up separated, mixed up, or used under different names?

In JavaScript you can store a service's information in several loose variables:

```ts
const nombre = "catálogo";
const url = "https://catalogo.example";
const timeoutMs = 1500;
```

There is nothing wrong with those three lines. The problem appears when there are several services. You would have `nombreCatalogo`, `urlCatalogo`, `timeoutCatalogo`, then `nombrePagos`, `urlPagos`, `timeoutPagos`, and then you would have to remember which values go together. JavaScript does not by itself distinguish one service's name from another's URL. A function can receive three arguments in the wrong order and, if they are all strings or compatible numbers, the error can go unnoticed.

The object solves the first part of the problem: it groups data that describes a single thing. Instead of carrying three disconnected values, you carry a `Servicio`. The property names make visible what each value represents, and the compiler can check that the object carries all the data the program needs.

But an object alone still does not express all the rules of the domain. The `revisor` does not only know configured services: it also produces results. An available result has an HTTP code and a duration; a failed result may not have an HTTP code, but it does have a failure detail. If you model both results as one object full of optional properties, the logic ends up full of ambiguous questions: “is the code missing because the network failed or because nobody assigned it?”, “can I print `detalle` even though the status is available?”, “what does it mean for both fields to exist at the same time?”.

This lesson is about turning those questions into visible contracts. `interface` and `type` let you name object shapes. Structural typing lets a function accept a value because it has the properties it needs, not because it comes from a class or declared that it belongs to a hierarchy. `readonly` communicates that a certain part of a configuration must not change after it is created. Discriminated unions let you describe mutually exclusive states and force you to attend to each path before accessing specific data.

In Go, a `struct` groups fields under a named type. TypeScript also uses objects to group data, but it relies on an important difference: its types are checked before running and erased when emitting JavaScript. `interface Servicio` does not create a class, does not build objects, and does not exist for Node when the program runs. It is a static description of the shape objects must have inside the TypeScript code.

That difference explains two consequences. The first is positive: you can apply a contract to ordinary JavaScript objects without rewriting them as classes or making them inherit from a common base. The second demands care: writing a type is not enough to validate JSON, an environment variable, or an HTTP response. The validation of those boundaries will arrive in lesson 6. Here you will model values that are already trustworthy inside the program.

The goal is not to fill the project with long types. It is to make explicit the decisions that change the `revisor`'s behavior: what a service needs in order to be checkable, which data must not be altered during a check, and what information exists in each possible result. When those decisions live in the type, the compiler can detect impossible combinations before the dashboard or the API try to use them.

## The concepts

### Objects: one thing with data that goes together

A JavaScript object gathers property-and-value pairs. The braces create the object; each property has a name and a value. You can read a property with a dot, as in `servicio.nombre`, or with brackets, as in `servicio["nombre"]`. TypeScript starts from this same JavaScript mechanism and adds the possibility of describing which properties the program expects.

The difference between “an object that today carries these properties” and “an object the program recognizes as `Servicio`” is important. The first can grow, change, or arrive incomplete. The second is a contract: it must have the declared properties, and each one must hold a value of the indicated type. The compiler does not check a network or query a URL; it does check that an object literal written in the program meets the promised shape.

```ts
// fig03_01.ts
type Servicio = {
  nombre: string;
  url: string;
  timeoutMs: number;
};

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre} -> ${servicio.url}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(etiqueta(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_01.ts
$ node fig03_01.js
catálogo -> https://catalogo.example
```

The function does not receive three parameters whose relationship you must remember. It receives a single `Servicio`, and the type documents that this unit has `nombre`, `url`, and `timeoutMs`. It is also easier to extend the contract consciously. If the program later needs a retry policy, you can add `reintentos` to the type and let TypeScript point out the places that must now decide its value.

Inside the `revisor`, the configuration object must describe the service, not the result of querying it. A `Servicio` is stable for the duration of a run: it identifies what you want to check and with what limit. The result will be represented with another type called `Estado`. Separating both ideas avoids a confusing object where a configured URL, an observed HTTP code, and a failure message get mixed together as if they were the same kind of data.

```ts
// fig03_02.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function prepararConsulta(servicio: Servicio): string {
  return `${servicio.nombre}: límite de ${servicio.timeoutMs} ms`;
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

for (const servicio of servicios) {
  console.log(prepararConsulta(servicio));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_02.ts
$ node fig03_02.js
catálogo: límite de 1500 ms
pagos: límite de 3000 ms
```

Do not turn every related piece of data into a class out of habit. For most of the `revisor`'s values, an object with a well-chosen type is enough. Classes add runtime behavior, constructors, prototypes, and sometimes inheritance. None of that is necessary to express that a service has a name, a URL, and a limit. An ordinary object with a clear contract is usually more direct and easier to convert to JSON.

Nor should you use objects as shapeless bags with properties invented on the fly. An annotation like `Record<string, unknown>` works when you really do not know the keys, but a service does have a known vocabulary. If you accept any key for something that has three concrete properties, you lose the help the type could give you.

### `type` and `interface`: two close tools, not two camps

An alias created with `type` gives a name to any type. It can name an object, a union, a literal, an array, or a combination of other types. An interface mainly describes the shape of an object: properties, methods, and relationships it can extend. For a simple data shape, both look almost the same.

```ts
// fig03_03.ts
interface Punto {
  x: number;
  y: number;
}

type Etiqueta = string;

function describir(punto: Punto, etiqueta: Etiqueta): string {
  return `${etiqueta}: ${punto.x},${punto.y}`;
}

console.log(describir({ x: 4, y: 7 }, "origen de prueba"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_03.ts
$ node fig03_03.js
origen de prueba: 4,7
```

The practical choice for this course is simple. Use `interface` for object-shaped entities that represent extensible contracts of the program, such as `Servicio`. Use `type` for unions, compositions, and names for types that are not necessarily objects, such as `Estado`, `"disponible" | "falla"`, or `string | undefined`. It is not a compiler law: both can describe many objects. It is a convention so that whoever reads the code sees right away whether they are facing an entity or a combination of possibilities.

There are differences worth knowing without turning them into a religious debate. An interface can extend another with `extends` and can be declared more than once; TypeScript merges interface declarations with the same name. That merging, called *declaration merging*, is useful mainly when extending a library's declarations. A `type` alias is not reopened that way: if you declare it twice in the same scope, it is an error. In exchange, `type` can directly represent a union, something an interface cannot do.

Do not declare a domain interface twice just because the compiler allows merging it. If one part of the project adds `timeoutMs` and another adds `equipo`, the final contract ends up spread across files and it is hard to discover where each obligation came from. For the `revisor`, each domain entity will have one main declaration, located next to the other shared types.

Also avoid deducing a nonexistent difference: `interface` does not make objects faster, does not generate validation, and does not create a special instance. In the emitted JavaScript, both declarations disappear. The choice is for communicating intent and helping the compiler, not for modifying Node's behavior.

Inside the `revisor`, `Servicio` uses an interface because it expresses the stable shape of a configuration. `Estado`, on the other hand, will be an alias for a union because its function is to declare mutually exclusive alternatives. Reading `type Estado = EstadoDisponible | EstadoFalla` communicates an idea that a single interface cannot express by itself: a result always belongs to one concrete alternative.

```ts
// fig03_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type EstadoInicial = {
  servicio: Servicio;
  tipo: "pendiente";
};

function presentarInicio(estado: EstadoInicial): string {
  return `${estado.servicio.nombre}: pendiente`;
}

const estado: EstadoInicial = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "pendiente",
};

console.log(presentarInicio(estado));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_04.ts
$ node fig03_04.js
catálogo: pendiente
```

The `EstadoInicial` type still has a single alternative because the revisor has not queried anything yet. Further below you will widen the model to describe available and failed results. The important thing is that names are not recycled for different ideas: `Servicio` describes the input of the query; `Estado` describes what the query observed.

In `fig03_04`, `timeoutMs` is still adjustable to show a configuration during its normalization; from `fig03_07` on the model changes and the three properties of `Servicio` are `readonly`, because it now represents the final configuration of a query.

### `readonly`: protecting a reference, not freezing the world

The `readonly` modifier forbids reassigning a property from a place where TypeScript knows that contract. It is useful for identity and configuration data that should not change during the operation. In the `revisor`, changing `nombre` or `url` halfway through a check would make the report hard to interpret: you could start the query for catálogo and end up printing that you checked pagos.

```ts
// fig03_05.ts
interface Registro {
  readonly id: string;
  cliente: {
    nombre: string;
  };
}

const registro: Registro = {
  id: "catalogo",
  cliente: { nombre: "catálogo" },
};

registro.cliente.nombre = "catálogo público";

console.log(`${registro.id}: ${registro.cliente.nombre}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_05.ts
$ node fig03_05.js
catalogo: catálogo público
```

The example shows an essential nuance: `readonly` is shallow. It prevents reassigning `registro.id` and would also prevent replacing `registro.cliente` entirely if that property were `readonly`. It does not prevent modifying the inner properties of `cliente`, because `cliente.nombre` was not declared read-only. Do not confuse “a property cannot point to another object” with “the object it points to is immutable”.

This is like having a fixed label on a folder. You cannot replace the folder associated with the label, but you can edit a sheet inside it if its rules allow. If you need an entire structure to be immutable, you will have to express `readonly` at its relevant levels, use a utility such as `Readonly<T>`, or design operations that build new values. That decision depends on the domain; it is not an automatic consequence of putting a word in front of a property.

`readonly` does not exist as a runtime barrier either. TypeScript erases it when compiling. If external JavaScript obtains a reference to the same object, or if someone uses an assertion to dodge the contract, Node will not block the change by itself. To prevent changes during execution there is `Object.freeze`, although it is also shallow and has other implications. At this stage, `readonly` serves to express a design rule and obtain diagnostics before running.

With TypeScript 7.0.2, the following file prints this error if you try to modify a property declared as read-only.

```ts
// fig03_06.ts
interface Registro {
  readonly id: string;
}

const registro: Registro = { id: "catalogo" };

registro.id = "pagos";
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_06.ts
fig03_06.ts(8,10): error TS2540: Cannot assign to 'id' because it is a read-only property.
```

Inside the `revisor`, mark as `readonly` the properties that identify what is going to be queried: `nombre` and `url`. Do not mark everything automatically. The `timeoutMs` limit could be adjustable by a function that normalizes the configuration before starting the queries; after that boundary, you could build a final `Servicio` with immutable values. The useful question is “who can change this data and at what moment?”, not “how many properties can I freeze?”.

```ts
// fig03_07.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function destinoDe(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url} (${servicio.timeoutMs} ms)`;
}

const pagos: Servicio = {
  nombre: "pagos",
  url: "https://pagos.example",
  timeoutMs: 3000,
};

console.log(destinoDe(pagos));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_07.ts
$ node fig03_07.js
pagos: https://pagos.example (3000 ms)
```

The `destinoDe` function only needs to read the service, so it can accept the read-only contract. This tells whoever calls it that the function must not change the query's destination or alter its limits. If a function needs to build a modified version, it is preferable for it to return a new object with the modification made explicit, instead of silently mutating the configuration that other parts of the program are still using.

### Structural typing: the shape you need is what matters

TypeScript has structural typing. In practical terms, if a value has the required properties with compatible types, it can be used wherever that shape is asked for. It does not need to declare that it “implements” the interface or belong to a family of classes. This idea resembles Go's interfaces: a value is acceptable because it satisfies what the function needs, not because it carries a special label.

```ts
// fig03_08.ts
interface ConNombre {
  nombre: string;
}

function saludar(valor: ConNombre): string {
  return `revisando ${valor.nombre}`;
}

const servicioCompleto = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(saludar(servicioCompleto));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_08.ts
$ node fig03_08.js
revisando catálogo
```

`servicioCompleto` has additional properties, but that does not prevent passing it to `saludar`. The function only promised to read `nombre`; demanding a URL and a timeout would be adding a dependency it does not need. This capability allows designing small functions and small contracts.

Even so, structural typing does not mean you should make every contract as minimal as possible. A function that starts an HTTP query does need a URL and a limit; its parameter must be `Servicio`, not just `ConNombre`. The principle is to ask for exactly what you use, no less and no more. Asking for less can hide a real dependency; asking for more ties simple functions to details that are not their concern.

There is an additional protection for object literals written directly in a call or assignment. If you write `saludar({ nombre: "catálogo", nombreVisible: "Catálogo" })`, TypeScript can warn that `nombreVisible` does not belong to `ConNombre`. That excess property check catches frequent typos. It does not contradict the previous example: a value already stored in a variable can have more properties and still meet a smaller shape.

Inside the `revisor`, a summary may need only a service's name, while the query operation needs the full configuration. There is no need to create a class hierarchy for that difference. It is enough to describe each contract according to its consumer.

```ts
// fig03_09.ts
interface ConNombre {
  nombre: string;
}

interface Servicio extends ConNombre {
  readonly url: string;
  readonly timeoutMs: number;
}

function encabezado(servicio: ConNombre): string {
  return `Servicio: ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(encabezado(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_09.ts
$ node fig03_09.js
Servicio: catálogo
```

`Servicio extends ConNombre` reuses a shape because every service has a name. Even so, `encabezado` does not need to know `Servicio`; it depends on the smaller shape it consumes. This separation will be useful when the API and the dashboard share types: each function will be able to import the contract it requires without receiving an object more coupled than necessary.

Avoid using structural typing as permission to mix distinct concepts just because they happen to have the same shape. Two objects with `{ nombre: string }` are compatible even though one represents a service and the other a responsible person. If the domain requires telling them apart even when they share structure, you will need a more specific design. For this course, property names and clear domain types are enough; nominal branding techniques are reserved for cases where the risk justifies that complexity.

### Discriminated unions: each state brings its own data

A union declares that a value can be one of several alternatives. You have already used unions of literals such as `"disponible" | "falla"`. A discriminated union goes a step further: each alternative is an object that shares a literal property, called the discriminant, but contains its own data. The discriminant lets TypeScript narrow the type when you check its value.

For the `revisor`, the discriminant will be `tipo`. In this first minimal example, an available status carries `codigoHttp` and a failed status carries `detalle`. In the complete model of the next figure, `duracionMs` is added to the available case. They are not optional data of a generic object; they are data that exists because of the kind of result that occurred.

```ts
// fig03_10.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function descripcion(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `HTTP ${estado.codigoHttp}`;
  }

  return `falla: ${estado.detalle}`;
}

console.log(descripcion({ tipo: "disponible", codigoHttp: 204 }));
console.log(descripcion({ tipo: "falla", detalle: "tiempo agotado" }));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_10.ts
$ node fig03_10.js
HTTP 204
falla: tiempo agotado
```

Inside the `if`, TypeScript knows that `estado` is `EstadoDisponible`, because only that alternative can have `tipo: "disponible"`. After the `if`, it knows that `EstadoFalla` remains, because the union had exactly two alternatives. This narrowing is called *narrowing*. It is not a data conversion: the object already had a concrete shape; the condition lets the compiler determine which one.

The design avoids meaningless combinations. With a weak type like this one:

```ts
type EstadoDebil = {
  tipo: "disponible" | "falla";
  codigoHttp?: number;
  detalle?: string;
};
```

you could create an available status without a code, a failure without a detail, or an available status that also has the detail of a failure. All of those combinations would compile, because the type admits optional properties without relating them to `tipo`. The discriminated union builds the relationship into the contract.

Inside the revisor, the complete status keeps the service together with the result. This makes it possible to print a report without reconstructing which service produced each piece of data. Notice that each variant repeats `servicio`; later you will be able to extract that common part if it improves clarity, but repeating a few properties is preferable to hiding a model that is hard to read.

```json fig03_11/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  }
}
```

```json fig03_11/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```ts
// fig03_11/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

export type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

export type Estado = EstadoDisponible | EstadoFalla;

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig03_11/src/main.ts
import { lineaReporte, type Estado } from "./modelo.js";

const catalogo: Estado = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 42,
};

const pagos: Estado = {
  servicio: {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
  tipo: "falla",
  detalle: "tiempo agotado",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```

```bash
$ cd fig03_11
$ npm run compilar
> compilar
> tsc
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

The import uses `type Estado` because it only brings information for the compiler. TypeScript removes that type import from the emitted JavaScript; `lineaReporte`, on the other hand, is a real function and is imported so that Node can run it. The `.js` extension in the relative path is still mandatory because Node will resolve the emitted file.

Do not write conditions based on the presence of a property when you already have a clear discriminant. Asking `if ("codigoHttp" in estado)` can work, but it describes an accidental detail of the representation. Asking `if (estado.tipo === "disponible")` expresses the domain rule: you are attending to the available case. The code is easier to read, and TypeScript can narrow the type directly.

When you add a third alternative, for example `"cancelado"`, the functions that handle the statuses must decide what to do with it. An exhaustiveness check makes that obligation checkable: in the `default` of a `switch`, you assign the remaining status to a `never` variable. `never` is the type that represents an impossible value; if all the alternatives have already been handled, TypeScript accepts that assignment. That friction is an advantage. A new status should not silently appear in the dashboard as if it were a known failure; the guard lets the compiler point out every function that must add a branch.

The following program adds `EstadoCancelado` but leaves the `switch` intact. With TypeScript 7.0.2, `tsc` prints TS2322 because in the `default` an `EstadoCancelado` still remains, which cannot be assigned to `never`.

```ts
// fig03_14.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type EstadoCancelado = {
  tipo: "cancelado";
  motivo: string;
};

type Estado = EstadoDisponible | EstadoFalla | EstadoCancelado;

function descripcion(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `HTTP ${estado.codigoHttp}`;
    case "falla":
      return `falla: ${estado.detalle}`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_14.ts
fig03_14.ts(26,13): error TS2322: Type 'EstadoCancelado' is not assignable to type 'never'.
```

## The error you will see

TS2540 appears when you try to reassign a `readonly` property, as happened in `fig03_06.ts`. The compiler is not saying the object is impossible to use; it is pointing at one concrete operation that contradicts the contract. The right fix depends on the intent: if the identifier really must not change, create a new object with the new value; if it had to be able to change during a normalization stage, use a mutable type only inside that stage and build the final value afterward.

Another frequent diagnostic with discriminated unions is TS2339. It occurs when you try to read a property that does not exist on all the alternatives without checking the discriminant first.

```ts
// fig03_12.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function codigo(estado: Estado): number {
  return estado.codigoHttp;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_12.ts
fig03_12.ts(15,17): error TS2339: Property 'codigoHttp' does not exist on type 'Estado'.
  Property 'codigoHttp' does not exist on type 'EstadoFalla'.
```

TS2339 means that the property is not guaranteed by the current type. `codigoHttp` exists for `EstadoDisponible`, but not for `EstadoFalla`. Do not use an assertion like `estado as EstadoDisponible` to hide the diagnostic: if the result really is a failure, that promise would be false. First check `estado.tipo === "disponible"`; only inside that branch is the HTTP code available.

TS2741 appears when building an object that omits a required property. It is particularly useful when changing the model, because it points out all the constructions that no longer meet the contract.

```ts
// fig03_13.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
};
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_13.ts
fig03_13.ts(8,7): error TS2741: Property 'timeoutMs' is missing in type '{ nombre: string; url: string; }' but required in type 'Servicio'.
```

Do not fix TS2741 by adding invented values such as `timeoutMs: 0` without deciding what zero means. It may be a valid value, it may mean “no timeout”, or it may be a dangerous configuration. The diagnostic does not only ask for a property; it asks you to resolve a domain decision. If the timeout must be mandatory, provide a consciously chosen value. If it really can be missing, model that absence and attend to it before starting a query.

## What gets done wrong

- **Keeping a service in loose variables.** While there is a single service, it seems shorter. With several, the values get mixed up and function signatures become long and fragile. A `Servicio` object keeps together the data that describes a single configuration.

- **Choosing `type` or `interface` as an absolute rule.** Both work for many objects. Using `interface` for object entities and `type` for unions is a useful convention; arguing about which is universally superior distracts from the important question: which shape the program must admit.

- **Using `readonly` as if it were runtime safety.** The modifier only exists during type checking and is shallow. It does not validate external inputs, does not freeze nested objects, and does not stop untyped JavaScript from changing a shared reference.

- **Declaring all the properties optional in a single status.** A type with `codigoHttp?: number` and `detalle?: string` admits contradictory combinations. A discriminated union expresses which properties exist in each alternative and forces you to check the case before using it.

- **Checking accidental properties instead of the discriminant.** `if ("detalle" in estado)` depends on how the object is represented today. `if (estado.tipo === "falla")` expresses the domain decision and makes the type narrowing clearer.

- **Using `as EstadoDisponible` to remove TS2339.** An assertion does not turn a failure into an available result. If the value comes from a union, the safe path is to narrow it with the discriminant. If it comes from outside the program, it must be validated first.

- **Modeling `Servicio` and `Estado` as if they were the same entity.** The service represents the intention to query a URL; the status represents what happened when trying. Keeping them separate prevents an observed response from accidentally changing the configuration that originated it.

## Exercises

### Exercise 1 — A complete service

Define a `Servicio` interface with `nombre`, `url`, and `timeoutMs`, all required. Create two services, `catálogo` and `pagos`, and a function `etiqueta` that receives a `Servicio` and prints its name and URL. Compile with `strict`; then remove `timeoutMs` from one of the objects and explain the diagnostic that appears.

### Exercise 2 — Configuration that does not change

Modify `Servicio` so that `nombre`, `url`, and `timeoutMs` are `readonly`. Try to reassign `url` after creating a service and confirm TS2540. Then write a function `conTimeout(servicio, timeoutMs)` that returns a new `Servicio` object with the limit changed, without mutating the original.

### Exercise 3 — Results report

Define `EstadoDisponible` with `servicio`, `tipo: "disponible"`, `codigoHttp`, and `duracionMs`. Define `EstadoFalla` with `servicio`, `tipo: "falla"`, and `detalle`. Create `type Estado` as a union of both alternatives and a function `lineaReporte` that produces a different line for each case. Test at least one result of each kind.

### Exercise 4 — A new status forces you to decide

Add `EstadoCancelado` with `tipo: "cancelado"` and `motivo`. Include it in `Estado`. Rewrite `lineaReporte` as a `switch` with a `default` that assigns the status to a `never` variable. First leave out the `"cancelado"` case and confirm TS2322; then add its branch so that it also displays it. Identify the functions that have that exhaustiveness check and explain why that is preferable to having a cancellation appear as a generic failure.

## Solutions

### Solution 1

The interface must group the three pieces of data needed to start a query. When `timeoutMs` is deleted, TypeScript produces TS2741 because the configuration no longer meets the contract. The diagnostic is correct: the program still has to decide how long it can wait before declaring a query failed.

```ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url}`;
}
```

### Solution 2

`readonly` prevents assigning to the existing property, but creating a new value is valid. The function returns a copy with the new limit; the spread operator keeps the other properties.

```ts
function conTimeout(servicio: Servicio, timeoutMs: number): Servicio {
  return {
    ...servicio,
    timeoutMs,
  };
}
```

The original object does not change. That property is valuable when the same `Servicio` is shared between the code that builds the report and the code that runs the query.

### Solution 3

The solution needs to ask about the discriminant before accessing the particular data of an alternative. Inside each branch, TypeScript narrows the type automatically.

```ts
function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

There is no need to ask whether `codigoHttp` exists: the comparison with `tipo` already proves that the value is an `EstadoDisponible`.

### Solution 4

The new alternative must be added explicitly to the union and to the function that presents it.

```ts
type EstadoCancelado = {
  servicio: Servicio;
  tipo: "cancelado";
  motivo: string;
};
```

Then, `lineaReporte` needs a branch for `"cancelado"` and an exhaustiveness check at the end of the `switch`.

```ts
function lineaReporte(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
    case "falla":
      return `${estado.servicio.nombre}: falla (${estado.detalle})`;
    case "cancelado":
      return `${estado.servicio.nombre}: cancelado (${estado.motivo})`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```

With all three branches, `estado` is already impossible in `default`, so the assignment to `never` compiles. If you add another alternative to `Estado` and forget its `case`, TS2322 will point at this function. This makes it possible to tell an intentional cancellation apart from a network failure and forces you to update the functions that did choose an exhaustiveness check; a function without that guard cannot promise that the compiler will point it out.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2`.
- [ ] `node --version` starts with `v24`.
- [ ] After creating the structure of `fig03_11`, `cd fig03_11 && npm run compilar && npm run arrancar` prints exactly:

```text
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

- [ ] When you compile `fig03_06.ts` with `npx tsc --strict --target ES2022 --module nodenext fig03_06.ts`, you get TS2540 and you do not try to run it as if it had compiled.
- [ ] When you compile `fig03_12.ts` with `npx tsc --strict --target ES2022 --module nodenext fig03_12.ts`, you get TS2339 and you can explain why `codigoHttp` can only be read after checking `tipo`.
- [ ] When you compile `fig03_14.ts` with `npx tsc --strict --target ES2022 --module nodenext fig03_14.ts`, you get TS2322; you add the `case "cancelado"` and the `never` guard compiles again without `any` or assertions.
- [ ] You can explain that `readonly` protects against reassignment during TypeScript's checking, but does not by itself freeze an object in Node.

## Further reading

- [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — official documentation on objects, interfaces, `readonly` properties, and structural compatibility; accessed on October 2, 2026.

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) — official documentation on interfaces, aliases, and their practical differences; accessed on October 2, 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) — official documentation on type narrowing and discriminated unions; accessed on October 2, 2026.

- [MDN: Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) — reference on the difference between a static restriction and freezing objects at runtime; accessed on October 2, 2026.
