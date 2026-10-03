# Lesson 2 — Types, functions, and inference

**Time:** 90 min (or 2 × 45)

**What you build:** the `revisor`'s base functions

**What you learn:** primitives, inference, unions and literals, *narrowing*, `null`/`undefined` with `strictNullChecks`

## By the end you will be able to

- Declare `string`, `number`, and `boolean` values, and explain when TypeScript can infer their type.
- Write functions with typed parameters and return values to separate the `revisor`'s rules.
- Model values that can take more than one form by means of unions and literals.
- Narrow a union with `typeof`, comparisons, and explicit checks before using a value.
- Tell `null` apart from `undefined` and handle both without turning off `strictNullChecks`.
- Read and fix the diagnostics TS2345, TS2322, TS18048, and TS2339.
- Compile and run deterministic `revisor` functions with `strict`.

## The why before the how

The `revisor` will end up querying several services, gathering results, and showing them in an API and in a web dashboard. Before getting to HTTP, promises, or React, it needs a small but important layer: functions that turn simple data into readable decisions. They will receive a name, a duration, an HTTP code, or a failure detail, and will return a classification or a report line.

In JavaScript you could write those functions without describing any type. The program would run a call like `clasificarDuracion("rápido")` until it tried to compare the text with a number. The error would appear during execution, perhaps far from the line where the wrong argument was passed. If the branch that contains the problem is not run during a manual test, the error can stay hidden until real data triggers it.

TypeScript changes the moment at which you receive that information. A function can declare that it expects a number of milliseconds and returns a string. The compiler then checks every known call: if someone passes it text, it flags the contradiction before emitting the JavaScript. The type does not make the business rule automatically correct; you still have to decide whether 500 ms is fast or slow. What it does is make sure the rule receives the kind of data it was written for.

This difference seems small when there is a single function and two values. It becomes decisive when the program grows. A function with a clear name and a precise signature is a boundary: whoever calls it knows what to hand over, whoever maintains it knows what it can assume inside, and the compiler checks that both sides match. In Go, parameters and return values are also part of the signature. TypeScript keeps that discipline, even though its types are erased before Node runs the file.

The previous lesson left the environment ready and showed that TypeScript emits JavaScript. This lesson starts to use that checking in a useful way. You are not going to annotate a type on every character or turn the code into a wall of syntax. You are going to let the compiler infer the obvious and write contracts where the intent needs to stay visible: the limits of a function, the possible alternatives, and the absences the program must attend to.

The first risk of the `revisor` is not a slow network; it is losing meaning. A text such as `"200"` may look like an HTTP code, but it is still text. An `undefined` value can mean that nobody provided a detail, that a property does not exist, or that a function returned nothing. A `"disponible"` value looks like an ordinary string until you make it part of a closed set of statuses. Types serve to preserve those meanings while values pass from one function to another.

You do not need to learn every TypeScript type today. In fact, trying to memorize them all before writing functions produces a wrong idea: that programming with types consists of filling in syntactic forms. The useful order is different. First you identify which values the problem has. Then you define what goes into and out of an operation. Lastly, you make explicit the doubts that cannot yet be resolved with a single type.

The `revisor` will use `Servicio` and `Estado` objects in the next lesson. It is not yet useful to introduce that complete model here. You will work with its components: a service's name, a duration, a code, and a detail. That way you can learn what a signature means without mixing it up with properties, interfaces, or discriminated unions. When those compound types appear, you will recognize that they are made of the same pieces you practice today.

## The concepts

### Primitives, annotations, and inference

The most frequent values in the `revisor` begin as JavaScript primitives. A name or a URL is a `string`; a limit or duration is a `number`; a yes-or-no decision is a `boolean`. Write the names in lowercase: `string`, `number`, and `boolean`. `String`, `Number`, and `Boolean` exist as constructors and as wrapper object types, but they are not the usual way to annotate ordinary values.

JavaScript does not distinguish between integer and decimal the way Go does. In TypeScript, `443`, `1500`, and `42.5` are `number`. That decision comes from JavaScript's numeric model: an HTTP code, a port, and a duration can share the basic type even though they have different meanings. Later, clear names, objects, and validations will help preserve the context. For now, do not declare a supposed `int`: it does not exist as a TypeScript primitive type.

An annotation goes after the name: `const timeoutMs: number = 1500`. It is not mandatory to write it when the initial value already expresses the type. In `const timeoutMs = 1500`, TypeScript infers that the value is a number. Inference is not a guess that happens only in the editor; it is part of the program's checking. The compiler observes the initializer and keeps enough information to check later uses.

