# Lesson 1 — Installing TypeScript on your Linux Mint

**Time:** 2 × 45 min

**What you build:** the environment and your first program

**What you learn:** Node LTS, package manager, `tsc`, editor, strict `tsconfig`, running and debugging

## By the end you will be able to

- Install and verify Node.js 24 LTS, npm, and the TypeScript compiler on Linux Mint.
- Create an ESM project with `package.json`, a local TypeScript dependency, and a reproducible lock file.
- Compile a program with `npx tsc --strict --target ES2022 --module nodenext` and run the resulting JavaScript with Node.
- Configure a project with a strict `tsconfig.json`, output in `dist/`, and source maps.
- Tell apart running a `.ts` with Node's type stripping from checking and compiling it with `tsc`.
- Open the project in an editor, stop execution with a breakpoint, and fix a `TSxxxx` diagnostic.

## The why before the how

The `revisor` will end up as an application with two parts that must match: an API that queries several services and a web dashboard that presents the report. Before reaching that complexity, we need to settle a less glamorous but decisive question: how does your computer turn the code you write into a program it can run?

JavaScript already answers part of that question. Node runs `.js` files; it understands JavaScript syntax, creates the process, loads modules, gives access to files and the network, and ends the process when the work is done. Since Node 22.18 it can also run certain `.ts` files by erasing their type syntax. TypeScript adds a different stage: `tsc` checks the program and produces JavaScript. It does not replace Node, nor does it become a different operating system. It is the tool that finds contradictions in your code before Node gets the chance to run it.

That separation matters from day one. Imagine that, a few lessons from now, the `revisor` receives a list of services and each element needs a name, a URL, and a timeout policy. If you confuse a number with text, or call a property that does not exist, it is better to get an explanation at compile time than to discover it after deploying an API. The compiler does not check whether a URL really responds, nor can it guarantee that an external JSON has the expected shape; those boundaries will be validated later. But it can check whether the code you wrote is consistent with the rules you declared.

In Go, `go run` combines compilation and execution in a single command and can give the impression that both are one and the same operation. TypeScript makes the boundary more visible: `tsc` transforms and checks; `node` runs. At first they look like two steps too many. In practice they are two different responsibilities, and it pays to know which one failed. If `tsc` reports `TS2322`, there is not yet a reliable program to run. If `tsc` finishes without messages and Node fails, the problem lies in runtime behavior, an import that does not exist on disk, an environment variable, or an external response.

The right tool also avoids problems that take a while to show up. Linux Mint 22.x inherits the Ubuntu 24.04 base and its packages favor stability; LMDE, on the other hand, is based on Debian. That is reasonable for system components, but a course needs an explicit Node line and an explicit TypeScript version. Here you will use Node 24 LTS and TypeScript 7.0.2. You do not need to memorize a minor Node revision or a particular npm version: check that `node -v` starts with `v24`, that npm responds, and that the local compiler prints `Version 7.0.2`.

The first decision of the course is to install TypeScript inside the project, not as a global tool for your user. A global installation answers the question “which compiler do I have today on this laptop?”. A local dependency answers a more useful question: “which compiler should this project be built with, here and on another computer?”. `package.json` stores that decision; `package-lock.json` records the resolved versions. That way, when another person clones the `revisor`, they do not depend on whatever happens to be installed.

We will also start with ESM, the standard JavaScript modules. This avoids adopting an old module syntax just because it still appears in old examples. In the `revisor`, `package.json` declares `"type": "module"` and relative imports write the extension the file will have at runtime: `.js`, even though the source file is `.ts`. It looks strange the first time, but it is a direct consequence of `tsc` emitting JavaScript and Node loading it from `dist/`.

Finally, turning on `strict` is not a ceremony. It is choosing to have the compiler point out uncertainties while the project is still small. If you start relaxed and tighten the rules after you have twenty files, the diagnostics pile up and it is hard to tell a design decision from a mechanical fix. The `revisor` will have failing services, missing responses, and external data; building it with strict checking from the first line makes those possibilities visible instead of hiding them.

## The concepts

### Node.js, npm, and the local dependency

Node.js is the environment that will run the `revisor`'s JavaScript. npm is the package manager bundled with Node: it downloads dependencies, keeps their versions, and offers commands defined by the project. TypeScript is one of those development dependencies: it is needed to convert the source code, but not to run the already compiled JavaScript.

