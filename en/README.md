# TypeScript course — from zero to a program that holds up

**By Dorian Chávez, founder of Hábil and integration architect.**

**Who it is for:** anyone who has already taken this house's Go course, or who programs in JavaScript and wants to stop discovering errors in production. No prior experience with types is assumed: each concept is explained when it appears, and it is explained why it exists, not only how it is written.

**What you will know by the end:** how to write a complete program with types, understand what you wrote, and be able to explain it to someone else.

**What you need before starting:** a computer with Linux Mint and knowing how to open a terminal. [Lesson 1](01-instalacion.md) installs everything from scratch.

## The project you are going to build

The **`revisor`**: an API that queries a list of services **at the same time** and a web dashboard that shows the report, with the types shared between the two. It is the same problem as in the Go course, now solved in TypeScript.

## The ten lessons

| Lesson | | What you build | What you learn |
|---|---|---|---|
| 0 | [What TypeScript is and is NOT](00-que-es-typescript.md) | nothing yet (reading) | JS vs TS; types are erased at runtime; what they protect and what they do not; why `strict` |
| 1 | [Installing TypeScript on your Linux Mint](01-instalacion.md) | the environment and your first program | Node LTS, `tsc`, editor, strict `tsconfig`, running and debugging |
| 2 | [Types, functions, and inference](02-tipos-funciones-inferencia.md) | the `revisor`'s base functions | primitives, inference, unions and literals, narrowing, `null` and `undefined` |
| 3 | [Objects and the data model](03-objetos-modelo-datos.md) | the `Servicio` / `Estado` model | `type` vs `interface`, structural typing, `readonly`, discriminated unions |
| 4 | [Collections, generics, and errors](04-colecciones-genericos-errores.md) | the list of services and the report | arrays, `Map`/`Set`, generics, utility types, errors |
| 5 | [Asynchrony: check everything at once](05-asincronia.md) | the concurrent `revisor` | event loop, promises, `async/await`, `Promise.all` vs `allSettled`, `AbortController` |
| 6 | [Data that arrives from outside](06-datos-de-fuera.md) | validation of configuration and responses | validating at the boundary; types derived from the schema |
| 7 | [Modules, tests, and quality](07-modulos-pruebas-calidad.md) | the real project, with tests | ESM modules, table-driven tests, lint and formatting |
| 8 | [The server](08-el-servidor.md) | the `revisor`'s HTTP API | HTTP server, typed routes, JSON, configuration, graceful shutdown |
| 9 | [The screen and the finished program](09-la-pantalla.md) | the web dashboard and the final package | React with TypeScript and hooks, shared types, XSS, compiling and publishing |

At the end of each lesson there are exercises with their solutions. And the [logbook](bitacora.md) is yours: write down there what was hard for you.