```ts
// fig02_01.ts
const nombre = "catálogo";
const timeoutMs: number = 1500;
const usaHttps = true;

console.log(`${nombre}: ${timeoutMs} ms; HTTPS: ${usaHttps}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_01.ts
$ node fig02_01.js
catálogo: 1500 ms; HTTPS: true
```

The annotation on `timeoutMs` is valid, but the line would also have compiled without `: number`. Do not write repetitive annotations just because they exist. If the value and the name make the intent clear, inference reduces noise without losing safety. An annotation, on the other hand, is especially useful in a public signature, in a return type you want to keep stable, or where the initial value does not communicate the whole contract.

`const` and `let` relate to whether a variable can be reassigned, not to whether TypeScript checks types. Use `const` by default when the name will keep pointing to the same value. Use `let` when the variable must receive another value later. Avoid `var`: it has old scoping rules and makes it harder to follow where a value can change.

```ts
// fig02_02.ts
let pendientes = 2;
pendientes = pendientes - 1;

const mensaje = pendientes === 0 ? "sin pendientes" : `${pendientes} pendiente`;

console.log(mensaje);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_02.ts
$ node fig02_02.js
1 pendiente
```

In the `revisor`, settings that do not change during a normal run will usually be expressed with `const`. A computed duration, a received HTTP code, or a local counter could use `let` if the logic needs to update them. The question is not “which word do I use most?”, but “should this name point to another value?”. Choosing `const` when you can reduces the possible paths of change and makes a function easier to read.

Inference also has healthy limits. If you declare `let estado = "pendiente"`, TypeScript usually infers `string`, not just the literal `"pendiente"`, because `let` allows reassignment. If you declare `const estado = "pendiente"`, the value does not change and it can keep more specific information. This difference will be useful when modeling literals. Do not force precision on every local variable; use it when the set of alternatives has meaning for the domain.

Inside the `revisor`, you do not need to declare a separate variable for each piece of data if it is only used once. A function can receive a value and return another right away. Declare names when they make the rule easier to read, not to imply that every step needs storage. A name like `limiteRapidoMs` explains a decision; a name like `x` forces you to look up its origin every time.

### Functions: contracts that go in and out

A function receives values, runs a rule, and may return a result. In JavaScript, that structure already exists. TypeScript adds the possibility of describing its parameters and its return value. The signature `function clasificarDuracion(duracionMs: number): string` says three things: the function is called `clasificarDuracion`, it expects a number, and it produces a string.

Parameter types are contracts with the calls. Inside the function, `duracionMs` can be used as a number. Outside it, a call must supply a number. The return type is a contract in the other direction: the caller can treat the result as a string. This information lets the editor offer suitable operations and lets the compiler find incompatibilities before running.

```ts
// fig02_03.ts
function duplicar(valor: number): number {
  return valor * 2;
}

const resultado = duplicar(21);

console.log(resultado);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_03.ts
$ node fig02_03.js
42
```

The `: number` return type in this example could be inferred because `valor * 2` produces a number. Even so, it is reasonable to write the return type on functions that represent rules of the program. The signature becomes a quick way to see the intent and prevents a later edit from accidentally changing what the function promises to return. It is not an absolute obligation: on very short local functions, letting TypeScript infer the return type may be clearer.

A function that only performs an effect, for example printing a line, can declare a `void` return type. `void` does not exactly mean that no JavaScript value exists; it means that the caller must not depend on a useful result. In the `revisor`, it is advisable to separate the functions that compute text from those that print it. The first can be tested with precise inputs and outputs; the second is limited to presenting that result.

```ts
// fig02_04.ts
function clasificarDuracion(duracionMs: number): string {
  if (duracionMs <= 500) {
    return "rápido";
  }

  return "lento";
}

function imprimirClasificacion(nombre: string, duracionMs: number): void {
  console.log(`${nombre}: ${clasificarDuracion(duracionMs)}`);
}