First install Node 24 LTS. `nvm` is a Node version manager: it lets you install and select Node lines without using the system package. The official `nvm` documentation publishes this installer for its version 0.40.8:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Open a new terminal after installing it. If your terminal uses `bash` and still does not find the command, load its configuration with `source ~/.bashrc`; the installer modifies the appropriate startup file among `.bashrc`, `.bash_profile`, `.zshrc`, and `.profile`. Now install and select line 24:

```bash
nvm install 24
nvm alias default 24
nvm use 24
nvm --version
node -v
npm -v
```

`nvm --version` and `npm -v` must print a version. `node -v` must start with `v24`; `nvm install 24` may pick a newer minor revision within that LTS line. If `nvm` says it does not exist, open a new terminal or load the startup file the installer indicated. Before looking for random fixes, run `echo "$SHELL"` to find out whether you use `bash`, `zsh`, or another shell; a change placed in `.bashrc` is not automatically loaded in a `zsh` session. On Linux Mint, if you do not have `curl` yet, install it with `sudo apt install curl` and repeat the installer command.

Now create a folder for the project. The name has no special technical meaning yet: it will be the root of the `revisor`, where `package.json`, `tsconfig.json`, the source code, and the compiled output will live.

```bash
mkdir -p ~/proyectos/revisor/src
cd ~/proyectos/revisor
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

`npm init -y` creates a basic `package.json`. `npm install --save-dev` adds the tools needed for development, writes their versions to `package.json`, and generates `package-lock.json`. `--save-exact` prevents npm from writing the `^` prefix: the project keeps exactly TypeScript 7.0.2 and the revision of `@types/node` that it resolved within line 24. The `--save-dev` flag expresses that TypeScript and the Node declarations are needed to build and check the project, not to run the final result in production.

Adjust the `package.json` file to declare ESM and give useful names to the project's commands:

```json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

`"private": true` prevents an accidental publication to the public npm registry. `"type": "module"` makes Node interpret the project's `.js` files as ESM modules. The commands under `"scripts"` run with `npm run compilar`, `npm run verificar`, and `npm run arrancar`; npm automatically finds the installed executables in `node_modules/.bin/`, so you must not add that folder to your `PATH`. The exact revision of `@types/node` may be a different one from line 24 if you install the course later; keep the one your installation wrote with `--save-exact`.

As a minimal example, this program only confirms that you have the compiler and Node coordinated. The first line identifies the figure file; it is not part of the syntax your project needs.

```ts
// fig01_01.ts
const nombrePrograma = "revisor";

console.log(`Hola, ${nombrePrograma}: TypeScript ya compila.`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_01.ts
$ node fig01_01.js
Hola, revisor: TypeScript ya compila.
```

Inside the `revisor`, the same idea appears at a larger scale. The local dependency lets `npm run compilar` use the compiler agreed on by the project, not a global version that someone installed months ago. Keep `package-lock.json` in Git together with `package.json`: the former is not generated junk, but the precise record of which packages npm resolved. `node_modules/`, on the other hand, is excluded with `.gitignore`, because it can be rebuilt with `npm install` from those two files.

A frequent confusion is thinking that `npx tsc` installs TypeScript globally. That is not so when the package is already in the project: `npx` finds the local executable first. You can check which version is associated with the project with this command:

```bash
npx tsc --version
```

It must answer `Version 7.0.2`. If it answers a different version, do not carry on as if nothing happened. Check that you are inside `~/proyectos/revisor`, that `node_modules/` exists, and that `package.json` has the right dependency. The tool's name, `tsc`, is kept even though its current implementation is native; you do not have to change the course's commands because of that.

The course figures also need their own ESM context and their own local compiler. Create a sibling folder of the project to experiment without mixing the generated JavaScript with `src/`:

