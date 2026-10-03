# Lesson 7 — Modules, tests, and quality

**Time:** 2 × 45 min

**What you build:** the real project, with tests

**What you learn:** ESM modules, organization by responsibility, table-driven tests, lint and formatting

## By the end you will be able to

- Split the `revisor` into ESM modules with named responsibilities and explicit dependencies.
- Import values and types from relative files using `.js` extensions that Node accepts.
- Write a table-driven test that checks available results and failures.
- Interpret a TS2305 error caused by an export or import that does not match.
- Configure separate commands to compile, test, check style, and format a project.
- Decide which code should be pure and easy to test, and which code belongs at the boundaries of files, network, or console.

## The why before the how

Up to the previous lesson, the `revisor` can already do useful work. It has a `Servicio` model, represents each outcome with a discriminated union `Estado`, queries several targets concurrently, and validates its configuration before using it. Even so, the examples still fit in a few files. That helps when studying an isolated idea, but it is not enough to sustain a program that will keep growing with an HTTP API in lesson 8 and a screen in lesson 9.

A large file has an initial advantage: everything is in view. It also has a cost that rises quickly. To find out how a state is presented, you walk through configuration code, validation, timers, and queries. To test a text rule, you end up importing or running pieces that have nothing to do with that text. To change a detail of the HTTP response, you may accidentally touch a rule the dashboard needs to keep. The problem is not that a long file is morally bad; it is that it stops communicating where each decision lives.

Modules solve that lack of boundaries. A module is a file that declares which values it offers with `export` and what it needs from other modules with `import`. That boundary is not a comment or a suggestion for whoever maintains the code: TypeScript verifies that the imported names exist, and Node resolves the files that will be loaded at runtime. When `reporte.ts` exports `lineaReporte`, it announces a concrete capability. When `revisor.ts` imports `Servicio` and `Estado`, it makes visible which concepts it needs to coordinate a check.

In JavaScript, ESM modules are also a solution to a historical problem. It used to be common to load several files through `<script>` tags and depend on a global loading order. One file could assume that another had already created a global variable, even though nothing in its code showed that relationship. If the order changed, the error appeared at runtime. ESM replaces that implicit agreement with a declared relationship: the file that needs something imports it with a concrete path. Node can build the dependency graph before starting the program.

The `revisor` needs an organization that grows without creating catch-all drawers. It is not a good idea to put all the interfaces in a folder called `types`, all the functions in `utils`, and everything else in `helpers`. Those names describe the technical shape of the code, not the responsibility in the domain. Over time, `utils` becomes the place where any function nobody wanted to name ends up. Finding something requires remembering where it was hidden, not understanding what it does.

A more useful initial structure might look like this:

```text
revisor/
  package.json
  tsconfig.json
  src/
    modelo.ts
    configuracion.ts
    revisar.ts
    reporte.ts
    main.ts
    reporte.test.ts
```

`modelo.ts` describes `Servicio`, `EstadoDisponible`, `EstadoFalla`, and `Estado`: it does not read files, open connections, or print. `configuracion.ts` receives external data and validates it, as you learned in lesson 6. `revisar.ts` coordinates the concurrent queries and turns their outcomes into states. `reporte.ts` transforms trustworthy states into text or, later, into data for the API and the dashboard. `main.ts` connects the pieces when the program starts. The test lives next to the code it protects, in `src/reporte.test.ts`; when compiled it ends up as `dist/reporte.test.js`, and Node discovers it there.

The goal is not to have many folders. Splitting every small function into its own file can also hide the relationship between pieces that should be read together. The useful question is: “does this file answer a clear question of the program?” If the answer for `reporte.ts` is “how we represent what happened”, there is one responsibility. If a folder is called `misc`, `common`, or `helpers`, there is probably no clear question yet.

This organization has an important consequence for tests. A function that receives an `Estado` and returns a string needs no network, files, clock, or environment variables. With the same data, it returns the same result. That kind of function is cheap to test with a table of cases. By contrast, a function that reads `process.env`, calls `fetch`, measures time, and writes to the console mixes several boundaries. It may need integration tests, but it must not prevent the core rules from being tested separately.