imprimirClasificacion("catálogo", 420);
imprimirClasificacion("pagos", 850);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_04.ts
$ node fig02_04.js
catálogo: rápido
pagos: lento
```

The decision that 500 ms is the limit does not come from the type. It is a rule of this example. TypeScript verifies that the comparison receives a number and that the paths return strings; it cannot decide for you which threshold represents an acceptable service. This boundary is important: types protect the shape of a decision, while tests, observation, and requirements define whether the decision is the right one.

A signature with several parameters can be appropriate as long as the values are few and have distinct meanings. `formatearLinea(nombre, duracionMs)` is easy to read. When the parameters start to be numerous, optional, or easy to swap, an object with property names will be better. That transition comes in the next lesson with `Servicio`. Do not jump ahead by creating anonymous objects for a function that only needs a number and a text.

Functions also help avoid duplication. If each part of the program decides on its own which duration is fast, sooner or later different limits will appear. Centralizing the rule in `clasificarDuracion` does not make the program magical, but it leaves a single decision to review when the criterion changes. The dashboard, the API, and the tests will be able to use the same function or a well-defined equivalent rule.

In Go, a function's signature demands explicit types for parameters and return values. TypeScript is more flexible because it can infer part of that information, but you lose nothing by using types at the important boundaries. The useful difference is that TypeScript works on JavaScript's values and allows very expressive unions; the discipline is still the same: a small function must say what it needs and what it guarantees.

### Unions and literals: representing real alternatives

A union expresses that a value can belong to one of several alternatives. It is written with `|`: `string | number` means “a string or a number”. It does not mean “both at once”, nor does it mean you can freely use all the operations of both types. It means that, before using an operation exclusive to one alternative, you will have to know which one you have.

Literals let you be more precise than a broad type. `"disponible"` is one concrete string; `"disponible" | "falla"` is a closed set of two concrete strings. This precision is useful when a text is not just any message, but a category of the domain. The status of a check should not accept `"tal vez"` by accident if the program only understands available or failed.

```ts
// fig02_05.ts
type Prioridad = "normal" | "urgente";

function etiquetaPrioridad(prioridad: Prioridad): string {
  return prioridad === "urgente" ? "atención inmediata" : "seguimiento normal";
}