```bash
mkdir -p ~/proyectos/figuras
cd ~/proyectos/figuras
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

Open its `package.json` and add `"type": "module"` (and `"private": true`) next to what npm wrote, without deleting `devDependencies`: if you lose them, TypeScript is no longer installed. The `@types/node` number may be a different one from line 24. Do not put a `tsconfig.json` in this folder: single-file figures use their explicit options with `npx tsc`. When one of them uses top-level `await`, that ESM `package.json` avoids `TS1309`. `npx tsc` looks first for the local executable in `~/proyectos/figuras/node_modules/.bin/`; it does not install TypeScript globally.

```json
{
  "name": "figuras",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

### Compiling, emitting, and running

Node 24 can run a `.ts` directly through *type stripping*, the erasure of type syntax before running JavaScript. This capability is available without a flag since Node 22.18 and is stable since Node 24.12. It is not a compilation: Node replaces the types with spaces and does no type checking. That is why `node src/main.ts` can be useful for a single-file script, but it does not prove that the program is correct; `tsc` is what checks and emits the output the `revisor` will run.

Type stripping only accepts erasable syntax. Node does not support `.tsx`, nor constructs that generate JavaScript such as `enum`, `namespace` with values, or parameter properties in constructors, unless you enable the experimental `--experimental-transform-types`. It does not read `tsconfig.json`, `paths`, or `.ts` files inside `node_modules` either. If you import only a type, write it with `import type` so that it matches what Node can erase. `erasableSyntaxOnly` is a TypeScript option that warns about constructs Node cannot erase.

Imports reveal why the course's flow compiles projects before starting them. When running `.ts` directly, Node requires the literal source extension: `import "./arranque.ts"` works; `import "./arranque.js"` looks for exactly a `.js` file next to the source and fails if only `arranque.ts` exists. The `revisor` uses `.js` in its imports because that will be the path of the files emitted in `dist/`. Therefore, use `node archivo.ts` only for a single-file experiment, and use `npm run compilar` followed by `npm run arrancar` for the multi-file project.

`tsc` reads the program, checks it, and emits `.js`. This transformation is sometimes called transpilation because the source and the result are closely related languages, but for your daily flow it is enough to remember two verbs: check and compile with `tsc`; run the output with `node`.

Look at this program. The `: string` annotation is there so that TypeScript checks the value of `estado`; it is not meant to reach Node. Types will be studied in depth in the next lesson. For now, use it as evidence that the compiler checks a layer that is not part of the executable program.

```ts
// fig01_02.ts
const estado: string = "entorno listo";
const serviciosPendientes = 3;

console.log(`revisor: ${estado}; ${serviciosPendientes} servicios pendientes.`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_02.ts
$ node fig01_02.js
revisor: entorno listo; 3 servicios pendientes.
```

After compiling, open `fig01_02.js`. You will see that it contains `const estado = "entorno listo";`, without `: string`. TypeScript erases type annotations when emitting JavaScript. It is an important difference from Go: Go compiles to a binary that carries machine instructions; TypeScript emits JavaScript and requires Node, a browser, or another JavaScript environment to run that result.

That also sets a clear limit. If someone changes the emitted JavaScript file, or if a client sends a JSON with false data, the TypeScript annotations will not be present during execution to stop it. Types protect the code you compile; they do not by themselves validate what arrives from the network. In the lesson on external data, the `revisor` will explicitly validate its boundaries before turning unknown information into trustworthy values.

Do not run the files TypeScript leaves next to the source in a real project. In the figures it is useful because it reduces steps, but mixing `.ts` and `.js` in `src/` ends up confusing which file should be edited and which should be published. The `revisor` will separate the sources from the output: `src/` will contain what you write; `dist/` will contain what `tsc` produces.

Inside the project, the initial startup program can be deliberately small. Do not declare `Servicio` or `Estado` yet: those names will get a precise model in lesson 3. At this stage the right progress is to have a project that builds repeatably, not to bring forward types that do not have clear rules yet.

The relationship between the project's commands will always be the same:

```bash
npm run compilar
npm run arrancar
```

The first one checks the project and produces the files under `dist/`. The second one runs exactly the built output. If you edit `src/main.ts` and forget to compile again, `npm run arrancar` will run the previous version of `dist/main.js`. That separation seems inconvenient until you debug a failure: you know whether you are looking at the current code or at an old artifact.

### `tsconfig.json` and strict mode

Writing all the compilation options in every command works for a figure, but not for a project. `tsconfig.json` is the compilation contract: it identifies the source files, defines the output, and keeps decisions that must be the same for every member of the project and for continuous integration.

Create this `tsconfig.json` at the root of `revisor/`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "noEmitOnError": true
  },
  "include": ["src"]
}
```

`target` declares the JavaScript version TypeScript will emit. `ES2022` is appropriate for Node 24: it does not force the compiler to transform modern features into longer equivalents. `module` and `moduleResolution` set to `NodeNext` make TypeScript follow the module rules that Node applies to a modern project. The pairing matters: choosing a different resolution can allow imports that Node will later be unable to resolve.

`rootDir` and `outDir` make the boundary between what you write and what is generated visible. The course's fixed entry point, `src/main.ts`, ends up as `dist/main.js`; a folder `src/reporte/tabla.ts` ends up as `dist/reporte/tabla.js`. This correspondence will later let the backend publish a clean directory, with no sources or development dependencies mixed in.

`strict: true` activates a family of checks, among them `strictNullChecks`, `noImplicitAny`, and checks for initialization and functions. Since TypeScript 6 the default is already `true`; writing it makes explicit a decision that whoever turns it off will have to change on purpose. It does not mean “TypeScript becomes annoying”; it means the compiler stops assuming that every value exists, that every variable has an obvious shape, or that an ambiguous piece of data is safe. You can turn on even more demanding options in the future, but `strict` is the course's non-negotiable starting point.

`types: ["node"]` tells TypeScript to load the Node type declarations installed through `@types/node`, including those of modules such as `node:fs/promises`. Since TypeScript 6, the `types` option no longer loads all installed `@types` packages by default, so declaring it is necessary even though `@types/node` is in `devDependencies`: without it, a Node import can fail with `TS2591`.

`noEmitOnError` prevents leaving new JavaScript behind when the project has errors. Without that option, TypeScript may find a contradiction and still emit files; then you run a partially updated `dist/` and diagnose the wrong problem. In a services project, producing a known and complete output is preferable to producing a doubtful one.

`sourceMap: true` creates maps that relate each emitted JavaScript file to its TypeScript source. They do not change production behavior by themselves. Their usefulness shows when debugging: the editor can stop at the `.ts` line you wrote, instead of sending you to a line of emitted JavaScript that does not contain the original annotations.

Inside the `revisor`, the first `src/main.ts` can reuse the pattern of the previous figure. Copy it to `src/main.ts`, run `npm run compilar`, and check that `dist/main.js` appears together with `dist/main.js.map`. From that moment on, you do not need to repeat long flags: `npm run compilar` takes its decisions from `tsconfig.json`.

There is a nuance that avoids a lot of confusion: with TypeScript 7.0.2, if you run `npx tsc src/main.ts` in a folder that contains `tsconfig.json`, the compiler does not ignore it: it stops with `TS5112` and asks you to choose. To compile an isolated file use `npx tsc --ignoreConfig src/main.ts` and supply the flags you need; to compile the project according to its configuration use `npx tsc` without files, or `npx tsc --project tsconfig.json`. In this course, `npm run compilar` is equivalent to the second case because the script contains only `tsc`.

This minimal project shows both decisions. The first command fails because a file was named while a `tsconfig.json` exists; the second reads the full configuration, and the third runs the emitted JavaScript.

```json fig01_05/package.json
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