Go makes a comparable separation through packages. A useful difference is that Go compiles packages and decides which names are public by capitalization, whereas TypeScript and JavaScript use `export` and `import` explicitly. In both cases the underlying idea is the same: a dependency must be visible and limited. The point is not to split files for sport; it is to be able to change one part without having to understand and put at risk the whole program.

Tests are the second half of that agreement. The compiler answers whether the program respects the types: for example, that `lineaReporte` receives an `Estado` and not a string. It does not answer whether the presentation rule is the one you needed. A function can compile and still print `HTTP undefined`, omit a failure, or classify status code 500 as available. A test builds a known input, runs a rule, and compares the result with an explicit expectation.

Quality is not reduced to tests either. A formatter makes visual decisions consistent: indentation, spaces, quotes, and line breaks stop being a discussion repeated in every change. A linter looks for patterns that compile but often hide errors or ambiguities: a variable declared and never used, a forgotten promise, a condition that is hard to read, or a risky conversion. Each tool answers a different question. `tsc` asks whether the program meets its static contracts; tests ask whether known cases produce the expected results; the linter looks for signs of problematic code; the formatter keeps the presentation predictable.

You should not wait until you have hundreds of files to adopt these practices. Precisely when the project is small it is easiest to choose clear names, test an important rule, and automate mechanical checks. Later, when the `revisor` has a server and a screen, those decisions will already be working as a safety net instead of turning into a huge and risky cleanup.

## The concepts

### ESM modules: files with explicit contracts

In a project with `"type": "module"` in `package.json`, Node interprets the emitted `.js` files as ECMAScript modules, also called ESM. TypeScript can analyze `.ts` files that follow those rules and emit compatible JavaScript. The `--module nodenext` option tells the compiler that it must respect Node's modern resolution, including a rule that often surprises people at first: relative imports must write the extension of the file that Node will run.

That is why a TypeScript file writes `import { lineaReporte } from "./reporte.js"` even though the source file is called `reporte.ts`. TypeScript understands that, after compiling, Node will load `reporte.js`. Writing `./reporte` leaves an ambiguity that ESM does not resolve the way CommonJS did, Node's earlier module system, which resolved paths and exports with different rules.

Node 24 LTS can also run a `.ts` file directly through *type stripping*: it replaces the type syntax with whitespace and runs the resulting JavaScript. It is not a compilation or a type check; `node archivo.ts` does not read `tsconfig.json` or apply `strict`. In addition, it only accepts erasable syntax: `enum`, `namespace` with values, and parameter properties require `--experimental-transform-types`; `.tsx` is not supported, `.ts` files inside `node_modules` are not allowed, and imported types must use `import type`. For a single-file script it can be convenient, but it is not the `revisor` workflow.

In particular, Node running `.ts` requires literal `.ts` extensions in `import`s, whereas this project writes `.js` so that the emitted JavaScript is correct. If Node receives `src/main.ts`, it would look literally for `./modelo.js` inside `src/` and would not find it. That is why the multi-file project is compiled with `tsc` and run from `dist/main.js`: there, `modelo.js`, `reporte.js`, and the other modules that the imports declare do exist. The `erasableSyntaxOnly` option can warn you about constructs that Node could not erase; it does not replace compilation or tests.

A module can export values that exist at runtime, such as functions and constants, and also types that only serve the compiler. The `import type` syntax makes that difference visible. If you import `Estado` only to annotate a variable, TypeScript removes that import from the emitted JavaScript. If you import `lineaReporte`, Node needs to load it, because it is a function that is invoked at runtime.

The following program has two modules. `modelo.ts` owns the contract of the states and the rule for turning them into lines. The main file builds `revisor` data and consumes the exported function. Neither file depends on a global variable or needs to know how the other is implemented beyond its public export.

```json fig07_01/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_01/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_01/src/modelo.ts
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
// fig07_01/src/main.ts
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
  detalle: "tiempo límite",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```

```bash
$ cd fig07_01
$ npx tsc -p tsconfig.json
$ node dist/main.js
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo límite)
```

The module boundary forces useful decisions. `Estado` is exported because `revisar.ts`, `reporte.ts`, the future API, and the dashboard need to talk about the same result. A private helper that only helps `lineaReporte` has no reason to be exported. Keeping it without `export` reduces the surface that other files can use by accident. If a private function is renamed or disappears, no outside module should break because of it.