console.log(etiquetaPrioridad("normal"));
console.log(etiquetaPrioridad("urgente"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_05.ts
$ node fig02_05.js
seguimiento normal
atención inmediata
```

The name `Prioridad` does not create a value at runtime; it is a type alias. The emitted JavaScript only keeps the function, the comparisons, and the strings. Even so, during compilation it prevents a call like `etiquetaPrioridad("crítica")` until you explicitly decide to add that alternative to the contract.

Literals are not a decoration for every text. If a variable holds a free-form message written by a person, it should normally be `string`. If it holds a control value that changes the logic, a literal or a union of literals makes the permitted options visible. The useful question is: “do I accept any text, or only known categories?”.

Inside the `revisor`, an initial classification can be a union of literals before becoming the fuller `Estado` model. The next function receives an HTTP code and produces a limited category. It does not pretend to replace all the HTTP rules; it only makes clear that the initial report distinguishes two observable results.

```ts
// fig02_06.ts
type ResultadoBasico = "disponible" | "falla";

function resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico {
  if (codigoHttp >= 200 && codigoHttp < 400) {
    return "disponible";
  }

  return "falla";
}

console.log(resultadoDesdeCodigo(204));
console.log(resultadoDesdeCodigo(503));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_06.ts
$ node fig02_06.js
disponible
falla
```

The chosen range is a deliberate simplification for this stage. Later the `revisor` will need to distinguish network failures, timeouts, unsuccessful codes, and valid responses. The current gain is learning to express that a function does not return an arbitrary string. Its possible outputs are named and finite.

Do not confuse a union with a list of values that the program must iterate over. `string | number` describes one of two possible types; it does not create an array. Nor is it an invitation to turn everything into unions. If a function always receives a number, declaring `number | string` just to accept more cases makes it harder to use. Widen a contract when the reality of the domain demands alternatives, not to avoid deciding which data must arrive.

### *Narrowing*: using an alternative only after checking it

When a function receives a union, TypeScript must be conservative. If it receives `string | number`, it can apply operations that both alternatives share, but not `toUpperCase`, because numbers do not have that method. The solution is not an assertion or `any`: it is checking the value with a condition that would also be necessary in JavaScript.

Type narrowing happens when TypeScript understands that a branch eliminates alternatives. `typeof valor === "string"` narrows `string | number` to `string` inside that branch. Outside it, or in the opposite branch, the type adjusts according to the condition. The program becomes safe because the runtime check and the static knowledge express the same decision.

```ts
// fig02_07.ts
function mostrarPuerto(puerto: number | string): string {
  if (typeof puerto === "string") {
    return `puerto configurado: ${puerto}`;
  }

  return `puerto numérico: ${puerto}`;
}

console.log(mostrarPuerto(443));
console.log(mostrarPuerto("8080"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_07.ts
$ node fig02_07.js
puerto numérico: 443
puerto configurado: 8080
```

In this example both alternatives end up interpolated as text, so the code might look unnecessary. Its purpose is to show where each form becomes available. If you had to apply `puerto.padStart(4, "0")`, you could only do it inside the string branch. If you needed to compare it numerically with a limit, it would make sense to handle the numeric branch or to explicitly convert and validate the text.

Equality against a literal also narrows types. If `resultado` is `"disponible" | "falla"`, the condition `resultado === "disponible"` lets TypeScript treat the value as the literal `"disponible"` inside the branch. This may seem redundant because both alternatives are strings, but it becomes essential when each alternative carries different data in a discriminated union. That construct will arrive in lesson 3.

Inside the `revisor`, a function can accept a duration that is not yet available. If it exists, it classifies the duration; if not, it returns a text that explains the absence. The check does not just placate the compiler: it defines what a person should see when the program has no measurement.

```ts
// fig02_08.ts
function resumenDuracion(duracionMs: number | undefined): string {
  if (duracionMs === undefined) {
    return "sin duración registrada";
  }

  return duracionMs <= 500 ? `${duracionMs} ms: rápido` : `${duracionMs} ms: lento`;
}

console.log(resumenDuracion(320));
console.log(resumenDuracion(undefined));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_08.ts
$ node fig02_08.js
320 ms: rápido
sin duración registrada
```

Do not invent a duration such as `0` to avoid handling `undefined`. Zero can be a real measurement, an impossible duration, or a placeholder value, depending on the system. Swapping “there is no data” for a number mixes two distinct meanings and lets a later condition draw a wrong conclusion. A union forces you to name the absence and decide what to do with it.

Also avoid a condition based on the truthiness of a number when what you need to check is absence. `if (!duracionMs)` treats `0`, `NaN`, `null`, and `undefined` as falsy. If the question is “is the duration absent?”, write `duracionMs === undefined` or the exact check that represents your rule. Truthiness conditions are useful, but they do not replace a precise decision about valid values.

### `null`, `undefined`, and `strictNullChecks`

JavaScript has two frequent values for expressing absence: `undefined` and `null`. `undefined` appears, for example, when reading a nonexistent property, omitting an optional argument, or ending a function without `return`. `null` is usually a value intentionally assigned to say there is no result. The language does not impose a universal difference; the project must choose conventions that communicate intent.

With `strictNullChecks` on, `null` and `undefined` cannot be used where a `string`, a `number`, or another non-nullable type is expected. To admit them, you must write it: `string | undefined`, `string | null`, or `string | null | undefined`. This requirement is not bureaucracy. It makes the contract reveal that a function may have no answer, and forces you to handle that possibility before calling methods or reading properties.

```ts
// fig02_09.ts
function detalleVisible(detalle: string | null): string {
  if (detalle === null) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(detalleVisible("tiempo agotado"));
console.log(detalleVisible(null));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_09.ts
$ node fig02_09.js
TIEMPO AGOTADO
sin detalle
```

There is no general rule saying that `null` is always better than `undefined`. For an optional parameter of a function, `undefined` usually fits JavaScript's normal behavior: if the caller omits the argument, the value is `undefined`. For a piece of data whose source explicitly communicates “does not exist”, `null` can be a good representation. The important thing is not to use both as synonyms without reason, because doing so forces every consumer to handle two forms of the same absence.

The `revisor` will use `undefined` when a local function did not receive a duration or did not generate a detail. When a future API receives JSON, it will have to validate whether the field is absent, whether it is `null`, or whether it contains another type. Those external boundaries are studied in lesson 6. For now, types only describe internal values that you have already decided to represent in a certain way.

```ts
// fig02_10.ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}

console.log(lineaDeFalla("pagos", "tiempo agotado"));
console.log(lineaDeFalla("catálogo", undefined));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_10.ts
$ node fig02_10.js
pagos: falla (tiempo agotado)
catálogo: falla sin detalle
```

`strictNullChecks` does not protect you against external data by itself. A JSON can claim anything, and an assertion like `as string` can lie to the compiler. This option's protection begins once a value has a trustworthy type inside the program: it keeps you from forgetting that it may be missing. The validation that turns unknown inputs into trustworthy data requires runtime checks and will come later.

In Go, a zero value can hide an absence if it is not modeled carefully: an empty string and the number zero can be valid values or signs that there was no data. TypeScript makes absence visible with unions. That does not remove the need to design a convention, but it makes it harder to ignore a possibility that the signature already declared.

## The error you will see

TS2345 appears when an argument does not match the type of a parameter. With TypeScript 7.0.2, `tsc` prints the following diagnostic. The function expects a `number`, but the call hands it a quoted string.

```ts
// fig02_11.ts

function etiquetaPuerto(puerto: number): string { return `puerto ${puerto}`; }

console.log(etiquetaPuerto("443"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_11.ts
fig02_11.ts(5,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

TS2345 does not mean that TypeScript cannot work with the value. It means that this call contradicts this function's contract. The fix depends on the intent. If 443 is a known port written in the code, remove the quotes: `etiquetaPuerto(443)`. If the value arrived as text from configuration, do not convert it with an assertion; validate and transform the data at the boundary before handing it to a function that demands a number.

TS2322 appears when you try to assign an incompatible type to a variable, property, or typed return. It is the same compatibility problem, but seen in an assignment instead of a call. For example, `const timeoutMs: number = "1500"` produces TS2322 because the left side demands a number and the right side offers a string. Read both sides of the diagnostic before changing code: it often reveals a domain decision that is not yet clear.

TS18048 appears when you use a value that may be `undefined` as if it always existed. The following file does not compile because `toUpperCase` can only be called on a present string.

```ts
// fig02_12.ts

function detalleEnMayusculas(detalle: string | undefined): string {
  return detalle.toUpperCase();
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_12.ts
fig02_12.ts(4,10): error TS18048: 'detalle' is possibly 'undefined'.
```

The fix is not to turn off `strictNullChecks` or to write `detalle!` to silence the diagnostic. First you must decide what the absence represents. If there is no detail, perhaps the report should say `"sin detalle"`. If a detail is mandatory, then the signature must be `detalle: string` and the caller must provide one. If the absence is valid, check for it before using the value:

```ts
function detalleEnMayusculasSeguro(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "SIN DETALLE";
  }

  return detalle.toUpperCase();
}
```

TS2339 usually appears when trying to use an operation that does not exist on every member of a union. For example, `valor.toUpperCase()` is not valid if `valor` is `string | number`, because a number does not have that method. Use `typeof valor === "string"` before applying a string-only operation. The check is not a formality for the compiler: it is the runtime branch that stops Node from trying to call a nonexistent method.

When one of these diagnostics appears, avoid looking first for a conversion or an assertion. Ask three questions: which value really exists at that point, which value the function or variable expects, and whether the difference reflects invalid data or a valid alternative that still needs to be modeled. This sequence usually finds the problem closer to its cause than a quick fix that only makes the TSxxxx code disappear.

## What gets done wrong

- **Annotating every variable even though the initializer is already clear.** `const nombre: string = "catálogo"` is not incorrect, but repeating information on every line hides the annotations that do express a decision. Let TypeScript infer obvious local values; annotate signatures, contracts, and points where the type needs to be explicit.

- **Using `any` to get rid of a type error.** `any` turns off checks exactly where TypeScript could detect a wrong integration. If a piece of outside data does not yet have a known shape, it will be `unknown` until it is validated. If an internal piece of data has valid alternatives, use a union and narrow it.

- **Accepting `string | number` when the domain needs a number.** A broad union may look flexible, but it forces every function to handle two cases. If a port must be numeric inside the `revisor`, convert and validate it once on the way in; after that, use `number` in the rest of the program.

- **Using `as` or `!` to hide TS18048.** An assertion does not make an absent value present. `detalle!` may compile, but Node will still fail if the value was `undefined`. Model the absence, check for it, and define the result each case must produce.

- **Representing absence with `0`, `""`, or `false` without defining it.** Those values can be valid data. If `0` means “there was no measurement”, you will no longer be able to tell it apart from a real measurement of zero. Use `undefined` or `null` when the absence is part of the contract and keep the valid values for their own meaning.

- **Confusing a union with permission to ignore alternatives.** If a signature declares `string | undefined`, every person who uses it must decide what happens when there is no string. The union does not make the value a string; it makes visible that the program has two paths.

- **Writing repeated classification rules.** If one part considers a 500 ms service fast and another uses 300 ms, the report loses consistency. Name and centralize the rule in a small function. When the criterion changes, there will be one explicit decision to update and test.

## Exercises

### Exercise 1 — Classifying a duration

Write `clasificarDuracion(duracionMs: number): "rápido" | "lento"`. Define that a duration of 500 ms or less is `"rápido"` and a longer duration is `"lento"`. Invoke the function with 500 and 501, print both outputs, and confirm that a call with `"500"` produces TS2345.

### Exercise 2 — A baseline line for the revisor

Write `lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string`. It must use `clasificarDuracion` and return a line like `catálogo: HTTP 200, rápido`. Run the function with catálogo, code 200, and duration 320. Then try passing `"200"` as the code and explain why the compiler rejects it.

### Exercise 3 — Details that may be missing

Write `lineaDeFalla(nombre: string, detalle: string | undefined): string`. If a detail exists, it must produce `nombre: falla (detalle)`; if it does not exist, it must produce `nombre: falla sin detalle`. Test both cases without using `any`, `as`, or the `!` operator.

### Exercise 4 — A literal forces you to decide

Define `type ResultadoBasico = "disponible" | "falla"`. Write `resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico` to classify codes from 200 to 399 as available and all others as failed. Then create `etiquetaResultado(resultado: ResultadoBasico): string` that returns a different text for each alternative. Try calling it with `"pendiente"` and explain the diagnostic.

## Solutions

### Solution 1

The return type is a union of literals because the function must not produce just any string. The comparison includes 500, which is why `<=` is used.

```ts
type Clasificacion = "rápido" | "lento";

function clasificarDuracion(duracionMs: number): Clasificacion {
  return duracionMs <= 500 ? "rápido" : "lento";
}
```

A call like `clasificarDuracion("500")` produces TS2345. The quotes make the value a `string`, while the function was written to compare numbers.

### Solution 2

The function receives three simple values because this stage does not yet introduce the `Servicio` object. The classification function avoids duplicating the 500 ms rule.

```ts
function lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string {
  const clasificacion = clasificarDuracion(duracionMs);
  return `${nombre}: HTTP ${codigoHttp}, ${clasificacion}`;
}
```

The correct call is `lineaBase("catálogo", 200, 320)`. Using `"200"` contradicts the contract: an HTTP code is handled as a number inside this function.

### Solution 3

The exact comparison with `undefined` narrows the type to `string` in the second return. That way, `detalle.toUpperCase()` or any other string operation would be safe inside that branch.

```ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}
```

The absence is not disguised as an empty string. The report keeps the difference between receiving a message and not receiving one.

### Solution 4

The union of literals restricts both what the classifying function returns and what the presentation function accepts.

```ts
type ResultadoBasico = "disponible" | "falla";

function resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico {
  return codigoHttp >= 200 && codigoHttp < 400 ? "disponible" : "falla";
}

function etiquetaResultado(resultado: ResultadoBasico): string {
  if (resultado === "disponible") {
    return "el servicio respondió";
  }

  return "el servicio necesita atención";
}
```

`etiquetaResultado("pendiente")` produces TS2345 because `"pendiente"` does not belong to the declared set. If the program really needs that alternative, you must add it to the type and update the functions that handle it.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2`.
- [ ] Every figure that compiles in this lesson finishes without diagnostics with `--strict --target ES2022 --module nodenext`.
- [ ] `fig02_04.ts` prints exactly `catálogo: rápido` and `pagos: lento`.
- [ ] `fig02_08.ts` prints a classification for 320 ms and `sin duración registrada` for `undefined`.
- [ ] When you compile `fig02_11.ts`, you get TS2345 and you do not run the file as if it had compiled.
- [ ] When you compile `fig02_12.ts`, you get TS18048 and you can fix it with an explicit check for `undefined`.
- [ ] You can write a function that returns `"disponible" | "falla"` without accepting a third string by accident.
- [ ] You can explain why `strictNullChecks` forces you to attend to an absence instead of turning it into `0`, `""`, or `false`.

## Further reading

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — official documentation on primitives, annotations, inference, functions, unions, and literals. Accessed on October 2, 2026.

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — official documentation on signatures, parameters, return values, inference, and functions that do not return a useful value. Accessed on October 2, 2026.

- [TypeScript TSConfig: `strictNullChecks`](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) — official documentation on the separate treatment of `null` and `undefined` in strict mode. Accessed on October 2, 2026.

- [MDN: `null` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null) — reference on `null` in JavaScript and its practical difference from other absent values. Accessed on October 2, 2026.