```json fig01_05/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```ts
// fig01_05/src/main.ts
const estado: string = "entorno listo";

console.log(`revisor: ${estado}`);
```

```bash
$ cd fig01_05
$ npx tsc src/main.ts
error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.
$ npx tsc --project tsconfig.json
$ node dist/main.js
revisor: entorno listo
```

### ESM modules and `.js` extensions

A module lets you split the program into files that export values and files that import them. The `revisor` will need that separation: the shared model, the logic that queries services, the server, and the dashboard must not live in one endless file. ESM is JavaScript's standard module system and is the one we will use from now on.

The first surprise is that a TypeScript file imports the `.js` extension. It is not a typo. TypeScript sees `./arranque.js`, understands that the corresponding source is `arranque.ts`, and emits an `import "./arranque.js"` that Node can resolve when running inside `dist/`.

```ts
// fig01_03/arranque.ts
export function mensajeDeArranque(): string {
  return "revisor: entorno listo";
}
```

```ts
// fig01_03.ts
import { mensajeDeArranque } from "./fig01_03/arranque.js";

console.log(mensajeDeArranque());
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_03.ts
$ node fig01_03.js
revisor: entorno listo
```

The example has two files on purpose. `arranque.ts` offers a function with `export`; the main file receives it through `import`. In an ESM project, do not write `require`, do not omit the extension in relative imports, and do not change `.js` to `.ts` just because you are reading the source. Those three decisions mix rules from different eras and tend to produce errors that look like compiler problems when they are really Node's loading rules.

Inside the `revisor`, this pattern will allow a clear boundary. Later, `src/modelo/servicio.ts` will export the shared vocabulary; `src/revisar/` will use that vocabulary to query; and the dashboard will import the same compiled or published contracts from a shared package. Today it is enough to practice the mechanics: one file exports, another imports, and Node runs the `.js` output.

Do not use absolute disk paths as imports or invented aliases from the first lesson. An alias such as `@/modelo` can be convenient in an editor, but it requires configuring TypeScript, Node, tests, and the web bundler at the same time. Explicit relative imports are less spectacular and more transparent while you learn which file depends on which.

### Editor, diagnostics, and debugging

You can write TypeScript with any text editor, but an editor with language support reduces the time between making an error and understanding it. Visual Studio Code recognizes `tsconfig.json`, shows TypeScript diagnostics, lets you go to a definition, and debugs Node. Open the whole project folder, not just `src/main.ts`, so that the editor detects `package.json`, `tsconfig.json`, and the module structure.

On Linux Mint 22.x you can download the `.deb` package for Debian/Ubuntu from the [VS Code download page](https://code.visualstudio.com/Download) and, from the folder where you saved it, install it like this. The package offers to configure the Microsoft repository to receive automatic updates:

```bash
sudo apt install ./<archivo>.deb
code --version
```

You can also configure that repository manually. The list of architectures is the one Microsoft publishes: `amd64`, `arm64`, and `armhf`.

```bash
sudo apt install wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft.gpg
sudo tee /etc/apt/sources.list.d/vscode.sources > /dev/null <<'EOF'
Types: deb
URIs: https://packages.microsoft.com/repos/code
Suites: stable
Components: main
Architectures: amd64,arm64,armhf
Signed-By: /usr/share/keyrings/microsoft.gpg
EOF
sudo apt update
sudo apt install code
code --version
```

These are system installation procedures: read them and run them on your Mint, not inside the project. For LMDE use the downloaded `.deb` package; do not assume its package sources are Ubuntu's.

```bash
cd ~/proyectos/revisor
code .
```

The terminal does not need the `code` command to exist for TypeScript to work. If your Visual Studio Code installation did not add it to the `PATH`, open the application from the menu and use “Open Folder” to select `~/proyectos/revisor`. The important thing is to open the project root, because that is where the configuration file that defines how the source files are checked lives.

Configure debugging so that it compiles first with the project's script. Create the `.vscode/` folder and save these two valid JSON files. A task is an instruction that VS Code can run before starting the debugger.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "compilar revisor",
      "type": "shell",
      "command": "npm",
      "args": ["run", "compilar"],
      "problemMatcher": "$tsc"
    }
  ]
}
```

