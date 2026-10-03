# Lesson 0 — What TypeScript is and what it is NOT

**Time:** 90 min (or 2 × 45)

**What you build:** nothing yet (reading)

**What you learn:** JS vs TS; types are erased at runtime; what they protect and what they don't; why `strict`

## By the end you will be able to

- Explain the difference between JavaScript and TypeScript without saying they are two languages competing in the browser.
- Compile a `.ts` file, run the generated JavaScript, and recognize which type information disappeared.
- Identify an error that TypeScript can stop before a program runs.
- Identify a case where a type written in TypeScript is not enough to protect data that comes from outside.
- Explain why the course uses `strict` from the very beginning.
- Read and fix the compiler errors TS2345 and TS18048.

## The why before the how

The `revisor` that you will build during this course queries several services, gathers their responses, and shows a report. Even though it looks like a small program at first, it contains a problem that repeats in almost any system: some data has the shape you expect, and some data may arrive with the wrong shape. A service must have a name, a URL, and a status; a response must include an HTTP code; the dashboard must receive the same report the API produced. If someone mistakes a URL for a numeric code, misspells a property name, or treats an incomplete object as a successful response, the program may fail late: perhaps only when a person opens the dashboard, or when an external service answers in an unusual way.

JavaScript lets you write useful programs with very few barriers. You can create an object, add a property to it later, pass a string where another function expected a number, and run the file right away. That flexibility is one of its virtues: JavaScript is good for experimenting, automating tasks, building interfaces, and making quick changes. The cost shows up when the program grows, when several people touch the same code, or when a function stops being obvious on its own. The editor can no longer know for certain what data a function receives, and you end up keeping important rules in your memory, in comments, or in the hope that the tests cover every path.

TypeScript adds a verification layer before execution. That layer describes which values a function can receive, which properties an object must have, and which results an operation can produce. With that information, the compiler checks whether the pieces of the program fit together. It does not wait for the user to find a broken screen or for a real request to reach production: it flags many errors while you write or compile.

The important word is “many”, not “all”. TypeScript does not replace tests, does not turn external data into trustworthy data, and does not by itself prevent a function from having a wrong business rule. If the `revisor` considers that an HTTP 500 response means “service available”, TypeScript can verify that the code is a number, but it cannot guess that your operational criterion is incorrect. Types describe structure and relationships between values; they do not automatically know the world those values represent.

It is also worth clearing up a common confusion from the first lesson: TypeScript does not replace JavaScript at runtime. Node, the browser, and React run JavaScript. The course's normal flow is to write TypeScript, check it with `tsc`, and transform the result into JavaScript before running it. When the `revisor` is running, its types `Servicio`, `Estado`, and `Reporte` will no longer be there as objects that Node can inspect. That has important consequences: an annotation can prevent an error inside your code, but it does not validate the JSON that arrives over HTTP or change a value that is already wrong.

Node 24 LTS can also run a `.ts` script directly as long as its syntax can be erased. In that case it replaces the types with spaces and runs the remaining JavaScript: it does not check types, does not read `tsconfig.json`, and does not support syntax that generates code, such as `enum`. Use it, if it suits you, for an isolated script; the `revisor` will have several files and will be compiled with `tsc` to run `dist/*.js`. The Node page about TypeScript documents this *type stripping* and its limits.

In Go, the compiler also checks types before creating the executable. The practical difference is that a Go program is turned into a native binary, whereas TypeScript produces JavaScript for a platform that already exists: Node or the browser. The useful comparison is not deciding which one “is stricter”, but recognizing a shared discipline: declaring contracts so that integration errors show up earlier. In Go those contracts are written with the language's own types; in TypeScript they are written on top of JavaScript and erased before execution.

That is why the course starts with a reading lesson. Before learning syntax, you need to know what promise the tool makes and which one it does not. If you expect TypeScript to automatically validate a configuration file, you will end up with a false sense of security. If you believe it only adds annoying annotations, you will probably switch off the checks just when they can help you most. The goal is to use it for what it is: a static verifier that makes the contracts of your program visible and forces you to attend to the areas where those contracts are not yet enough.