Inside the `revisor`, avoid creating a circular dependency. For example, `revisar.ts` can import types from `modelo.ts`, and a text function in `reporte.ts` can import `Estado` from `modelo.ts`. By contrast, `modelo.ts` must not import `revisar.ts` to ask it to query the network. The model describes the data; the coordinator uses that model. If two modules need to import each other, normally a responsibility is mixed up, and it is better to extract the shared concept into a third, smaller module.

An import path is also part of the contract. Do not rename files by hand without updating the imports, and do not use local absolute paths that only work on your machine. The project must be cloneable and runnable from any path. Relative paths with `.js` make that dependency explicit and work both in the development folder and in the emitted JavaScript.

### Organization by responsibility: the flow of the revisor

Module names should follow the real flow of the program. The `revisor` receives external configuration, validates services, coordinates queries, transforms results, and presents them. That sequence suggests natural responsibilities:

| Module | Question it answers | What it must not do |
|---|---|---|
| `modelo.ts` | What is a service and what results can it produce? | Read JSON, call the network, or print |
| `configuracion.ts` | Does the external data form a valid list of services? | Decide how a report is presented |
| `revisar.ts` | How is each service queried and each outcome preserved? | Know details of a screen |
| `reporte.ts` | How is a trustworthy state turned into readable output? | Validate JSON or open connections |
| `main.ts` | How are the pieces connected when the process starts? | Contain long business rules |

This table is not a universal law. A small project may keep `modelo.ts` and `reporte.ts` together as long as the relationship is clear. A larger project may split file configuration, environment variables, and HTTP options into specific modules. The criterion is not the number of files; it is that a change has an obvious home. If you change the text a person will see, you look in `reporte.ts`. If the rule for a valid `timeoutMs` changes, you look in the configuration validator.

Lesson 6 already separated validation from unknown input. Keep that separation now that modules appear. `configuracion.ts` can export `leerServicios(valor: unknown): Resultado<readonly Servicio[]>`. The `main.ts` file can read a file with `node:fs/promises`, convert the JSON text to `unknown`, call the validator, and only then hand the services to `revisarTodos`. That way the part that touches disk is small, and the validation rule remains a function that receives values and returns a verifiable result.

Lesson 5 similarly separated the coordination from a concrete query. The `Consultar` type receives a `Servicio` and an `AbortSignal`, and returns a promise with a response. In a test, you can supply a controlled query function. In the real program, `main.ts` can build an implementation with `fetch`. Dependency injection means handing a function the collaboration it needs, instead of having it create or hide that collaboration inside; here it prevents a test of “a 503 code becomes a failure” from depending on an external server.

A bad organization usually starts with convenient names. `utils.ts` seems practical because it lets you store a function without deciding where it belongs. Later it receives validators, converters, formatters, constants, and network pieces. The result is a heavily imported module with no responsibility of its own, which makes it hard to know which changes can affect it. If a function formats a state, it belongs to the report. If it normalizes a configuration value, it belongs to configuration. If it fits no existing responsibility, perhaps the domain needs a new name.

Also avoid turning `main.ts` into the new gigantic file. It should be a composition of the program: obtain configuration, validate, request a check, and print or start the server. If `main.ts` contains fifty lines of rules for interpreting responses, extract that decision into the module where it belongs. The clarity of `main.ts` serves as a high-level map: whoever reads it should be able to understand the program's path without having to memorize every detail.

### Table-driven tests: one rule, many inputs

A table of cases is a collection of inputs, expected outputs, and scenario names that shares one test body. It is especially useful when a function has many small alternatives. Instead of copying the setup, the call, and the comparison four times, you write the mechanics once and add rows that describe new behaviors.

The name of each case matters. `"case 1"` does not help when a failure shows up weeks later. `"available keeps code and duration"` communicates the rule being protected. `"failure keeps detail"` communicates another. If the second row breaks, you know whether to review the model, the presentation function, or the expectation. A table does not replace thinking; it makes each expectation visible and extensible.