Save it as `.vscode/tasks.json`. Now create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Depurar revisor",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/main.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "compilar revisor",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

`preLaunchTask` ties both configurations together: before running Node, VS Code runs `npm run compilar`; it does not use a TypeScript task installed by the editor that might point to another version. `outFiles` indicates where the JavaScript files and the maps that correspond to the TypeScript source are.

Compile before debugging if you want to check the result separately:

```bash
npm run compilar
```

Then open `src/main.ts`, click to the left of the number of a line with `console.log` to set a red dot, and press `F5`. Choose the “Depurar revisor” configuration. Thanks to `sourceMap: true`, the debugger should stop at the original TypeScript line. From there you can inspect variables, step one line, step into a function, or continue.

As a quick alternative, open the command palette, choose “Debug: Create JavaScript Debug Terminal”, and run `node dist/main.js` inside that terminal. That mode debugs any Node process you start there; with source maps active, breakpoints are set in the `.ts` files. The `launch.json` is better when you want to repeat the same startup with `F5`; the debug terminal is for exploring a one-off command.

A breakpoint does not fix the program or replace a test. It is for observing the real state just before an operation. Later it will be useful for stopping the `revisor` before interpreting an HTTP response and comparing what you assumed arrived with the value that really arrived. If a value can be `undefined`, do not assume that the debugger proves it will always be so just because in one particular run it had a value; use it to form an explanation and then write a reproducible validation or test.