## The concepts

### JavaScript is still the program that runs

JavaScript is a dynamic language. That means its values are inspected while the program runs. A variable can hold a string now and, if you reassign it, hold a number later. A function can receive any value unless you write runtime checks yourself. JavaScript does not require you to declare all types because its model is designed to decide many things at the moment of execution.

That does not mean JavaScript is careless or that a JavaScript program is doomed to fail. You can write very clear JavaScript, test it well, and validate every input. The problem is one of scale and feedback. If `mostrarEstado` must receive one of two possible states, JavaScript does not warn you when you type `"disponble"` with a missing letter. The program can keep running and show a wrong label, or go down a branch nobody expected. The error stays hidden until some specific path reveals it.

TypeScript takes the same JavaScript code and lets you describe its limits. A literal type such as `"disponible" | "falla"` expresses that not just any string will do: only those two. When a function accepts that type, TypeScript compares every call against the contract before emitting the JavaScript. It is not computing the real status of a service; it is checking that the parts of your program use the same vocabulary.

```ts
// fig00_01.ts
type Estado = "disponible" | "falla";

function describir(estado: Estado): string {
  return estado === "disponible" ? "Servicio disponible" : "Servicio con falla";
}

console.log(describir("disponible"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_01.ts
$ node fig00_01.js
Servicio disponible
```

The program looks almost the same as JavaScript. The TypeScript-specific parts are `type Estado`, the union of literals, and the annotations `: Estado` and `: string`. The rest —the function, the ternary operator, and `console.log`— is ordinary JavaScript. This continuity is an advantage for anyone who already programs in JavaScript: you do not start from zero or learn a different execution engine; you add information that the compiler and the editor can check.

The value of that information grows when the type is reused. If every function in the `revisor` invented its own strings to describe the status, you would soon have `"ok"`, `"OK"`, `"disponible"`, and `"funcionando"` for a single idea. All of them are valid strings for JavaScript, but not all of them are valid for the report you want to build. A shared type fixes a small language for the project. Later on, that language will include statuses with detail, duration, and HTTP code.

Inside the `revisor`, the same idea appears from the smallest possible model. It is not yet about querying a URL or opening a server: it is about preventing the functions that process results from speaking different dialects. If `Estado` says that results can be `"disponible"` or `"falla"`, a function that receives a service can rely on that decision, and a screen can show the two alternatives that really exist.

```ts
// fig00_02.ts
type Estado = "disponible" | "falla";

type Servicio = {
  nombre: string;
  estado: Estado;
};

function resumen(servicio: Servicio): string {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_02.ts
$ node fig00_02.js
[disponible] catálogo
```

Here TypeScript checks several relationships at once. `catalogo` must have `nombre` and `estado`; `nombre` must be a string; `estado` must be one of the two permitted literals; and `resumen` only accepts an object with that shape. The compiler does not need to run a network request to discover a contradiction: it sees it by comparing the written value against the `Servicio` contract.

You do not need to annotate every variable. TypeScript can infer many types from the values. For example, if you write `const nombre = "catálogo"`, the compiler knows it is text. Annotations are most valuable at the edges of a function, in data shared between modules, and in decisions you want to turn into a contract. Writing `const nombre: string = "catálogo"` adds no useful information; writing `function resumen(servicio: Servicio): string` does communicate what goes in and what comes out.

Inference does not remove the need to think either. The compiler infers from the code available, not from the intent you forgot to express. If a list can contain both available and failed services, you will need to model that difference explicitly. If a value can be missing, you will have to admit it in the type and handle it. TypeScript reduces the mechanical work of repeating obvious types so that you can focus your attention on the contracts that change the program's behavior.

### Types are erased before execution

A type annotation is not an instruction for Node. When you compile `fig00_02.ts`, the generated file keeps the function, the object, and the call to `console.log`, but removes `type Estado`, `type Servicio`, `: Estado`, `: Servicio`, and `: string`. Node does not need to understand them because it never receives them.

The essential JavaScript that results from that example looks like this:

