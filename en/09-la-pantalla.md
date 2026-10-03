# Lesson 9 — The screen and the finished program

**Time:** 2 × 45 min

**What you build:** the web dashboard and the final package

**What you learn:** React with TypeScript, hooks, shared front–back types, basic security (XSS), compiling and publishing

## By the end you will be able to

- Write React components in `.tsx` files with typed props and a discriminated union of the `revisor`.
- Use `useState` and `useEffect` to load data from the API with loading and error states, and cancel the request when the component disappears.
- Share one contract between the server and the browser, with its type and its runtime validation, without dragging Node code onto the screen.
- Recognize an unsanitized HTML insertion, explain why it opens an XSS vulnerability, and block it with the type, with ESLint, and with a content security policy.
- Bundle the dashboard with esbuild and serve it from the same process as the API.
- Test the dashboard in a real DOM and the complete package against the server, and say honestly what each test checked and what only a browser can check.
- Prepare the artifact that gets published: what it contains, what it does not contain, and how it is installed without development dependencies.

## The why before the how

Up to the previous lesson, the `revisor` already does the hard work: it validates a configuration, queries real services concurrently, represents failures as data, exposes an HTTP API, and shuts down in an orderly way. Even so, a JSON response is still an interface designed for another program. A person who needs to know whether `pagos` is failing can open the route, read a long structure, and look by eye for the important fields. That is fine for diagnosing; it is not a good operations screen.

The dashboard changes the question from “what data does the system have?” to “what does someone need to see in order to make a decision?”. A report must show first the name of the service, whether it is available or failing, and the datum that explains that conclusion: HTTP code and duration for an available response, detail for a failure. It must say when it is still loading and what happened when loading failed, because a screen that goes blank does not distinguish “there are no services” from “I could not ask”. And it must update itself, because an availability report that goes stale is worse than not having one.

React helps describe that screen as components. A **component** is a function that receives props and returns a description of an interface. React takes care of converting that description into browser elements and updating them when the data changes. That does not replace the rules built in the previous lessons: the dashboard must consume a contract that has already been decided, not invent on its own which codes are successful, what a timeout means, or how the configuration is validated.

That contract already exists. Lesson 8 separated the internal model from the public one: the server needs a complete `Servicio`, with `nombre`, `url`, and `timeoutMs`, to make queries, and an internal `Estado` keeps that service because the check logic needs it. The browser only needs `ReportePublico`, which carries neither the URL nor the timeout. This lesson takes advantage of what that separation leaves ready: `src/contrato.ts` imports nothing from Node, so the same file, with its type and its validation, travels to the browser together with the dashboard. Sharing types does not mean sharing everything; it means sharing what really crosses the boundary, and sharing it once so that the server and the screen cannot disagree without the compiler noticing.

This reduces one class of disagreements, but it does not eliminate the network boundary. TypeScript types are erased before running, as you saw in lesson 0: the browser receives bytes of JSON, not a live instance of `ReportePublico`. That is why the dashboard uses the same pattern as lesson 6: what arrives through `fetch` is `unknown` until `esReportePublico` proves otherwise. The shared type says what the dashboard expects; the validation checks that what was received meets it. Without the first, server and dashboard drift apart silently; without the second, a proxy that returns an error page with code 200 makes the screen compile, start, and fail later.

The screen also introduces a risk that does not exist when printing to the console: the browser interprets HTML. The `detalle` of a failure can contain text that comes from a remote service, from a configuration, or from a person. If that text is inserted as HTML, it can close a tag, create new elements, or try to run code in the context of whoever opened the dashboard. That family of vulnerabilities is called **XSS**, for *cross-site scripting*. It is not a problem of “odd text”: it is a problem of confusing data with instructions for the browser, and it is one of the most repeated failures of the web.

In Go, the separation resembles building a specific structure for an HTTP response and handing it to a template with automatic escaping. The idea does not depend on the language: the internal model contains what the program needs to operate; the public model contains only what is needed to communicate the result; and text from outside is never treated as code. TypeScript contributes an advantage when the server and the screen live in the same repository: the contract can be named once and verified on both sides before running.

Finally, the finished product is not just code that looks good on your computer. It includes a repeatable way to build it, recorded dependencies, an output that can be inspected, and a safe configuration to start it. Publishing is not blindly copying the whole directory or uploading secrets along with the code: it is generating a known artifact, checking what it contains, installing only what is needed to run, and deploying with clear limits of network, origin, and configuration. At the end of the lesson the `revisor` is complete: a single Node process that checks the services in `servicios.json`, answers `GET /api/estados`, and serves the dashboard that consumes that response.

Like lesson 8, this lesson keeps the project structure: entry `src/main.ts`, `rootDir` `./src`, `outDir` `./dist`, and the scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint`, and `formato`, with one new script, `empaquetar`. What is newly installed is explained at the right moment: React, a bundler (esbuild), and a test DOM (jsdom). The single-file figures run in the `figuras/` folder from lesson 1; they only need you to install there the same dependencies the project uses.

```bash
cd ~/proyectos/figuras
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@29.1.1 @types/jsdom@28.0.3
```

## The concepts

### Components and JSX: a function that describes a part of the screen

JSX looks like HTML inside TypeScript, but it is not an HTML string that the browser receives as is. It is a syntax that TypeScript transforms into React calls. That is why the file must end in `.tsx` and the compilation must enable `--jsx react-jsx`. That mode uses React's automatic *runtime*: you do not need to import an identifier called `React` just for JSX to compile, although you do import the concrete values you use, such as hooks.

A function component receives an object of props, normally destructured in its parameters, and returns JSX. The props are a contract just like the parameters of any other function. If a row needs a state, the type of the prop must say so. Do not declare it as `unknown`, `any`, or an object with optional properties just to “make the screen paint”: that would move to the screen an uncertainty that the model has already resolved.

The following program uses the same discriminated union pattern from lesson 3. The row handles `disponible` and `falla` separately: in the first branch it can read `codigoHttp`; in the second, `detalle`. There is no need to ask whether the fields exist or to fill the model with ambiguous optional properties. In this figure, `EstadoPublico` is simplified compared with the project's real contract: it has no `duracionMs`, so that the example is short.

```tsx
// fig09_01.tsx
import { renderToStaticMarkup } from "react-dom/server";

type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li>
        <strong>{estado.nombre}</strong> disponible: HTTP {estado.codigoHttp}
      </li>
    );
  }

  return (
    <li>
      <strong>{estado.nombre}</strong> falla: {estado.detalle}
    </li>
  );
}

const pantalla = renderToStaticMarkup(
  <ul>
    <FilaEstado estado={{ nombre: "catálogo", tipo: "disponible", codigoHttp: 200 }} />
    <FilaEstado estado={{ nombre: "pagos", tipo: "falla", detalle: "tiempo límite" }} />
  </ul>,
);