The editor console and the terminal play different roles. `TSxxxx` diagnostics tell you that the program contradicts its types before running. The debug console shows what happened in a particular execution. Both are valuable, but they answer different questions. Starting with the compiler diagnostic usually saves time: there is no point chasing in the debugger a branch of a program that TypeScript already knows cannot be built correctly.

## The error you will see

The following program has an intentional error. TypeScript 7.0.2 rejects it before emitting JavaScript: `limite` was declared as a number, but the value written is text.

```ts
// fig01_04.ts
const limite: number = "30";

console.log(limite);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_04.ts
fig01_04.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

`TS2322` means that you tried to assign a value of one type to a place that requires another. It is not fixed by silencing the compiler or by converting everything to `any`. First decide what the intention was. If the limit represents seconds, the correct value may be `30` without quotes. If the data arrived as text from an environment variable, you will have to validate it and convert it at the boundary; that situation will be worked on in lesson 6.

There is another common diagnostic when starting an ESM project. If you write a relative import without an extension:

```ts
import { mensajeDeArranque } from "./arranque";
```

with `moduleResolution: "NodeNext"`, TypeScript 7.0.2 reports this message:

```bash
$ npx tsc
src/main.ts(1,35): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './arranque.js'?
```

`TS2835` does not ask you to convert the source file to JavaScript. It asks you to write the path Node will see after compiling: `./arranque.js`. TypeScript will relate that path to `arranque.ts` during compilation. The detail prevents `tsc` from accepting an import that Node would not know how to locate when running `dist/main.js`.

Two related errors express different problems. `TS2307` means that TypeScript cannot find the indicated module; for example, if `src/arranque.ts` does not exist:

```bash
$ npx tsc
src/main.ts(1,35): error TS2307: Cannot find module './arranque.js' or its corresponding type declarations.
```

`TS2305` is different: the file does exist, but it does not export the requested name. If `arranque.ts` does not export `mensajeDeArranque`, the import produces this diagnostic:

```bash
$ npx tsc
src/main.ts(1,10): error TS2305: Module '"./arranque.js"' has no exported member 'mensajeDeArranque'.
```

Before reinstalling packages, check the concrete things: that `src/arranque.ts` exists, that the path is relative to `src/main.ts`, that the name uses the same upper and lower case, and that the file really exports the symbol you are trying to import. Linux distinguishes `Arranque.ts` from `arranque.ts`; a project that seemed to work on another system may fail on arriving at Mint because of that difference.

Lastly, tell a compilation error apart from a command error. If you type `tsc` and the terminal answers `command not found`, it is not a TypeScript diagnostic: the shell did not find a global executable. Inside the project use `npx tsc --version` or `npm run compilar`. That way you invoke the local version declared in `package.json` without depending on a global installation.

## What gets done wrong

- **Installing TypeScript globally and assuming everyone will use the same version.** An `npm install --global typescript` can be fine for experimenting, but it does not define the `revisor`'s compiler. The local dependency and the lock file make the project reproducible. Use `npx tsc` or npm scripts to build it.

- **Believing that running `node src/main.ts` is equivalent to checking.** Node 24 can erase types and run a `.ts` with erasable syntax, but it does not run `tsc` and it does not find the `.js` imports that the project reserves for `dist/`. Use that mode only for an isolated script; in the `revisor`, compile to `dist/` and run `node dist/main.js`.

- **Mixing generated files with source files.** Leaving `.js`, `.map`, and `.ts` together can make you edit a generated output or run an old version. `src/` is the origin; `dist/` is the result. Delete and regenerate `dist/` if you suspect it is out of date; do not edit it by hand.

- **Turning off `strict` to “move forward”.** A permissive configuration does not remove uncertainty: it only lets it travel further. The cost is paid later, when a function accepts an ambiguous value and the error appears far from its cause. Fix the diagnostic or work out which value can be missing; do not hide the warning.

- **Writing relative ESM imports without `.js`.** TypeScript may find the source, but Node needs to resolve the emitted JavaScript. With `NodeNext`, the `.js` extension is part of the execution contract. Write it from the start and you will not have to fix every import when the project grows.

- **Using a breakpoint as proof that the code works.** The debugger shows one run, with some concrete data. A test must express which result you expect for several cases and be repeatable. Use the debugger to discover what happens, and tests, which will arrive in lesson 7, to keep a fix from being lost.

## Exercises

### Exercise 1 — Your measured environment

Install Node 24 LTS and create the `~/proyectos/revisor` folder. Initialize npm and install `typescript@7.0.2` and `@types/node@24` as development dependencies. Check `node --version`, `npm --version`, and `npx tsc --version`. Keep the `package-lock.json` and add `node_modules/` to `.gitignore`.

### Exercise 2 — The revisor's first startup

Create `tsconfig.json` with this lesson's strict configuration, including the `"types": ["node"]` option. Copy the program from figure 01.02 to `src/main.ts`, adjust the text so that it prints `revisor: entorno listo`, compile with `npm run compilar`, and run it with `npm run arrancar`. Confirm that the output is in `dist/`, not next to the source file.

### Exercise 3 — A module and a diagnostic

Separate the startup message into `src/arranque.ts` and make `src/main.ts` import it with the `.js` extension. Compile and run it. Then temporarily remove the extension from the import, run `npm run compilar`, copy the `TSxxxx` code that appears, and fix the import. Finally, put a breakpoint inside the exported function and verify that the debugger stops in the `.ts` file.

## Solutions

### Solution 1

From the project root, the three checks must identify Node 24, an npm version, and TypeScript 7.0.2. The exact minor version of Node may change within line 24 when you update LTS; what matters is not to be running Node 22, 23, or another different line.

```bash
node --version
npm --version
npx tsc --version
```

The `.gitignore` file must include, at the very least, this line:

```text
node_modules/
```

Do not include `package-lock.json` in `.gitignore`. It is part of the project's reproducible definition.

### Solution 2

The expected structure is this:

```text
revisor/
  package.json
  package-lock.json
  tsconfig.json
  src/
    main.ts
  dist/
    main.js
    main.js.map