Node includes `node:assert/strict`, a standard assertion library. `assert.equal(actual, expected)` ends the program with an error if the values differ. In this figure we use a simple table and a stable output so that you can see it as an ordinary program. In a project, the same pattern can live inside `node:test`, Vitest, or another test runner; the table remains the part that defines the expected behavior.

Because the file imports a module with the `node:` prefix, the command includes `--types node`. Since TypeScript 6, the compiler no longer automatically loads Node's declarations when compiling isolated files. That flag only informs TypeScript of the installed types; Node still provides `node:assert/strict` at runtime.

```json fig07_02/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_02/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_02/src/reporte.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_02/src/main.ts
import assert from "node:assert/strict";
import { lineaReporte, type Estado } from "./reporte.js";

const servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

const casos: readonly {
  readonly nombre: string;
  readonly entrada: Estado;
  readonly esperada: string;
}[] = [
  {
    nombre: "disponible conserva código y duración",
    entrada: {
      servicio,
      tipo: "disponible",
      codigoHttp: 204,
      duracionMs: 18,
    },
    esperada: "catálogo: HTTP 204 en 18 ms",
  },
  {
    nombre: "falla conserva detalle",
    entrada: {
      servicio,
      tipo: "falla",
      detalle: "conexión rechazada",
    },
    esperada: "catálogo: falla (conexión rechazada)",
  },
];

for (const caso of casos) {
  assert.equal(lineaReporte(caso.entrada), caso.esperada);
  console.log(`ok - ${caso.nombre}`);
}
```

```bash
$ cd fig07_02
$ npx tsc -p tsconfig.json
$ node dist/main.js
ok - disponible conserva código y duración
ok - falla conserva detalle
```

A useful test does not cover only the happy path. The first case checks an available state, but it uses 204 instead of just 200 to confirm that the function preserves the code it received. The second tests the other alternative of the discriminated union. If someone modifies `lineaReporte` and forgets to handle failures, the second case will turn red. That is a better signal than a coverage percentage: it explains which behavior stopped being met.

Boundary values must also have a place in your tables. If a function classifies successful HTTP codes from 200 to 299, testing 200 and 500 is not enough. Add 199, 200, 299, and 300. Comparison errors tend to live right there: `<= 300` instead of `< 300`, or `> 200` instead of `>= 200`. A table lets you add those cases as data, without duplicating the whole structure of a test.

Do not test only for coverage. A function can run in a test and still have no relevant assertion. For example, a test that only verifies that `lineaReporte` returns a string exercises both branches, but does not detect that the output says `"all good"` for any state. The comparison must assert the detail that matters: name, code, duration, or failure message.

Within the `revisor`, the fastest tests should focus on deterministic functions such as `leerServicio`, `leerServicios`, `lineaReporte`, code classifiers, and data conversions. Tests that use `fetch`, files, or a local server are useful, but they answer another question: whether several pieces integrate correctly. Start with the pure rules; then add deliberate integration tests where a boundary justifies it.

### Automatic quality: compilation, lint, and formatting

A minimal quality routine must be easy to remember and possible to run before handing in a change. In a Node project, `package.json` can gather the commands so that nobody has to memorize long options. An example of scripts for the `revisor` is the following:

```json
{
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  }
}
```

`compilar` emits the JavaScript into `dist/`; `verificar` performs the same type check without emitting; and `arrancar` runs the emitted entry point. That separation is necessary: Node's tests run the JavaScript files in `dist/`, so `probar` first compiles and then looks for `dist/**/*.test.js`. A made-up directory such as `dist/test` is not a test: Node would try to load it as a module and fail before discovering any case.

The `tsconfig.json` must contain the decisions the project repeats. For Node and ESM, a reasonable base includes `strict`, `module`, and `moduleResolution` with the value `nodenext`, plus the explicit Node declarations. You do not need to copy every option that exists on the internet: add an option when you understand which contract it imposes.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

The linter does not replace the compiler. TypeScript knows, for example, that a function requires an `Estado`; ESLint can warn about a variable you declared and did not use, a promise you left unawaited, or a pattern the team decided to avoid. Configure it with rules you can explain. A huge list of rules copied from another project usually produces warnings that nobody attends to. It is better to start with a small set, fix the warnings, and tighten it only when the team understands the reason.