console.log(pantalla);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_01.tsx
$ node fig09_01.js
<ul><li><strong>catálogo</strong> disponible: HTTP 200</li><li><strong>pagos</strong> falla: tiempo límite</li></ul>
```

`renderToStaticMarkup` converts a component into an HTML string without needing a browser. **Rendering** is that: converting the description a component returns into HTML or into visible elements. Here it serves to see what the component produces with controlled data. It adds no interactivity: it generates static HTML, with no state and no effects, and that is why it is not what the final dashboard uses. That a component can be run like this, as any function, is precisely what makes it easy to test.

Components do not need to be classes. A function with typed props is an ordinary piece of TypeScript: it can be extracted, tested, and read without learning a special hierarchy. React takes care of interpreting the returned JSX. The comparison with Go is not literal, because Go has no JSX, but the separation is familiar: a presentation function receives an already valid structure and produces a representation for whoever consumes it.

Inside the `revisor`, the division is small. `Panel` requests the data and decides which screen applies according to the loading; `Contenido` chooses between loading, error, and list; `FilaEstado` receives an `EstadoPublico` and draws it. None of them decides which HTTP route exists, reads environment variables, or knows which HTTP codes mean “available”: the server already decided that, and it arrives in the `tipo` field.

### Hooks: state and effects

A component that only draws received data is the easy case. The dashboard needs more: request data from the API, wait, show “Cargando…”, replace it with the list when it arrives, show an error if the API fails, and repeat it from time to time. For that, React offers **hooks**, functions whose name starts with `use` that connect a component to React capabilities. There are two that you need now.

`useState` gives the component memory. `const [total, establecerTotal] = useState<number | undefined>(undefined)` declares a value, `total`, that React keeps between draws, and a function, `establecerTotal`, that changes it. Calling that function does not modify the variable at that moment: it asks React to run the component again with the new value. The type between angle brackets describes which values it admits; with a discriminated union, the state's type says exactly which screens exist.

`useEffect` runs work that is not drawing. Drawing must be a pure function of the props and the state; requesting data from a network, scheduling a timer, or subscribing to something is an **effect**, and it must be done after React has drawn, not during. `useEffect(() => { ... }, [])` receives a function and a list of dependencies. The function runs after the first draw; if it returns another function, that cleanup function runs when the component disappears or when some dependency changes, before repeating the effect. The list of dependencies is the part that is most often gotten wrong: it says which values the effect depends on, and React repeats it only when one of them changes. An empty list means “only on mount”.

The following figure is the smallest thing that shows the complete cycle. A component requests, through an effect, a number that takes 10 ms to arrive; meanwhile it shows “Cargando…”; when it arrives, it stores it in the state and React draws it again. To run it in Node, without a browser, the figure creates a simulated document with jsdom, a DOM implementation written in JavaScript, and installs it as the global `document` and `window`; React uses it as if it were the browser's. `act` is React's tool for tests: it runs the code that causes changes, waits for React to finish applying them, and only then returns control, so that what you read next is what a person would see.

```tsx
// fig09_02.tsx
import { JSDOM } from "jsdom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const dom = new JSDOM('<!doctype html><div id="raiz"></div>');

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

function contarServicios(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(2), 10));
}

function Resumen() {
  const [total, establecerTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    void contarServicios().then(establecerTotal);
  }, []);

  return <p>{total === undefined ? "Cargando…" : `${total} servicios`}</p>;
}

const raiz = dom.window.document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz");
}

const arbol = createRoot(raiz);

await act(async () => {
  arbol.render(<Resumen />);
});
console.log(`primer render: ${raiz.innerHTML}`);

await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
});
console.log(`tras el efecto: ${raiz.innerHTML}`);

await act(async () => {
  arbol.unmount();
});
dom.window.close();
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_02.tsx
$ node fig09_02.js
primer render: <p>Cargando…</p>
tras el efecto: <p>2 servicios</p>
```

Three things can be seen in that output. The first draw shows “Cargando…” because the initial state is `undefined`. The effect started after that draw, not before. And when the promise resolved, `establecerTotal(2)` caused a second draw with the new value. Notice also what the figure does not do: it does not use `setTimeout` inside the component or call `contarServicios()` in the function body. If you called it in the body, it would run on every draw, and since each response changes the state and causes another draw, you would have a loop of requests.

There is a trap worth naming now. An effect that requests data can finish after the component no longer exists: the person changed screens or, in tests, you unmounted the tree. If the response arrives then and calls `establecerTotal`, you are trying to update a component that is not there. The defense is the effect's cleanup: the dashboard creates an `AbortController` in each effect, hands its signal to `fetch`, and aborts it in the cleanup function, exactly the cancellation mechanism you know from lesson 5, which now fulfills a new task. And when the request is aborted, the `catch` recognizes it with `control.signal.aborted` and writes no error state: being canceled is not a failure.

### Shared types: one contract, two sides

Lesson 8 created `src/contrato.ts` with three pieces: the `EstadoPublico` type, the `ReportePublico` type, and the `esReportePublico` guard. The server uses them to build its response (`aReportePublico` returns a `ReportePublico`) and the dashboard uses them to receive it. That is the concrete form of “shared front–back types”: not a published package, nor a code-generation tool, but a file of the same project that both sides import.

Two rules make it work. The first: the shared file contains only what makes sense in both environments. `contrato.ts` imports only `esRegistro` from `configuracion.ts`, a pure function with no Node dependencies. If it imported `node:fs` or `node:http`, the bundler would try to carry it to the browser, which does not have those modules, and the bundling would fail or, worse, produce a broken package. The word “shared” does not authorize sharing code that only works in Node, nor having the browser drag in functions that read files or secrets. Share types and pure transformations; leave the network, disk, and environment boundaries in their layers.

The second rule: what is shared is the public contract, not the internal model. If the dashboard imported `Estado`, with its `Servicio`, the server would have to serialize the URL of each service so that the response met that type, or the dashboard would be convinced it receives data that the network does not actually carry; in both cases the internal type would be dictating what gets published. If someone changes `duracionMs` to `duracion` in `contrato.ts`, TypeScript will point out both the server's converter, `aEstadoPublico`, and the dashboard row that reads the previous field. That is the benefit: the disagreement is detected when compiling, not on seeing an empty screen in production.

Even so, a type validates nothing at runtime. When the browser receives the body of `GET /api/estados`, `await respuesta.json()` delivers a value from an external boundary, and the temptation is to write this:

```ts
const reporte = (await respuesta.json()) as ReportePublico;
```

The assertion does not inspect the response. If an old version of the API returns `codigo` instead of `codigoHttp`, or if a proxy returns an HTML page with code 200, the screen compiles and fails later. The dashboard keeps the practice from lesson 6: it receives `unknown`, calls `esReportePublico`, and only then produces a `ReportePublico`. Before parsing, it also checks the HTTP code: a `503` response can carry valid JSON and not be the report the dashboard expected. **Parsing** is transforming a serialized representation, such as JSON text, into JavaScript values, which you still must validate. Do not turn an unsuccessful response into an empty list: that would make an API failure look like “everything is fine, but there are no services”.

That validation happens once, in `cargar.ts`, next to the HTTP call. `Panel` does not receive `unknown` or ask whether `reporte.estados` is an array. A component that does network validation, sorting, formatting, and JSX all at once ends up hard to test and to read. The layer that obtains data answers “does the response meet the contract?”; the dashboard answers “how is an already trustworthy contract displayed?”. And that separation opens a door you will use in the tests: `Panel` does not know where the data comes from; it receives a `cargar` function, so that a test hands it a controlled function and the real program hands it `cargarReporte`.

### XSS: external text must not turn into instructions

XSS happens when data that another party controls ends up interpreted as HTML or JavaScript inside a page. A failure looks like an innocent source: a remote service returns an error text, the `revisor` keeps it as `detalle`, and the dashboard displays it. But that text is written by whoever controls the remote service, and it could be `<img src=x onerror=alert(1)>`. If the dashboard inserts that string as HTML, the browser creates an `img` element, the image does not load, and the `onerror` attribute runs code in the page, with the permissions of whoever has it open.

The main defense is keeping the semantic type correct. A detail is text; therefore, it must be a JSX child, such as `{detalle}`. React treats it as text and escapes the characters that mean something to HTML: `<` becomes `&lt;`, `>` becomes `&gt;`, `&` becomes `&amp;`. The following figure demonstrates it: although the input contains a tag, the output contains `&lt;` and `&gt;`, which the browser shows as visible characters instead of interpreting them as an image.

```tsx
// fig09_03.tsx
import { renderToStaticMarkup } from "react-dom/server";