```

The `compilerOptions` block of `tsconfig.json` must include `"types": ["node"]`, so that the project loads the `@types/node` declarations. After `npm run compilar`, `npm run arrancar` must run `dist/main.js`, not `src/main.ts`. If `dist/` does not appear, check that you ran `npm run compilar` or `npx tsc` without naming files. If you name a file in a folder with `tsconfig.json`, TypeScript 7 shows `TS5112`; to isolate it use `--ignoreConfig` and the options it needs.

### Solution 3

The correct import in `src/main.ts` carries `.js`, even though the file you wrote is called `arranque.ts`:

```ts
import { mensajeDeArranque } from "./arranque.js";
```

The expected diagnostic when omitting the extension is `TS2835`. When you restore it, `npm run compilar` must finish without error messages. If the debugger stops at `dist/arranque.js` instead of `src/arranque.ts`, confirm that `sourceMap` is still `true`, recompile, and start the debugging session again.

## How I know I got it

- [ ] `node --version` starts with `v24` and `npx tsc --version` prints `Version 7.0.2`.
- [ ] `package.json` declares `"type": "module"` and TypeScript is in `devDependencies`.
- [ ] `tsconfig.json` declares `"types": ["node"]` and `npm run verificar` finishes without diagnostics.
- [ ] `npm run compilar` creates `dist/main.js`.
- [ ] The following command prints exactly the indicated line:

```bash
$ node dist/main.js
revisor: entorno listo
```

- [ ] A relative import in the project uses `.js` and `npm run compilar` does not report `TS2835`.
- [ ] When you change a number to text in a variable declared as `number`, the compiler shows `TS2322`.
- [ ] A breakpoint in `src/arranque.ts` stops in the TypeScript code when running Node's output.

## Further reading

- [TypeScript: What is a `tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) — official documentation on the project root, the included files, and how the compiler invokes the configuration. Accessed on October 2, 2026.

- [TypeScript: TSConfig reference](https://www.typescriptlang.org/tsconfig/) — official reference for `strict`, `sourceMap`, `module`, `moduleResolution`, and the other compiler options. Accessed on October 2, 2026.

- [Node.js: Download and install](https://nodejs.org/en/download) — official page for choosing the LTS line and the installation method for Linux. Accessed on October 2, 2026.

- [Visual Studio Code: Transpiling TypeScript](https://code.visualstudio.com/docs/typescript/typescript-transpiling) — the editor's official documentation on compiling, configuring, and working with TypeScript. Accessed on October 2, 2026.