```js
function resumen(servicio) {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

This fragment contains no definition of `Servicio`. It does not contain a list of valid values for `Estado` either. The check happened during compilation, before Node read the file. That is why we say TypeScript types are erased: they are information for verifying and developing the program, not data that automatically travels with the program while it runs.

This decision has advantages. The emitted JavaScript does not need a reflection library just to keep the annotations. The browser does not download a representation of every type simply because the project uses TypeScript. Node can run the result the way it runs any other JavaScript module. Also, you can adopt TypeScript gradually: a lot of valid JavaScript can coexist with `.ts` files while you add contracts where they are needed.

It also has a consequence you should repeat until it becomes intuitive: writing a type does not convert a value. If you state that a variable is `number`, the compiler checks the operations inside the TypeScript code, but the emitted JavaScript does not turn `"404"` into `404`. If you declare that a property exists, Node does not create that property. If a received JSON has no `url`, no annotation will make it appear. Annotations describe an expectation; they neither fabricate nor correct data.

This is what distinguishes types from validation. Validation runs and decides what to do with a real value: reject it, fix it, convert it, or return an error. A static type lets the compiler reason about the values the program already considers trustworthy. Both things are necessary, but they happen in different places. In this course, the model's types will come first; validation of JSON, environment variables, and HTTP responses will arrive in lesson 6, when you already understand why it cannot be automatic.

The `revisor` will have types shared between the API and the dashboard. That lets both parts agree on the shape of a report while they are being developed. However, when the browser receives JSON from the API, it receives JSON: text converted into JavaScript objects, not a magical instance of the `Reporte` type. The API must build a correct response, and the dashboard must treat the network boundary with care. Sharing types avoids many contradictions inside the repository; it does not remove the need to validate a boundary.

Erasure also explains why you cannot ask something like `if (servicio is Servicio)` using a TypeScript `type`. The name `Servicio` no longer exists when Node runs. You can, however, check specific properties with JavaScript, for example verifying that a value is an object, that it has a `nombre` property of type string, and that its URL is also a string. That check will be part of a validation function, not part of the type definition.

The practical rule is simple: use types to express contracts between the code you control; use validation to decide whether you accept data that arrives from outside. In real life there are gray areas, such as data from an external library or files created by another part of the same system. If you cannot prove that an input meets the contract, treat it as untrusted until you validate it.

### TypeScript protects internal contracts, not external reality

The compiler only sees the code it receives and the types available to analyze it. It can detect that you passed a number to a function that asks for a string. It can detect that you are trying to use a nonexistent property on an object whose type it knows. It can detect that a variable may be `undefined`. It cannot open an HTTP connection, check that a provider respected its documentation, or know whether the configuration a user wrote yesterday still has the right format today.

The most dangerous case for beginners is the type assertion with `as`. An expression like `valor as Servicio` does not validate the value. It tells the compiler: “from here on, trust that I know this is a `Servicio`”. Sometimes that is reasonable when you have already made a check that TypeScript could not deduce. Using it to silence a doubt about external data, on the other hand, is like taking off the seat belt because the alarm is sounding.

To isolate this boundary, the `Servicio` in the next figure uses a reduced form that differs from the `Servicio` with `estado` of `fig00_02.ts`: it now keeps only `nombre` and `url`. The complete and stable model of the `revisor` will arrive in lesson 3.

```ts
// fig00_03.ts
type Servicio = {
  nombre: string;
  url: string;
};

const servicio = JSON.parse(
  '{"nombre":"pagos","direccion":"https://pagos.example"}',
) as Servicio;