function Detalle({ texto }: { readonly texto: string }) {
  return <p>{texto}</p>;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<Detalle texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_03.tsx
$ node fig09_03.js
<p>&lt;img src=x onerror=alert(1)&gt;</p>
```

Compare with the alternative. React has a property that is deliberately called `dangerouslySetInnerHTML`: “set HTML in a dangerous way”. Its name exists to stop you before using it. React cannot know whether the HTML you give it was generated by a trustworthy source, cleaned by a current sanitizer, or arrived from an unvalidated network; so it stops escaping and inserts it as is. The same figure, with that property, produces something else:

```tsx
// fig09_04.tsx
import { renderToStaticMarkup } from "react-dom/server";

function DetalleInseguro({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<DetalleInseguro texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_04.tsx
$ node fig09_04.js
<p><img src=x onerror=alert(1)></p>
```

That second output is the defect. The `img` tag is no longer written as text: it is an element that the browser is going to create. The same happens without React: assigning to `elemento.innerHTML` a text that comes from outside has exactly the same problem, and that is why it must not appear in the dashboard either. When what you need is to display text without React, `elemento.textContent = texto` does the right thing, because the browser does not interpret what you assign that way.

A common mistake is to write a homemade function that replaces only `<script>` or removes one specific word. HTML has event attributes, URLs with the `javascript:` scheme, entities, SVG, styles, and encoding variations; an incomplete list of replacements creates a false sense of security. If some product really needs to display someone else's HTML, for example editorial content with bold text, the answer is a maintained and tested **sanitizer**, which walks the HTML and leaves only an allowed subset of tags and attributes, applied before the point of drawing and with tests using hostile inputs. For the `revisor`'s operational details there is no such requirement, and the right design is not to interpret HTML at all.

Since a rule that nobody watches gets forgotten, the project turns it into an automatic check. The `eslint.config.js` of this lesson adds the `no-restricted-syntax` rule with two selectors: one forbids the `dangerouslySetInnerHTML` attribute and the other the assignment to `innerHTML`. If someone writes either of the two things, `npm run lint` fails with the message you wrote. This is what it prints with a test file, `src/panel/Mala.tsx`, that contains both things (delete it afterwards):

```tsx
export function Mala({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

export function pintar(elemento: HTMLElement, texto: string): void {
  elemento.innerHTML = texto;
}
```

```text
$ npm run lint

> lint
> eslint src

/home/tu-usuario/proyectos/revisor/src/panel/Mala.tsx
  2:13  error  No insertes HTML sin sanitizar: usa texto como hijo de JSX      no-restricted-syntax
  6:3   error  No asignes innerHTML: usa textContent o un componente de React  no-restricted-syntax

✖ 2 problems (2 errors, 0 warnings)
```

A lint rule is not a complete defense: it does not see an assignment made by another route, and someone can disable it. That is why the project adds a second layer that does not depend on anybody remembering anything: a **content security policy**, or CSP (*Content Security Policy*). It is a response header that tells the browser which resources it is allowed to load or run on that page. The server sends it with the page: `default-src 'none'` forbids everything by default, and then only what the dashboard needs is allowed: `script-src 'self'` (only scripts served from the same origin as the page, which blocks an inline `<script>` or `onerror`), `style-src 'self'`, and `connect-src 'self'` (the dashboard can only `fetch` from its own origin). In addition, `frame-ancestors 'none'` prevents another page from putting yours in a frame, `base-uri 'none'` blocks changing the base of relative paths, and `form-action 'none'` keeps an injected form from sending data to another site. The CSP does not change the fact that an unsafe insertion is a defect; it is the net under the trapeze artist, not permission to stop looking.

Two reminders remain. First, if the dashboard ever shows a URL, do not build attributes by concatenating strings: pass the value as a JSX prop and validate the protocol your product allows, because an `href` with `javascript:` runs code even though it contains no tag. Types describe text; the security policy decides which text is an allowed destination. Second, the public contract already does its part: the internal URL of each service does not reach the dashboard, which reduces both the exposure of infrastructure and the amount of external text that could touch the page. Security is not a line of code at the end; it begins by deciding which values cross each boundary.

### The dashboard inside

The dashboard is four small files in `src/panel/`, plus a stylesheet. It is worth reading them in the order the browser uses them.

`cargar.ts` is the dashboard's network boundary. It defines the `Cargar` type, a function that receives an `AbortSignal` and returns a promise with a `ReportePublico`, and the real implementation, `cargarReporte`. This one requests `/api/estados` with the signal, checks `respuesta.ok` and throws “la API respondió 503” if it is not, converts the body with `respuesta.json()` to `unknown` (an annotation, no assertion), and passes it through `esReportePublico`; if that fails, it throws “la API no entregó un reporte válido”. The second parameter, `base`, is `""` in the browser, where `/api/estados` is resolved against the page that loaded it, and the tests use it to point to a local server with its full address. The three outcomes (report, invalid code, unmet contract) have a test, `cargar.test.ts`, against a real HTTP server that answers what each case needs.

`useReporte.ts` is a hook of our own, that is, a function whose name starts with `use` and which combines other hooks. It declares the `Carga` type as a discriminated union of three alternatives: `cargando`, `listo` with the report, and `error` with the detail. It is the pattern from lesson 3 applied to the state of a screen, and it has the same advantage: it is impossible to represent “ready” without a report, or “error” without detail. The hook stores that state with `useState`, and a number `intento` that serves only to ask the effect to repeat. The effect creates an `AbortController`, defines `pedir`, which calls `cargar(control.signal)` and stores `listo` or `error`, runs it once, schedules `setInterval` to repeat it every `cadaMs` milliseconds, and returns the cleanup that aborts the request and stops the timer. It returns the state and `recargar`, which sets the load to `cargando` and increases `intento`; since `intento` is in the dependency list, the effect is cleaned up and repeated.

The dependency list, `[cargar, cadaMs, intento]`, deserves a pause because it is where subtle errors hide. `cargar` is there because the effect uses it: if it changed, the effect must repeat with the new one. That requires the caller to pass a stable function: if `Panel` received a new function on every draw, the effect would repeat on every draw and you would have the loop of requests you already know. `cliente.tsx` mounts the application only once with `render(...)`, and does not run again: the arrow function it passes as a prop is created that single time and is the same during the whole life of the dashboard. If a component that is drawn many times created it, you would have to pin it with `useCallback` or declare it outside. ESLint, in this project, does not check dependency lists; the official package that does is `eslint-plugin-react-hooks`, and it is a good next install for a larger React project.

`Panel.tsx` is only presentation. `Contenido` receives a `Carga` and chooses what to draw with a `switch` whose `default` uses the `never` guard from lesson 3: if tomorrow you add the alternative `vacio` to `Carga` and forget to draw it, the compiler says so. Each screen carries a `role` attribute (`status` for “Cargando…” and `alert` for the error) that helps screen readers announce them, and helps the tests find them without depending on the exact text. `FilaEstado` is the one from figure 1, now with `duracionMs` and a CSS class per type. `Panel` joins the hook, the content, and an “Actualizar” button that calls `recargar`. Each row carries as `key` the position together with the name: `servicios.json` does not require names to be unique, and two rows with the same key would confuse React; since the list is replaced entirely on each load and the rows hold no state, the position causes no problem.

`cliente.tsx` is the only file that touches the document. It looks for the `#raiz` element, fails explicitly if it does not exist, and mounts the dashboard with `createRoot(raiz).render(...)`. It is the boundary between React and the page, and that is why it is the only thing the component tests do not import: the tests mount `Panel` on their own, in a simulated document.

The `panel.css` sheet is ordinary CSS and does not touch TypeScript, with a deliberate decision: there are no `style` attributes in the JSX. An inline `style` attribute would violate the `style-src 'self'` policy that the server sends, because the browser treats inline style as code that does not come from the origin. All the appearance lives in the sheet, which the browser loads from the same origin.

### From code to the browser: bundling with esbuild

So far everything you compiled runs in Node. The dashboard runs in a browser, and a browser does not know how to run `.tsx`, nor how to resolve `import { createRoot } from "react-dom/client"`, which is the name of a package and not the path of a file. You need to produce a single JavaScript file that the browser can load with a `<script>` tag. That task is called **bundling**, and it is done by a **bundler**: it starts from an entry file, follows all the `import`s, gathers what it finds, and writes the result.

The project uses esbuild, an open-source, very fast bundler whose official documentation is at `esbuild.github.io`. The `empaquetar` script is a single line:

```text
esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Each option has a reason. The first two arguments are the entry files: the dashboard's program and the stylesheet. `--bundle` is what makes esbuild follow the `import`s, including those of `react` and `react-dom`, and include them in the output; without that option, it would only translate the file and leave the `import` of a package that the browser could not resolve. `--minify` removes whitespace and shortens names so that the file weighs less, and it has an effect that matters: when it is used, esbuild defines `process.env.NODE_ENV` as `"production"`, and React then includes its production version, without the development checks and warnings. `--format=iife` writes the result as a function that runs immediately; it works with an ordinary `<script>`, without depending on browser modules. `--log-level=warning` silences informational messages and leaves only warnings and errors. `--outdir=dist/publico` puts the result in `dist/publico/`, which is what the server reads: `cliente.js` and `panel.css`.

There is a consequence that is baffling if it is not stated. esbuild converts TypeScript to JavaScript by erasing the types, but it does not verify them. What checks the types is still `tsc`: that is why `npm run verificar` exists and why `npm run empaquetar` can bundle a file with type errors without complaining. The two commands do different jobs: one answers whether the program is correct, the other produces what gets delivered. A pipeline that only bundled would have checked nothing.

Another consequence: the same `tsconfig.json` now compiles the server and the dashboard at once. That is why it includes `"jsx": "react-jsx"` and `"lib": ["ES2022", "DOM"]`, which declares the browser types (`document`, `window`, `HTMLElement`). It is a simplification with a cost: the server code also “sees” `document`, and a slip that used it would compile and fail at runtime. In a larger project they are split into two configurations, one for the server and one for the dashboard, which share the `contrato.ts` file; here a single one keeps the lesson focused.

Notice, finally, where React and React DOM end up. Since the bundler copies them inside `cliente.js`, the server running in production does not import them: they are installed with `--save-dev`, because they are only needed to build and to test. It is a counterintuitive difference compared with an application that draws on the server, and it has a practical consequence you will see in “Compiling and publishing”: the production artifact needs no dependencies at all.

### The server serves the dashboard

In lesson 8, `crearServidor` received two things: a function that obtains the report and a log. Now it receives a third, `leerActivo`, the function that delivers the content of the two files the bundler produces. An **asset** is a static file that the server delivers as is, such as a script or a stylesheet. The `Activo` type is the union `"cliente.js" | "panel.css"`: there is no way to ask for a file that is not in that list. That is the defense against a classic vulnerability, **path traversal**: a server that builds a file's path from what arrives in the URL, such as `/../../etc/passwd`, ends up delivering files it never meant to publish. Here the URL is only compared with two known routes and the file name is decided by the program, not the client; any other route is a `404` from the same `Ruta` of lesson 8. `main.ts` supplies the real implementation, `readFile` over `dist/publico/<activo>`, resolved with `import.meta.url` so that it works no matter from which folder you start the process.

The `Ruta` union grows by two alternatives, `pagina` for `GET /` and `activo` for the two files, and the `switch` with `never` makes the compiler force you to handle each one. The page, `pagina.ts`, is a minimal HTML document kept as a text constant: a `<div id="raiz">`, the link to `/panel.css`, and the `<script src="/cliente.js" defer>`. The `defer` attribute makes the browser run the script when it has finished reading the document, so that `#raiz` already exists.

The responses gain security headers. All of them carry `x-content-type-options: nosniff`, which forbids the browser from guessing a content type different from the declared one (without it, a browser could treat a text as a script). The page also carries the CSP policy from the previous section. JSON responses carry `cache-control: no-store`, because the state of the services changes and nobody should see a report stored in an intermediary's memory. And if reading an asset fails, for example because you forgot to run `npm run empaquetar`, the error is recorded in the log with its cause and the client receives a generic `500`, as in lesson 8.

A decision worth stating: the dashboard and the API share an origin, that is, the same combination of scheme, host, and port. That is why the dashboard's `fetch("/api/estados")` does not need **CORS**, the browser policy that decides whether a page from one origin can read responses from another, and which is configured with headers such as `Access-Control-Allow-Origin`. As long as dashboard and API come out of the same process, there is nothing to configure; if you ever separate them, that will be the first problem you meet, and the right answer is to declare the allowed origins explicitly, not to answer `*` for convenience.

### The finished `revisor`: assembly and tests

Now all the pieces are here. The complete project is the following. Each file appears once; those that did not change since lesson 8 carry the same explanation from there and are at the end.

First, the project configuration. `package.json` gains the `empaquetar` script and the new development dependencies, with exact versions. Install them from the root of `revisor/` with this command; npm adds them to `devDependencies`. The `empaquetar` script you add by hand, and the versions of the lesson 7 dependencies may appear with `^` in your file: it does not matter, `package-lock.json` pins what was installed, but you can leave `package.json` equal to the one below if you want.

```bash
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 esbuild@0.28.2 jsdom@29.1.1 @types/jsdom@28.0.3
```

```json fig09_05/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "empaquetar": "esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/jsdom": "28.0.3",
    "@types/node": "24",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@typescript/native": "npm:typescript@^7.0.2",
    "esbuild": "0.28.2",
    "eslint": "10.11.0",
    "jsdom": "29.1.1",
    "prettier": "3.9.9",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```
```json fig09_05/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "sourceMap": true
  },
  "include": ["src"]
}
```
```js fig09_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "No insertes HTML sin sanitizar: usa texto como hijo de JSX.",
      },
      {
        selector: "AssignmentExpression[left.property.name='innerHTML']",
        message: "No asignes innerHTML: usa textContent o un componente de React.",
      },
    ],
  },
});
```
The shared contract and the dashboard. `contrato.ts` is the one from lesson 8, unchanged; it is shown here because now both sides import it.

```ts
// fig09_05/src/contrato.ts
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
// fig09_05/src/panel/cargar.ts
import { esReportePublico, type ReportePublico } from "../contrato.js";

export type Cargar = (senal: AbortSignal) => Promise<ReportePublico>;

export async function cargarReporte(senal: AbortSignal, base = ""): Promise<ReportePublico> {
  const respuesta = await fetch(`${base}/api/estados`, { signal: senal });

  if (!respuesta.ok) {
    throw new Error(`la API respondió ${respuesta.status}`);
  }

  const cuerpo: unknown = await respuesta.json();

  if (!esReportePublico(cuerpo)) {
    throw new Error("la API no entregó un reporte válido");
  }

  return cuerpo;
}
```
```ts
// fig09_05/src/panel/useReporte.ts
import { useEffect, useState } from "react";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";

export type Carga =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "listo"; readonly reporte: ReportePublico }
  | { readonly tipo: "error"; readonly detalle: string };

export function useReporte(
  cargar: Cargar,
  cadaMs: number,
): { readonly carga: Carga; readonly recargar: () => void } {
  const [carga, establecerCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, establecerIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();

    async function pedir(): Promise<void> {
      try {
        const reporte = await cargar(control.signal);
        establecerCarga({ tipo: "listo", reporte });
      } catch (error: unknown) {
        if (control.signal.aborted) {
          return;
        }

        const detalle = error instanceof Error ? error.message : "falló la carga";
        establecerCarga({ tipo: "error", detalle });
      }
    }

    void pedir();
    const temporizador = setInterval(() => void pedir(), cadaMs);

    return () => {
      control.abort();
      clearInterval(temporizador);
    };
  }, [cargar, cadaMs, intento]);

  function recargar(): void {
    establecerCarga({ tipo: "cargando" });
    establecerIntento((actual) => actual + 1);
  }

  return { carga, recargar };
}
```
```tsx
// fig09_05/src/panel/Panel.tsx
import type { EstadoPublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { useReporte, type Carga } from "./useReporte.js";

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li className="disponible">
        <strong>{estado.nombre}</strong>: disponible (HTTP {estado.codigoHttp}, {estado.duracionMs}{" "}
        ms)
      </li>
    );
  }

  return (
    <li className="falla">
      <strong>{estado.nombre}</strong>: falla ({estado.detalle})
    </li>
  );
}

function Contenido({ carga }: { readonly carga: Carga }) {
  switch (carga.tipo) {
    case "cargando":
      return <p role="status">Cargando…</p>;
    case "error":
      return <p role="alert">No se pudo cargar el reporte: {carga.detalle}</p>;
    case "listo":
      return (
        <ul>
          {carga.reporte.estados.map((estado, posicion) => (
            <FilaEstado key={`${posicion}-${estado.nombre}`} estado={estado} />
          ))}
        </ul>
      );
    default: {
      const sinAtender: never = carga;
      throw new Error(`carga sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function Panel({
  cargar,
  cadaMs = 10_000,
}: {
  readonly cargar: Cargar;
  readonly cadaMs?: number;
}) {
  const { carga, recargar } = useReporte(cargar, cadaMs);

  return (
    <main>
      <h1>Revisor</h1>
      <Contenido carga={carga} />
      <button type="button" onClick={recargar}>
        Actualizar
      </button>
    </main>
  );
}
```
```tsx
// fig09_05/src/panel/cliente.tsx
import { createRoot } from "react-dom/client";
import { cargarReporte } from "./cargar.js";
import { Panel } from "./Panel.js";

const raiz = document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz en la página");
}

createRoot(raiz).render(<Panel cargar={(senal) => cargarReporte(senal)} />);
```
```css fig09_05/src/panel/panel.css
body {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-width: 40rem;
  padding: 0 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  border-left: 0.5rem solid #888;
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
}

li.disponible {
  border-color: #1a7f37;
}

li.falla {
  border-color: #cf222e;
}
```
The server, its page, and the entry point.

```ts
// fig09_05/src/pagina.ts
export const paginaInicial = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revisor</title>
    <link rel="stylesheet" href="/panel.css" />
  </head>
  <body>
    <div id="raiz"></div>
    <script src="/cliente.js" defer></script>
  </body>
</html>
`;
```
```ts
// fig09_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";
import { paginaInicial } from "./pagina.js";

export type ObtenerReporte = () => Promise<ReportePublico>;
export type Activo = "cliente.js" | "panel.css";
export type LeerActivo = (activo: Activo) => Promise<string>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly leerActivo: LeerActivo;
  readonly registrar: Bitacora;
}

type Ruta =
  | { readonly tipo: "pagina" }
  | { readonly tipo: "activo"; readonly activo: Activo }
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

const POLITICA_PAGINA = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/":
      return { tipo: "pagina" };
    case "/cliente.js":
      return { tipo: "activo", activo: "cliente.js" };
    case "/panel.css":
      return { tipo: "activo", activo: "panel.css" };
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviar(
  respuesta: ServerResponse,
  codigo: number,
  tipo: string,
  cuerpo: string,
  extra: Record<string, string> = {},
): void {
  respuesta.writeHead(codigo, {
    "content-type": tipo,
    "x-content-type-options": "nosniff",
    ...extra,
  });
  respuesta.end(cuerpo);
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  enviar(respuesta, codigo, "application/json; charset=utf-8", JSON.stringify(cuerpo), {
    "cache-control": "no-store",
  });
}

function errorInterno(opciones: OpcionesServidor, respuesta: ServerResponse, error: unknown): void {
  opciones.registrar({
    evento: "error",
    detalle: error instanceof Error ? error.message : "falla desconocida",
  });
  enviarJson(respuesta, 500, { detalle: "error interno" });
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
    case "pagina":
      enviar(respuesta, 200, "text/html; charset=utf-8", paginaInicial, {
        "content-security-policy": POLITICA_PAGINA,
      });
      return;
    case "activo":
      try {
        const tipo = ruta.activo === "cliente.js" ? "text/javascript" : "text/css";
        enviar(respuesta, 200, `${tipo}; charset=utf-8`, await opciones.leerActivo(ruta.activo));
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
      }
      return;
    case "salud":
      enviar(respuesta, 200, "text/plain; charset=utf-8", "ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
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
// fig09_05/src/main.ts
import { readFile } from "node:fs/promises";
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
    leerActivo: (activo) => readFile(new URL(`./publico/${activo}`, import.meta.url), "utf8"),
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
The tests are what supports the claim “the dashboard works” without opening a browser. It is worth reading what each one demonstrates, and what it does not.

`Panel.test.tsx` mounts the component for real: it installs a simulated jsdom document (`dom-de-prueba.ts`, as in figure 2), mounts `Panel` with `createRoot` inside `act`, and checks four things. That “Cargando…” is seen while the promise of `cargar` is still pending and that, when it is resolved, the two rows appear with their text. That a `detalle` with HTML is shown as text: it looks for an `img` element and finds none, and checks that the resulting HTML contains `&lt;img`. That an API error is shown with `role="alert"` and that pressing “Actualizar” (a real click on the button, inside `act`) requests again and recovers the list. And that when unmounting the tree the signal that `cargar` received ends up aborted. These are the real hooks: the effect runs, the state changes, and React draws again; there is no simulated React function.

`cargar.test.ts` checks the dashboard's network layer against a local HTTP server that answers what each case needs: a valid report, a `503`, and a JSON that does not meet the contract.

`paquete.test.ts` is the smoke test of the whole, and the most ambitious. It builds the dashboard with esbuild's API, in memory and with the same options as `npm run empaquetar`; it starts the `revisor` server with those files as assets and a report that contains a hostile `detalle` (`<b>negrita</b>`); it requests `/` and checks that the complete CSP policy arrives, identical to the exact text and with no `unsafe-` (relaxing it by accident turns the test red); it downloads `/cliente.js` just as a browser would receive it; it opens the page in a simulated document, runs that script, which makes a `fetch` to the real API, and waits for the row to appear. It checks that its text is literal, with the tags visible, and that no `b` element was created. It is the complete path: server, page, bundle, API, validation, React, and escaping, with the same bytes that would travel to a browser. A caveat of the test: jsdom does not ship `fetch`, so the test installs one that resolves relative routes against the local server, and that replacement discards the second argument, including the cancellation signal, because the `AbortSignal` created inside jsdom is not Node's. Cancellation is not tested here; the test in `Panel.test.tsx`, which does receive Node's signal, is the one that checks it.

And what none of these tests demonstrates: that a real browser downloads and runs the bundle. jsdom implements the DOM, but it is not a browser: it does not apply the CSS, it does not enforce the CSP policy, and it has no rendering engine. That is why, after building, there is a manual check that is not automated and that is worth doing once, as explained below.

The tests that already existed since lesson 8 are still there: the `leerPuerto` table, the `esReportePublico` one, and the server's. In the server only its construction changed, which now receives `leerActivo`. The next block shows all the files that did not change or that changed in a small detail.

```ts
// fig09_05/src/panel/dom-de-prueba.ts
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://127.0.0.1/",
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

export const documento = dom.window.document;
```
```tsx
// fig09_05/src/panel/Panel.test.tsx
import { documento } from "./dom-de-prueba.js";
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { Panel } from "./Panel.js";

const reporte: ReportePublico = {
  estados: [
    { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { nombre: "pagos", tipo: "falla", detalle: "<img src=x onerror=alert(1)>" },
  ],
};

async function montar(cargar: Cargar): Promise<{ contenedor: HTMLElement; desmontar: () => void }> {
  const contenedor = documento.createElement("div");
  documento.body.append(contenedor);
  const raiz = createRoot(contenedor);

  await act(async () => {
    raiz.render(<Panel cargar={cargar} cadaMs={60_000} />);
  });

  return {
    contenedor,
    desmontar: () => {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

test("muestra Cargando mientras la API no responde y luego las filas", async () => {
  let responder: (reporte: ReportePublico) => void = () => {};
  const cargar: Cargar = () =>
    new Promise((resolve) => {
      responder = resolve;
    });

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(contenedor.querySelector("[role=status]")?.textContent, "Cargando…");

  await act(async () => {
    responder(reporte);
  });

  const filas = [...contenedor.querySelectorAll("li")].map((fila) => fila.textContent);
  assert.deepEqual(filas, [
    "catálogo: disponible (HTTP 200, 42 ms)",
    "pagos: falla (<img src=x onerror=alert(1)>)",
  ]);
  desmontar();
});

test("un detalle con HTML se muestra como texto y no crea elementos", async () => {
  const { contenedor, desmontar } = await montar(async () => reporte);

  assert.equal(contenedor.querySelector("img"), null);
  assert.match(contenedor.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  desmontar();
});

test("muestra el error y se recupera al pulsar Actualizar", async () => {
  let intentos = 0;
  const cargar: Cargar = async () => {
    intentos += 1;

    if (intentos === 1) {
      throw new Error("la API respondió 503");
    }

    return reporte;
  };

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(
    contenedor.querySelector("[role=alert]")?.textContent,
    "No se pudo cargar el reporte: la API respondió 503",
  );

  await act(async () => {
    contenedor.querySelector("button")?.click();
  });

  assert.equal(contenedor.querySelector("[role=alert]"), null);
  assert.equal(contenedor.querySelectorAll("li").length, 2);
  assert.equal(intentos, 2);
  desmontar();
});

test("al desmontar cancela la solicitud en curso", async () => {
  let senalRecibida: AbortSignal | undefined;
  const cargar: Cargar = (senal) => {
    senalRecibida = senal;
    return new Promise(() => {});
  };

  const { desmontar } = await montar(cargar);
  assert.equal(senalRecibida?.aborted, false);
  desmontar();
  assert.equal(senalRecibida?.aborted, true);
});
```
```ts
// fig09_05/src/panel/cargar.test.ts
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { cerrar, escuchar, puertoDe } from "../servidor.js";
import { cargarReporte } from "./cargar.js";

async function servirRespuesta(
  codigo: number,
  cuerpo: string,
): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((_solicitud, respuesta) => {
    respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(cuerpo);
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

const casos = [
  {
    nombre: "devuelve el reporte cuando la API responde con el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos","tipo":"falla","detalle":"HTTP 503"}]}',
    esperado: undefined,
  },
  {
    nombre: "rechaza un código HTTP que no es 2xx",
    codigo: 503,
    cuerpo: '{"detalle":"error interno"}',
    esperado: "la API respondió 503",
  },
  {
    nombre: "rechaza un JSON que no cumple el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos"}]}',
    esperado: "la API no entregó un reporte válido",
  },
] as const;

for (const caso of casos) {
  test(`cargarReporte: ${caso.nombre}`, async () => {
    const { servidor, base } = await servirRespuesta(caso.codigo, caso.cuerpo);

    try {
      const senal = new AbortController().signal;

      if (caso.esperado === undefined) {
        const reporte = await cargarReporte(senal, base);
        assert.equal(reporte.estados[0]?.nombre, "pagos");
      } else {
        await assert.rejects(cargarReporte(senal, base), { message: caso.esperado });
      }
    } finally {
      await cerrar(servidor);
    }
  });
}
```
```ts
// fig09_05/src/panel/paquete.test.ts
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { aReportePublico } from "../reporte.js";
import { cerrar, crearServidor, escuchar, puertoDe, type Activo } from "../servidor.js";

async function empaquetar(): Promise<Map<string, string>> {
  const resultado = await build({
    entryPoints: [
      fileURLToPath(new URL("../../src/panel/cliente.tsx", import.meta.url)),
      fileURLToPath(new URL("../../src/panel/panel.css", import.meta.url)),
    ],
    bundle: true,
    minify: true,
    format: "iife",
    outdir: "salida",
    write: false,
    logLevel: "silent",
  });

  return new Map(
    resultado.outputFiles.map((archivo) => [archivo.path.split("/").pop() ?? "", archivo.text]),
  );
}

async function esperar(condicion: () => boolean): Promise<void> {
  for (let intento = 0; intento < 100; intento += 1) {
    if (condicion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("la condición no se cumplió a tiempo");
}

test("el paquete que sirve el servidor pinta el reporte en una página real", async () => {
  const archivos = await empaquetar();
  const api = crearServidor({
    obtenerReporte: async () =>
      aReportePublico([
        {
          servicio: { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
          tipo: "falla",
          detalle: "<b>negrita</b>",
        },
      ]),
    leerActivo: async (activo: Activo) => archivos.get(activo) ?? "",
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const pagina = await fetch(`${base}/`);
    const politica = pagina.headers.get("content-security-policy") ?? "";
    assert.equal(
      politica,
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    assert.doesNotMatch(politica, /unsafe-/);

    const script = await (await fetch(`${base}/cliente.js`)).text();
    const ventana = new JSDOM(await pagina.text(), { runScripts: "outside-only", url: base })
      .window;
    Object.assign(ventana, { fetch: (ruta: string) => fetch(new URL(ruta, base)) });
    ventana.eval(script);

    await esperar(() => ventana.document.querySelector("li") !== null);
    assert.equal(
      ventana.document.querySelector("li")?.textContent,
      "catálogo: falla (<b>negrita</b>)",
    );
    assert.equal(ventana.document.querySelector("b"), null);
    ventana.close();
  } finally {
    await cerrar(api);
  }
});
```
```ts
// fig09_05/src/servidor.test.ts
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
    leerActivo: async () => "",
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
    leerActivo: async () => "",
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
    leerActivo: async () => "",
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
```ts
// fig09_05/src/contrato.test.ts
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
// fig09_05/src/configuracion.test.ts
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
// fig09_05/src/reporte.test.ts
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
And the lesson 8 files that stay the same: the log, the query with `fetch`, the services-file reader, the configuration, the report, the model, the `revisarTodos` coordinator, `.prettierrc`, and `servicios.json`.

```ts
// fig09_05/src/bitacora.ts
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
// fig09_05/src/consulta.ts
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
// fig09_05/src/archivo.ts
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
// fig09_05/src/configuracion.ts
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
// fig09_05/src/reporte.ts
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
```ts
// fig09_05/src/modelo.ts
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
// fig09_05/src/revisar.ts
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
```json fig09_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```json fig09_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
```bash
$ cd fig09_05
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

✔ leerPuerto: sin variable usa 3000 (0.5965ms)
✔ leerPuerto: un puerto válido (0.069125ms)
✔ leerPuerto: 65535 es el límite (0.053416ms)
✔ leerPuerto: 65536 se pasa del límite (0.111167ms)
✔ leerPuerto: 0 no es un puerto (0.076833ms)
✔ leerPuerto: un decimal se rechaza (0.056958ms)
✔ leerPuerto: texto se rechaza (0.077583ms)
✔ leerPuerto: la cadena vacía se rechaza (0.061083ms)
✔ esReportePublico: un reporte con las dos variantes (0.642125ms)
✔ esReportePublico: null (0.076959ms)
✔ esReportePublico: estados no es un arreglo (0.1285ms)
✔ esReportePublico: un estado con un tipo desconocido (0.741875ms)
✔ esReportePublico: codigoHttp llega como texto (0.060958ms)
✔ muestra Cargando mientras la API no responde y luego las filas (18.194375ms)
✔ un detalle con HTML se muestra como texto y no crea elementos (3.132041ms)
✔ muestra el error y se recupera al pulsar Actualizar (4.856ms)
✔ al desmontar cancela la solicitud en curso (1.096125ms)
✔ cargarReporte: devuelve el reporte cuando la API responde con el contrato (21.967625ms)
✔ cargarReporte: rechaza un código HTTP que no es 2xx (8.867708ms)
✔ cargarReporte: rechaza un JSON que no cumple el contrato (3.011083ms)
✔ el paquete que sirve el servidor pinta el reporte en una página real (142.25275ms)
✔ disponible conserva código y duración (0.3745ms)
✔ falla conserva detalle (0.051708ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.32275ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (178.837542ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (10.282458ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (5.185333ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 532.285292
$ npm run empaquetar
> empaquetar
> esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

To see the dashboard in a real browser, build and start. `npm run empaquetar` leaves the dashboard in `dist/publico/`:

```text
$ npm run compilar
$ npm run empaquetar
$ wc -c dist/publico/*
  225635 dist/publico/cliente.js
     249 dist/publico/panel.css
  225884 total
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

Open `http://127.0.0.1:3100/` in your browser. You should see the title “Revisor”, a “Cargando…” that lasts less than a second, and a list with one service per line, with a green border for the available ones and red for those that fail; every ten seconds the list updates itself and the “Actualizar” button reloads it immediately. Open the developer tools (F12), the network tab, and confirm a `GET /api/estados` request with status 200 each time; in the console tab there must be no errors, and in the response headers of `/` the `content-security-policy` must appear. If something fails there, the server's log, in the first terminal, has one line per request.

With the server running, this is how each route of the page answers:

```text
$ curl -i http://127.0.0.1:3100/
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
x-content-type-options: nosniff
content-security-policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
...
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/cliente.js
200 text/javascript; charset=utf-8
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/etc/passwd
404 application/json; charset=utf-8
```

That last line is the proof of path traversal protection: requesting a file that the program never promised to deliver gives a `404`, not a file.

### Compiling and publishing: a known artifact

“Publishing” means different things in each organization, so there is no honest universal command. What is universal is the order: build a known artifact, inspect it, install only what is needed to run it, configure the environment outside the repository, and start what was built. An **artifact** is the identifiable output that is delivered to be run. This lesson prepares and checks that artifact; deployment on your infrastructure is outside what can be said in general.

The `revisor` artifact is a folder with four things: `dist/` (the compiled server and `dist/publico/` with the dashboard), `package.json` (which Node needs in order to know that the `.js` files in `dist/` are ESM modules, through its `"type": "module"` field), `package-lock.json` (the exact resolution of dependencies), and `servicios.json` (the configuration). It carries neither `src/` nor the development `node_modules/`. `dist/` also contains the compiled tests, which nobody runs in production: they do no harm, and if you want a stricter artifact you can exclude them in a separate build configuration. And since the dashboard is bundled inside `cliente.js` and the server only uses Node modules, the artifact needs no dependencies: what gets installed in production is nothing.

To check it, do not trust the logic: build it and run it in a clean folder, which is the closest thing to a new server. From the root of `revisor/`:

```text
$ npm run compilar && npm run empaquetar
$ mkdir ../revisor-artefacto
$ cp -R dist package.json package-lock.json servicios.json ../revisor-artefacto/
$ cd ../revisor-artefacto
$ npm ci --omit=dev

up to date, audited 1 package in 113ms

found 0 vulnerabilities
$ PUERTO=3100 node dist/main.js
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

`npm ci` installs exactly what `package-lock.json` says, fails if the lock and `package.json` disagree, and deletes `node_modules/` before starting: it is the installation designed for deliveries, unlike `npm install`, which can resolve new versions. `--omit=dev` skips the development dependencies. The result, “audited 1 package”, is the project itself: no production dependencies. If you had put `react` as a normal dependency, it would have been installed for nothing; if the server imported something that is only in `devDependencies`, this step is where it would fail, and it is better that it fails here than on the production server.

Before delivering the artifact, run the checks in this order, from a clean installation with `npm ci`: `npm run verificar`, `npm run lint`, `npm run formato`, `npm run probar`, `npm run empaquetar`. Review `package-lock.json` as part of the change, because it records what is going to run. Do not publish `node_modules/`, `.env` files, logs, or examples with real addresses, passwords, or tokens; and note that `servicios.json` is read from the folder where you start the process, so the service must be started with that folder as its working directory.

There are four decisions that the artifact does not make for you. The first: the server listens only on `127.0.0.1`, the local interface, and that is deliberate, because it must not be exposed to the Internet directly. The usual practice is to put in front a **reverse proxy**, a process that receives the public connections, terminates the HTTPS encryption, the **TLS**, and forwards the request to the `revisor` through the local interface; that proxy, and not the program, is the one that presents the certificate. The second: a supervisor, which starts the process, restarts it if it falls, and sends it `SIGTERM` to stop it, which is the reason the graceful shutdown of lesson 8 matters. The third: access. A public dashboard can be public if it only shows public information; one that reveals which systems you have and how they fail probably requires authentication, and it is not solved by hiding the URL: a route does not become private because it is not linked. Define the limit before publishing and test the responses without a valid session. The fourth: do not use anything that is for development, such as automatic reload or detailed messages, as if it were the final package.

## The error you will see

React does not invent a new class of type errors; a component's errors are those of any call, with the shape of the props. The first appears when you pass a prop that does not belong to the contract's union, and the second when you forget a required prop. With TypeScript 7.0.2, `tsc` reports both in the same file. Neither is a React problem: the state `"pendiente"` does not belong to the union that the dashboard promises to handle, and a `FilaEstado` without its `estado` has nothing to draw.

```tsx
// fig09_06.tsx
type EstadoPublico =
  | { readonly nombre: string; readonly tipo: "disponible"; readonly codigoHttp: number }
  | { readonly nombre: string; readonly tipo: "falla"; readonly detalle: string };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  return <li>{estado.nombre}</li>;
}

export const pantalla = (
  <ul>
    <FilaEstado estado={{ nombre: "pagos", tipo: "pendiente" }} />
    <FilaEstado />
  </ul>
);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_06.tsx
fig09_06.tsx(12,44): error TS2322: Type '"pendiente"' is not assignable to type '"disponible" | "falla"'.
fig09_06.tsx(13,6): error TS2741: Property 'estado' is missing in type '{}' but required in type '{ readonly estado: EstadoPublico; }'.
```

TS2322 says that a value cannot be assigned to the type the prop expects: here, that `"pendiente"` is neither of the two values of `tipo`. Do not fix it with `as EstadoPublico`: that assertion would silence precisely the warning that keeps you from painting a state that no component knows how to draw. If “pendiente” is a real state of the domain, add it to the union in `contrato.ts`, to the `esEstadoPublico` guard, to the server's converter, and to `FilaEstado`; the compiler will tell you where each piece is missing. TS2741 says that a required property is missing; read it as a question: should that row exist without a state? Almost always the answer is that the component was called wrongly.

There is an error that is not the compiler's and that you will run into: starting the server without having bundled the dashboard. The server answers the page, but `GET /cliente.js` returns `500` and the log says what is missing:

```text
$ curl -i http://127.0.0.1:3101/cliente.js
HTTP/1.1 500 Internal Server Error
...
{"detalle":"error interno"}
```

And in the server's terminal:

```text
{"momento":"2026-10-02T21:48:27.838Z","evento":"error","detalle":"ENOENT: no such file or directory, open '/home/tu-usuario/proyectos/revisor/dist/publico/cliente.js'"}
{"momento":"2026-10-02T21:48:27.839Z","evento":"solicitud","detalle":"GET /cliente.js 500 1 ms"}
```

`ENOENT` means “no such file”. The solution is not to create an empty file: it is to run `npm run empaquetar`. The screen, meanwhile, stays blank, and the developer tools show the failed `/cliente.js` script in red. It is a good example of why the error is recorded on the server and not only answered: without the log, the browser would only say “load failed”.

And a third case, this one from the browser: if in the console you see `Refused to execute inline script because it violates the following Content Security Policy directive`, the policy is doing its job. Something tried to run an inline script or load a resource from another origin. Do not relax the policy with `'unsafe-inline'` to make the warning disappear: find out what it tried to run, which is almost always a sign that something should not be there.

## What gets done wrong

- **Inserting outside HTML without sanitizing it.** `dangerouslySetInnerHTML` or `elemento.innerHTML = texto` with a text you do not control turn data into instructions: that is XSS. Show text as a JSX child, and if you truly need someone else's HTML, pass it through a maintained sanitizer, before drawing. The project forbids both forms with ESLint and limits what can run with a CSP policy.

- **Writing a homemade function to “clean” HTML.** Replacing `<script>` or a list of words lets event attributes, `javascript:` URLs, SVG, and other encodings through. A list of what is forbidden is always incomplete; a maintained sanitizer starts from a list of what is allowed.

- **Treating the JSON from the network as if it were the type.** `(await respuesta.json()) as ReportePublico` compiles and checks nothing. Receive `unknown`, validate with the shared guard, and check `respuesta.ok` before parsing.

- **Turning an API error into an empty list.** A dashboard that shows “no hay servicios” when the API returned a `503` hides the failure exactly where someone is looking. The error state exists so that the screen says what happened.

- **Requesting data in the component body.** A `fetch` outside `useEffect` repeats on every draw, and since the response changes the state, it causes another draw: a loop of requests. Requests are effects and go in `useEffect`.

- **Forgetting the effect's cleanup.** Without aborting the request or stopping the timer on unmount, late responses try to update components that no longer exist and the intervals keep running forever.

- **Sharing the internal model instead of the public contract.** If the dashboard imports `Estado`, the URL of each service travels to the browser out of convenience. Share `contrato.ts`: what crosses the boundary, not what is inside.

- **Importing Node code into a shared file.** An `import "node:fs"` in `contrato.ts` breaks the dashboard's bundling, or worse, carries to the browser code that should never have left the server. What is shared contains only types and pure functions.

- **Confusing bundling with checking.** `esbuild` erases the types without verifying them. A flow that only bundles can deliver a program with type errors; `npm run verificar` is still mandatory.

- **Serving files with the path the client writes.** Building `readFile("dist/publico" + url)` allows requesting `/../../secreto`. With a closed list of known assets, like `Activo`, that attack has no way in.

- **Relaxing the CSP policy with `'unsafe-inline'` at the first warning.** It is the equivalent of switching off an alarm because it is ringing: you lose the defense exactly when it was working. Find out what tried to run.

- **Publishing the working directory.** `node_modules/`, `src/`, `.env`, and logs are not part of the artifact. Build, copy only what is needed, and install with `npm ci --omit=dev`.

## Exercises

### Exercise 1 — A third way of seeing the report

Add to the dashboard a summary above the list: “2 de 3 servicios disponibles”. Compute it in a pure function `resumir(reporte: ReportePublico): string` in its own file, test it with a table of cases (none available, all, a mix, an empty list), and use it from `Contenido`. Confirm with `npm run probar` that the `Panel` test still passes, and add an assertion that checks the summary on screen.

### Exercise 2 — Review what crosses the API

Add to `Servicio` a field `responsable: string` (for example, a contact email) and to `servicios.json` the value for each service, without touching `contrato.ts`. Run `npm run verificar` and explain which files you had to modify for it to compile. Then start the `revisor` and confirm with `curl http://127.0.0.1:3100/api/estados` that the owner does not appear in the response. Explain what would have happened if the API serialized the `Estado` directly.

### Exercise 3 — Validate before painting

Add to the contract an optional field `detalle` on the available states, for example to warn of slow responses, and update `esEstadoPublico` so that it accepts it only if it is text. Write two new cases in the table of `contrato.test.ts`: one valid and one with a numeric `detalle`. Check that the dashboard shows the detail of an available state without `FilaEstado` using an assertion.

### Exercise 4 — A dashboard that does not silently go stale

If the API stops answering, the dashboard shows the error, but it loses the list it already had. Modify `useReporte` so that, when an update fails and there was already a list, it keeps the last list together with the error notice. Think about which alternative of `Carga` you need to add, add a test in `Panel.test.tsx` that checks it, and confirm that the compiler points to the `switch` of `Contenido` until you handle the new alternative.

## Solutions

### Solution 1

The computation is a pure function that knows nothing about React: it receives the contract and returns text. That lets you test it with data built in memory, and it is what `Contenido` uses, with no additional logic.

```ts
// src/panel/resumir.ts
import type { ReportePublico } from "../contrato.js";

export function resumir(reporte: ReportePublico): string {
  const disponibles = reporte.estados.filter((estado) => estado.tipo === "disponible").length;
  return `${disponibles} de ${reporte.estados.length} servicios disponibles`;
}
```

In `Contenido`, the `listo` branch draws `<p>{resumir(carga.reporte)}</p>` before the list. In the component test, the assertion is `assert.equal(contenedor.querySelector("p")?.textContent, "1 de 2 servicios disponibles")` with the sample report, which has one available service and one failing. The empty list deserves its case: `0 de 0 servicios disponibles` is a correct sentence, but decide whether you prefer other text before a person sees it.

### Solution 2

Adding `responsable` to `Servicio` breaks the compilation in every place that builds a `Servicio` without it: `leerServicio` in `configuracion.ts`, which must read and validate the field with the same guards as the rest, and the tests and figures that write services by hand. `contrato.ts`, `aReportePublico`, and the dashboard do not change, and that is the point of the exercise: since `aEstadoPublico` builds the object field by field, the new field does not reach the response. If the API serialized the `Estado` with `JSON.stringify`, `responsable` would travel to every browser without anyone having decided it; it would be a leak of personal data caused by adding a column.

### Solution 3

The field is optional in the type and the guard only requires it when present: “optional” means it may be missing, not that it may have any value.

```ts
// src/contrato.ts (fragmento)
| {
    readonly nombre: string;
    readonly tipo: "disponible";
    readonly codigoHttp: number;
    readonly duracionMs: number;
    readonly detalle?: string;
  }

// en esEstadoPublico, rama "disponible":
return (
  typeof valor.codigoHttp === "number" &&
  typeof valor.duracionMs === "number" &&
  (valor.detalle === undefined || typeof valor.detalle === "string")
);
```

In `FilaEstado`, the `disponible` branch adds `{estado.detalle === undefined ? null : ` — ${estado.detalle}`}` after the duration. It is a normal narrowing: inside the non-`undefined` branch, `estado.detalle` is `string`, without any assertion. The two cases of the table are a report with `detalle: "lento"` on an available state, which must be valid, and another with `detalle: 7`, which must be rejected.

### Solution 4

The missing alternative is a load with a list and a notice at the same time: `{ tipo: "obsoleto"; reporte: ReportePublico; detalle: string }`. It is the only way to represent “I have old data and the last attempt failed” without inventing two variables that can contradict each other.

```ts
// en useReporte, dentro de pedir():
} catch (error: unknown) {
  if (control.signal.aborted) {
    return;
  }

  const detalle = error instanceof Error ? error.message : "falló la carga";
  establecerCarga((actual) =>
    actual.tipo === "listo" || actual.tipo === "obsoleto"
      ? { tipo: "obsoleto", reporte: actual.reporte, detalle }
      : { tipo: "error", detalle },
  );
}
```

Two details. When the next update does work, `establecerCarga({ tipo: "listo", reporte })` discards the notice. And since `Contenido` does a `switch` with the `never` guard, the compiler points to (TS2322) that function until you draw the `obsoleto` branch: the list and a `<p role="alert">` with the notice. That is the usefulness of modeling the screen's states as a union.

## How I know I got it

- [ ] `npx tsc --version` prints `Version 7.0.2` inside `~/proyectos/revisor`.
- [ ] In `figuras/`, `fig09_02.tsx` prints `primer render: <p>Cargando…</p>` and then `tras el efecto: <p>2 servicios</p>`.
- [ ] `fig09_03.tsx` prints the escaped tag with `&lt;` and `&gt;`, and `fig09_04.tsx`, with `dangerouslySetInnerHTML`, prints it unescaped.
- [ ] In the project, `npm run verificar`, `npm run lint`, and `npm run formato` finish without warnings, and `npm run probar` reports 27 passing tests and 0 failing.
- [ ] When adding a file with `dangerouslySetInnerHTML`, `npm run lint` fails with the rule's message; when deleting it, it passes again.
- [ ] `npm run empaquetar` finishes with no output and leaves `cliente.js` and `panel.css` in `dist/publico/`.
- [ ] With `PUERTO=3100 npm run arrancar`, opening `http://127.0.0.1:3100/` in a browser shows the list, “Actualizar” reloads it, and the network tab shows `GET /api/estados` with status 200.
- [ ] `curl -i http://127.0.0.1:3100/` includes the `content-security-policy` header, and `curl http://127.0.0.1:3100/etc/passwd` answers 404.
- [ ] In a clean folder with only `dist/`, `package.json`, `package-lock.json`, and `servicios.json`, `npm ci --omit=dev` finishes well and `node dist/main.js` starts the same server.

## Further reading

- [React: Learn React](https://react.dev/learn) — official documentation on components, props, state, and effects, with a TypeScript section; accessed on October 2, 2026.

- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — official documentation of `useEffect`: when to use it, the dependency list, and the cleanup function; accessed on October 2, 2026.

- [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — OWASP guide to preventing XSS, with the rules per output context; accessed on October 2, 2026.

- [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) — reference on the content security policy and its directives; accessed on October 2, 2026.