First install the development tools. TypeScript 7 and `typescript-eslint` do not run together yet: `typescript-eslint` uses the TypeScript 6 API. The project keeps TypeScript 7 for `npx tsc` under `@typescript/native` and leaves TypeScript 6 as the `typescript` alias for ESLint, whose additional executable is available as `npx tsc6`. Do not swap one for the other: they are two different roles until compatibility arrives.

```bash
npm install --save-dev eslint@10.11.0 @eslint/js@10.0.1 typescript-eslint@8.71.0 prettier@3.9.9 @types/node@24 typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2
```

npm writes those versions into `package.json` preceded by `^` (for example `"^10.11.0"`). For this course it does not matter: `package-lock.json` pins what was installed. If you prefer `package.json` to keep exact versions, as in the example of solution 4, add `--save-exact` to the command or remove the `^` by hand.

ESLint 10 uses a flat configuration file; without `eslint.config.js`, `eslint src` ends with an error reporting that it did not find `eslint.config.*`. This minimal configuration combines the recommended JavaScript and TypeScript rules. Prettier receives an explicit decision on quotes and line width.

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json
{
  "singleQuote": false,
  "printWidth": 100
}
```

The formatter does not replace a design review either. Prettier does not know whether `revisarTodos` lives in the right module or whether your table tests an important edge. Its value lies in removing mechanical decisions from the conversation. If the whole project uses the same indentation and the same line layout, a review can focus on behavior changes. Run `prettier --check src` in automated checks and use `npx prettier --write src` only when you want to apply the format to the source files.

Do not ignore a linter because the program “works”. An unawaited-promise warning can mean the process ends before recording a result. An unused variable can be a leftover of a validation that no longer happens. Do not obey every rule without thinking either: if a rule does not represent a useful decision for this project, adjust or remove it with a visible reason. Automatic quality must reduce errors and friction, not become noise.

In Go, `gofmt` is a natural part of the workflow and `go vet` finds constructs that compile but look incorrect. In TypeScript, the ecosystem leaves more choices: `tsc`, ESLint, Prettier, and the test runner are different tools. That flexibility demands an explicit decision. Once they are chosen, the project's scripts give a similar experience: a short set of commands that anyone can run and that continuous integration can repeat.

## The error you will see

TS2305 appears when you import a name that the module does not export. With TypeScript 7.0.2, `tsc` prints the following diagnostic. The module exists and the path is correct, but the file only exports `revisarTodos`; it does not export a function called `revisarUno`.

```ts
// fig07_03/revisor.ts
export function revisarTodos(): string {
  return "revisión terminada";
}
```

```ts
// fig07_03.ts
import { revisarUno } from "./fig07_03/revisor.js";