console.log(`${servicio.nombre}: ${servicio.url}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_03.ts
$ node fig00_03.js
pagos: undefined
```

The file compiles without error because the assertion forced the compiler to treat the result as `Servicio`. However, the JSON has `direccion`, not `url`. When it runs, JavaScript looks for a nonexistent property and produces `undefined`. There is no contradiction for the runtime: JavaScript objects may lack a property. The contradiction lies between the promise written with `as Servicio` and the real data.

This example does not mean that `JSON.parse` is bad or that TypeScript is useless when facing JSON. It means that the right order matters. First you receive a value whose shape you do not know; then you verify its properties; only then do you turn it into a value the rest of the program can use as `Servicio`. TypeScript represents that starting point with `unknown`, a type that forces you to inspect before accessing properties. You will study it in more detail when the `revisor` reads its configuration and processes remote responses.

There are other limits you should also recognize. TypeScript does not know whether a URL points to a real server. It does not know whether a `"disponible"` status correctly describes a service's health. It does not know whether two requests arriving at the same time alter a resource in an incompatible way. It does not know whether a password was exposed in a log. It can help you model data so that those problems are easier to see and test, but decisions about security, concurrency, and business require design, validation, and tests.

The type can also be badly designed. If you declare that `codigoHttp` is `number`, you will accept `-5`, `999`, and `3.14` from the type's point of view. Perhaps the program only needs to know it is a number; perhaps the domain demands an integer between 100 and 599. The second rule does not emerge on its own from `number`. Later you will decide where to represent domain constraints: with unions of literals, validators, constructor functions, or a combination of them.

Inside the `revisor`, the data built by your own functions is an area where TypeScript protects a lot. If `crearReporte` receives already verified services and returns a known structure, the types prevent the API and the dashboard from disagreeing on property names. The response that comes from a URL configured by a person is another area: the shared type does not prove that the server delivered the promised JSON. That boundary is validated before the data is turned into internal results.

A healthy way to think about the system is to draw a line. On the internal side, let `strict` be demanding and avoid escaping with `any` or assertions without evidence. At the boundaries, accept that the value does not deserve trust yet and validate it. The type does not disappear as a discipline because external data is uncertain; on the contrary, it helps you point precisely at the moment when data goes from uncertain to usable.

### `strict` turns frequent doubts into explicit work

TypeScript has compilation options that determine how much it checks. Since TypeScript 6, `strict` is `true` by default; TypeScript 7.0.2 already starts from those checks. The commands in this lesson write `--strict` to make the course's decision explicit, not because the compiler needs it to activate it. Whoever uses `--strict false` switches those checks off deliberately. That flexibility is useful for a carefully bounded migration, but it is not the best starting point for a new project.

The `strict` option activates a set of strict checks. Among the most visible are `noImplicitAny`, which prevents untyped values from silently becoming `any`, and `strictNullChecks`, which distinguishes between a present value and one that may be `null` or `undefined`. The set may grow in future versions of TypeScript; that is why it is better to enable the general option than to memorize a list of isolated flags.

In a course from scratch, `strict` is not a punishment or a way to write more text. It is a decision to discover early the places where your program did not express something important. If a function accepts a detail that may be missing, that absence is part of its contract. If a parameter has no type, perhaps you forgot to decide what kind of values it supports. If the compiler forces you to resolve it, it is preventing someone else from having to guess later.

```ts
// fig00_04.ts
function etiquetaDetalle(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
console.log(etiquetaDetalle("200 OK"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_04.ts
$ node fig00_04.js
sin detalle
200 OK
```

The function does not pretend that `detalle` always exists. It declares `string | undefined`, checks the absent case, and only calls `toUpperCase()` when TypeScript can prove that a string remains. That reduction of possibilities is called *narrowing*: after the condition, the type is more specific. You do not need to memorize the term today; you do need to build the habit of attending to the case the contract says can happen.

In the `revisor`, the details of a failure may be missing. A service could answer with an HTTP code and no additional text; a connection could end before producing a response; a configuration could omit an optional label. If you model everything as `string`, the program lets you use it as if there were always content. With `strictNullChecks`, the type keeps the difference between “there is text, even if empty” and “no text was obtained”. That difference improves both the dashboard's messages and the diagnostic logic.

`strict` does not promise that you will never write an assertion or that every case will be obvious. There will be integrations with libraries, browser APIs, or external data where you will have to make a concrete check. The difference is that the escape will be deliberate and localized. Without `strict`, doubts propagate: an `any` enters through one function, passes through five others, and in the end any property access looks valid. Finding the origin then costs far more.

Some people turn on the strict checks at the end, when the project already has thousands of lines. That usually turns adoption into a heavy cleanup: many pending decisions show up at once, and the pressure to deliver leads to disabling rules or filling the code with `as any`. Starting in strict mode keeps the cost small. Every new function resolves its contracts when it is born, and every new type is available to the functions that come after.

Go teaches a similar lesson: the compiler does not let you ignore many incompatibilities that other languages discover late. TypeScript keeps JavaScript's flexibility because it can be adopted little by little, but this course will choose the most demanding route for new code. The intention is not to make the compiler “win” an argument, but to turn real ambiguities into visible decisions.

When you create `tsconfig.json` in lesson 1, `strict` will be part of the base configuration. From then on, a type error is not fixed by removing the option. It is fixed by clarifying the contract: annotating an input, checking a value that may be missing, separating distinct states, or validating external data. That practice will be one of the foundations of the `revisor`.

## The error you will see

The first error appears when a call contradicts the type a function declared. The following program asks for a URL as a string, but receives a number. `tsc` 7.0.2 does not need to run the file to detect the problem.

```ts
// fig00_05.ts
function consultarServicio(url: string): void {
  console.log(url);
}

consultarServicio(404);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_05.ts
fig00_05.ts(6,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

TS2345 means that the value of an argument cannot be assigned to the type of the corresponding parameter. The number `404` may be an HTTP code, but it is not a URL. The fix is not to convert any data to a string to silence the error. First decide what the function represents: if it queries an address, it receives a string such as `"https://pagos.example"`; if it processes an HTTP code, create another function whose parameter is a number. The error revealed that two distinct concepts got mixed up.

The second error is a direct consequence of `strictNullChecks`. The type accepts a string or `undefined`, but the program tries to use it as if it were always a string.

```ts
// fig00_06.ts
function etiquetaDetalle(detalle: string | undefined): string {
  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_06.ts
fig00_06.ts(3,10): error TS18048: 'detalle' is possibly 'undefined'.
```

TS18048 means that the compiler found a valid path in which `detalle` has no value. If that JavaScript ran with `undefined`, trying to read `toUpperCase` would produce a runtime error. The fix is to handle the absence before using the string, as `fig00_04.ts` did, or to change the contract so that the function only receives `string` when that guarantee really exists.

TypeScript's messages are hints, not mechanical instructions. An error can be solved with a condition, with a better-designed type, with a validation, or with a different function. The useful question is not “how do I make TS18048 go away?”, but “can this data be missing according to the program's rules?”. If the answer is yes, handle the case. If the answer is no, find where the validation that should guarantee it is missing.

Also remember that, by configuration, TypeScript can emit JavaScript even when it has reported an error. The compiler is designed so that a gradual migration does not immediately halt an existing JavaScript project. In the `revisor`, compilation errors will be treated as failures that must be fixed before considering a change done. Lesson 1 will configure the project to make that policy explicit.

## What gets done wrong

- Using `any` to get rid of an error. `any` switches off many checks precisely on the value where you needed the most information. It sometimes shows up when integrating existing code, but it should not be the automatic way out. Prefer `unknown` when the value comes from outside, and narrow its type step by step through validations.

- Writing `as Servicio` on data from JSON, HTTP, or environment variables. An assertion does not inspect the value; it only changes what TypeScript assumes about it. If there is no prior validation, you can produce the same `undefined` as in `fig00_03.ts` with a misleading appearance of safety.

- Believing that TypeScript replaces tests. Types detect structural incompatibilities, but they do not prove that a request reaches the right server, that a timeout works, or that a report sorts the services the way the user asked. Use types to close off one class of errors and tests to observe real behavior.

- Turning off `strict` when several messages appear. Errors usually reveal a pending decision: a parameter without a contract, an optional piece of data treated as mandatory, or an unvalidated external boundary. Turning off the rule hides the work, but it does not remove the program's ambiguity.

- Annotating absolutely everything. TypeScript infers simple types precisely. Repeating `const nombre: string = "pagos"` adds noise without reinforcing any boundary. Keep annotations for public contracts, parameters, relevant results, and shared models such as `Servicio`.

- Confusing a type with a business rule. `codigoHttp: number` does not guarantee that a number corresponds to a valid HTTP response. Types express one part of the domain; the remaining rules need validation, tests, and explicit decisions.

## Exercises

### Exercise 1 — Separating concepts

Read the call `consultarServicio(404)` in `fig00_05.ts`. Write two sentences: one explaining why TS2345 is right and another proposing a correct value for a function that receives a URL. Then write a second function signature suitable for processing a numeric HTTP code.

### Exercise 2 — Spotting a false promise

Start from the JSON in `fig00_03.ts`. Without running the program, identify the property that does not match `Servicio` and predict the exact output of `console.log`. Explain why `as Servicio` allowed it to compile even though the object does not have the expected shape.

### Exercise 3 — Making absence explicit

Mentally modify `fig00_06.ts` so that it returns `"sin detalle"` when it receives `undefined` and converts a present string to uppercase. Write what the output must be for `undefined` and for `"tiempo agotado"`. Then compare it with the solution.

### Exercise 4 — From the type to the system boundary

The `revisor` reads a list of services from an external source. Explain where you would put each responsibility: the `Servicio` type, the validation that `nombre` and `url` are strings, and the check that the URL responds. Justify why none of the three replaces the other two.

## Solutions

### Solution 1

TS2345 is right because `404` is a number and the function declared that it needs a string called `url`. A correct value for that function could be `"https://pagos.example"`. If the intention was to work with the code, a suitable signature would be `function describirCodigoHttp(codigo: number): string`. Separating the functions prevents the same parameter from representing two different ideas.

### Solution 2

The incorrect property is `direccion`; the `Servicio` type expects `url`. The output is `pagos: undefined`. The `as Servicio` assertion did not compare the object with the type or add the missing property; it told the compiler to trust a claim that the program did not check. The runtime only sees a JavaScript object with `nombre` and `direccion`.

### Solution 3

The function must check the absent case before calling `toUpperCase()`. For `undefined`, the output must be `sin detalle`. For `"tiempo agotado"`, the output must be `TIEMPO AGOTADO`. The complete solution follows the same pattern as `fig00_04.ts`: a condition resolves the absence and, after it, TypeScript knows the remaining value is a string.

### Solution 4

The `Servicio` type belongs to the internal code shared by the parts of the `revisor`: it expresses that a usable service has a `nombre` and a `url` of type string. The validation belongs right where the list enters the system: it receives a still-uncertain value, checks its properties, and rejects or reports invalid data. The check that the URL responds belongs to the network operation, because a string shaped like a URL can point to a nonexistent server, a slow one, or one with a failed response. The type organizes the code; the validation protects the boundary; the query observes the real state of the service.

## How I know I got it

You can consider this lesson finished when you meet these checks:

- [ ] You can run `npx tsc --version` and get `Version 7.0.2`.

- [ ] You can run `node --version` and get a version that starts with `v24`.

- [ ] When you copy `fig00_01.ts`, compile it with `npx tsc --strict --target ES2022 --module nodenext fig00_01.ts`, and run `node fig00_01.js`, you get exactly `Servicio disponible`.

- [ ] When you compile `fig00_05.ts` with the same command, you get TS2345 and you do not try to run it as if it were a correct program.

- [ ] You can explain why `fig00_03.ts` prints `undefined` even though it compiles without errors.

- [ ] You can fix `fig00_06.ts` without removing `strict` and without changing the type to pretend that `undefined` can never arrive.

- [ ] You can say, without consulting this lesson, that TypeScript checks before running, emits JavaScript, and does not by itself validate external data.

## Further reading

- [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) — official TypeScript documentation; accessed on October 2, 2026.

- [TSConfig: strict](https://www.typescriptlang.org/tsconfig/strict.html) — official documentation for the `strict` option; accessed on October 2, 2026.

- [Node.js: TypeScript](https://nodejs.org/api/typescript.html) — official Node documentation on running and supporting TypeScript; accessed on October 2, 2026.

- [MDN: TypeScript](https://developer.mozilla.org/en-US/docs/Glossary/TypeScript) — definition and context of TypeScript on MDN; accessed on October 2, 2026.