console.log(revisarUno());
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig07_03.ts
fig07_03.ts(2,10): error TS2305: Module '"./fig07_03/revisor.js"' has no exported member 'revisarUno'.
```

TS2305 does not mean you should add `export` to everything until the error disappears. First decide which part of the contract you need. If the program must coordinate a complete list, import `revisarTodos`. If you really need to check an individual service, create and export `revisarUno` as a function with a clear contract, and keep `revisarTodos` as the coordinator that calls it for each service.

Another frequent error in ESM happens when you omit `.js` in a relative path. TypeScript with `module: "nodenext"` can report TS2835 and suggest an explicit extension. The fix is not to write `.ts`; write the `.js` extension of the emitted file. That detail seems strange only while you look at the source code. Node will resolve the generated JavaScript, and the import must describe precisely that file.

When Node shows `ERR_MODULE_NOT_FOUND`, compilation has already passed and the problem is in resolution at runtime. Check the relative path, the upper and lower case of the file name, and the `.js` extension. Do not solve that error by switching to `require` or by disabling ESM: the diagnosis is showing you a real difference between the name you imported and the file Node can load.

A test failure has another reading. If `assert.equal` reports that it got a string different from the expected one, do not change the expectation right away to recover the green. First ask whether the requirement changed or whether the code changed by accident. A test must document agreed behavior; modifying it to accommodate any output removes precisely the signal that was warning you about the change.

## What gets done wrong

- **Creating a `utils`, `helpers`, or `common` module for everything that has no place.** Those names do not explain a responsibility and end up concentrating unrelated dependencies. Name the concept that owns the function, such as `configuracion`, `reporte`, or `revisar`; if you cannot, perhaps the design needs clarifying before moving code.

- **Importing relative paths without `.js` in ESM.** It may seem that the source file should be imported with `.ts` or with no extension, but Node runs the emitted JavaScript. Use the path that Node will resolve, for example `./modelo.js`, and let TypeScript relate that path to the source file.

- **Exporting everything “just in case”.** Every export becomes a potential dependency of other modules. The more public surface a file has, the harder it is to change its interior. Export the types and functions that other modules really need; keep implementation helpers private.

- **Writing tests that depend on network, clock, and files to check a text rule.** Those tests are slower, less deterministic, and harder to diagnose. Separate the pure rule first, test it with data built in memory, and leave the boundaries for specific integration tests.

- **Testing a single happy case.** A function that handles a discriminated union needs at least one case per important alternative. Range comparisons need boundary values. An isolated case can pass even though the program fails for the inputs that really distinguish a rule.

- **Chasing 100% coverage as the only goal.** Coverage means a line was executed, not that an important expectation was verified. Use it to discover paths you have not considered, but check whether each test can fail when the behavior it intends to protect changes.

- **Using the linter and the formatter as substitutes for a review.** Automatic tools find limited classes of problems. They cannot decide whether `timeoutMs` has a correct policy, whether an error message helps operate the system, or whether the chosen module represents the responsibility well.

- **Applying formatting by hand before every review.** If the project has a formatter, let it do the mechanical work. Style differences mixed in with a behavior change make it hard to review what really changed.

## Exercises

### Exercise 1 — Extract the revisor's model

Create a module `modelo.ts` that exports `Servicio`, `EstadoDisponible`, `EstadoFalla`, and `Estado` with the same contracts used in lessons 3 and 5. Create a main file that imports `type Estado` from `./modelo.js`, builds an available state and a failure state, and prints them using a function exported from the module.

### Exercise 2 — A table to classify codes

Write `clasificarCodigo(codigoHttp: number): "disponible" | "falla"` in a module. Create a table-driven test for 199, 200, 299, 300, and 503. Each row must have a name that describes the edge or the rule it checks. Use `node:assert/strict` and document the compile command with `--types node`.

### Exercise 3 — Separate configuration from startup

Start from `leerServicios` from lesson 6. Place it in `configuracion.ts`, keep the input as `unknown`, and export only the reading function and the types that another module needs. Create a small `main.ts` that receives an already parsed value, calls the function, and hands the list to the check only if the result has `ok: true`.

### Exercise 4 — A quality routine

Add the scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint`, and `formato` with the contracts of this lesson. Include `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"`, and `"sourceMap": true` in `tsconfig.json`. Install ESLint, `typescript-eslint`, and Prettier with the TypeScript 6 and 7 aliases; run each script, fix at least one formatting detail, and note which question each command answers.

## Solutions

### Solution 1

The module owns the types and the presentation because both describe the result of the domain. The consumer file imports the type with `import type`, so Node only needs to load the function that exists at runtime.

```ts
// modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function resumen(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// main.ts
import { resumen, type Estado } from "./modelo.js";

const estado: Estado = {
  servicio: {
    nombre: "inventario",
    url: "https://inventario.example",
    timeoutMs: 2000,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 31,
};

console.log(resumen(estado));
```

There is no need to export an example constant or helper functions that only `resumen` needs. The module offers the minimum contract that another file requires.

### Solution 2

The table makes the four relevant limits visible, plus one case clearly outside the range. The function keeps a simple rule: available includes from 200 up to just before 300.

```ts
import assert from "node:assert/strict";

function clasificarCodigo(codigoHttp: number): "disponible" | "falla" {
  return codigoHttp >= 200 && codigoHttp < 300 ? "disponible" : "falla";
}

const casos = [
  { nombre: "199 queda debajo del rango", codigoHttp: 199, esperado: "falla" },
  { nombre: "200 inicia el rango", codigoHttp: 200, esperado: "disponible" },
  { nombre: "299 termina el rango", codigoHttp: 299, esperado: "disponible" },
  { nombre: "300 queda fuera del rango", codigoHttp: 300, esperado: "falla" },
  { nombre: "503 es falla del servidor", codigoHttp: 503, esperado: "falla" },
] as const;

for (const caso of casos) {
  assert.equal(clasificarCodigo(caso.codigoHttp), caso.esperado);
}
```

`as const` preserves the literals of each expectation. It is not essential for this test, but it prevents the table from widening to `string` if you later want to reuse its values in a function with a union of literals.

### Solution 3

The function that reads configuration must not import `node:fs/promises` or depend on the file path. Its job is to decide whether an unknown value forms a valid list. The physical reading of the file belongs to an outer layer, which can live in `main.ts` or in a small module dedicated to the disk boundary.

```ts
// configuracion.ts
export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

The solution reuses the same `esRegistro` guard and the same rules from lesson 6: non-empty text for name and URL, and a positive safe integer for `timeoutMs`. The validation keeps an `unknown` input and returns a trustworthy contract before starting the check; `esRegistro` does the narrowing with runtime checks, not with a type assertion, so the compiler and the program agree.

### Solution 4

The scripts turn an oral routine into an interface of the project. This complete `revisor` keeps `src/main.ts` as the single entry point, leaves the test next to the rule, and repeats in a real project the decisions explained above. The model does not change shape between these files: each `Estado` keeps the complete `Servicio` and distinguishes availability from failure with `tipo`.

```json fig07_04/package.json
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

```json fig07_04/tsconfig.json
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

```js fig07_04/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json fig07_04/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```

```ts
// fig07_04/src/modelo.ts
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
// fig07_04/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

```ts
// fig07_04/src/reporte.ts
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_04/src/revisar.ts
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

```ts
// fig07_04/src/main.ts
import { leerServicios } from "./configuracion.js";
import { lineaReporte } from "./reporte.js";
import { revisarTodos, type Consultar } from "./revisar.js";

const configuracion = leerServicios([
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
]);

if (!configuracion.ok) {
  throw new Error(configuracion.detalle);
}

const consultar: Consultar = async (servicio) => {
  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return { codigoHttp: 204, duracionMs: 12 };
};

const estados = await revisarTodos(configuracion.valor, consultar);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```ts
// fig07_04/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { lineaReporte } from "./reporte.js";

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
```

```bash
$ cd fig07_04
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

✔ disponible conserva código y duración (0.341167ms)
✔ falla conserva detalle (0.057417ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 148.684583
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 204 en 12 ms
pagos: falla (conexión rechazada)
```

`npm run verificar` answers only about types without creating files; `npm run probar` recompiles and runs the tests discovered in `dist/`; `npm run lint` loads ESLint's flat configuration; and `npm run formato` confirms that the files in `src` already respect Prettier. `npm run arrancar` is the small check of the complete composition. If you need to apply formatting, run `npx prettier --write src`, review the change, and run `npm run formato` again.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2` in the project.
- [ ] `npm run verificar` finishes without a diagnostic and does not create or update files in `dist/`.
- [ ] `npm run probar` compiles, discovers `dist/reporte.test.js`, and reports two passing tests.
- [ ] `npm run lint` and `npm run formato` finish successfully after installing and configuring their tools.
- [ ] `npm run arrancar` prints an available state and a failure state with the compiled project.
- [ ] When compiling an import of a name that is not exported, TS2305 appears on the imported name.
- [ ] My project uses relative imports with the `.js` extension and has `"type": "module"` in its `package.json`.
- [ ] My Node `tsconfig.json` includes `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"`, and `"sourceMap": true`.

## Further reading

- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) — official documentation on `export`, `import`, modules, and code organization; accessed on October 2, 2026.

- [Node.js: Running TypeScript](https://nodejs.org/api/typescript.html) — official documentation on type stripping, erasable syntax, and the limits of running `.ts` files directly; accessed on October 2, 2026.

- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html) — official documentation on ESM in Node and extensions in relative imports; accessed on October 2, 2026.

- [Node.js: `node:assert/strict`](https://nodejs.org/api/assert.html) — official documentation of the strict assertions used to check tables of cases; accessed on October 2, 2026.
