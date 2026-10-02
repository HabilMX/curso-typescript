# Lección 1 — Instalar TypeScript en tu Linux Mint

**Tiempo:** 2 × 45 min

**Qué construyes:** el entorno y tu primer programa

**Qué aprendes:** Node LTS, gestor de paquetes, `tsc`, editor, `tsconfig` estricto, ejecutar y depurar

## Al terminar vas a poder

- Instalar y comprobar Node.js 24 LTS, npm y el compilador TypeScript en Linux Mint.
- Crear un proyecto ESM con `package.json`, una dependencia local de TypeScript y un archivo de bloqueo reproducible.
- Compilar un programa con `npx tsc --strict --target ES2022 --module nodenext` y ejecutar el JavaScript resultante con Node.
- Configurar un proyecto con `tsconfig.json` estricto, salida en `dist/` y mapas de código fuente.
- Distinguir ejecutar un `.ts` con el borrado de tipos de Node de verificarlo y compilarlo con `tsc`.
- Abrir el proyecto en un editor, detener la ejecución con un punto de interrupción y corregir un diagnóstico `TSxxxx`.

## El porqué antes del cómo

El `revisor` terminará siendo una aplicación con dos partes que deben coincidir: una API que consulta varios servicios y un panel web que presenta el reporte. Antes de llegar a esa complejidad hace falta resolver una pregunta menos vistosa, pero decisiva: ¿cómo convierte tu computadora el código que escribes en un programa que puede ejecutar?

JavaScript ya responde una parte de esa pregunta. Node ejecuta archivos `.js`; entiende la sintaxis de JavaScript, crea el proceso, carga módulos, da acceso a archivos y red, y termina el proceso cuando el trabajo acaba. Desde Node 22.18 también puede ejecutar ciertos archivos `.ts` borrando su sintaxis de tipos. TypeScript añade otra etapa distinta: `tsc` revisa el programa y produce JavaScript. No sustituye a Node ni se convierte en un sistema operativo distinto. Es la herramienta que encuentra contradicciones en tu código antes de que Node tenga la oportunidad de correrlo.

Esa separación importa desde el primer día. Imagina que, dentro de unas lecciones, el `revisor` recibe una lista de servicios y cada elemento necesita un nombre, una URL y una política de tiempo límite. Si confundes un número con texto, o llamas una propiedad que no existe, es mejor recibir una explicación al compilar que descubrirlo después de desplegar una API. El compilador no comprueba si una URL realmente responde, ni puede garantizar que un JSON externo tenga la forma esperada; esas fronteras se validarán más adelante. Pero sí puede revisar si el código que escribiste es consistente con las reglas que tú declaraste.

En Go, `go run` junta compilación y ejecución en un solo comando y puede dar la impresión de que ambas cosas son una misma operación. TypeScript hace más visible la frontera: `tsc` transforma y verifica; `node` ejecuta. Al principio parecen dos pasos de más. En la práctica son dos responsabilidades diferentes y conviene saber cuál falló. Si `tsc` reporta `TS2322`, todavía no existe un programa confiable que correr. Si `tsc` termina sin mensajes y Node falla, el problema está en el comportamiento de ejecución, una importación que no existe en disco, una variable de entorno o una respuesta externa.

La herramienta correcta también evita problemas que tardan en aparecer. Linux Mint 22.x hereda la base de Ubuntu 24.04 y sus paquetes privilegian estabilidad; LMDE, en cambio, se basa en Debian. Eso es razonable para componentes de sistema, pero un curso necesita una línea de Node y una versión de TypeScript explícitas. Aquí usarás Node 24 LTS y TypeScript 7.0.2. No necesitas memorizar una revisión menor de Node ni una versión particular de npm: comprueba que `node -v` empieza con `v24`, que npm responde, y que el compilador local imprime `Version 7.0.2`.

La primera decisión del curso es instalar TypeScript dentro del proyecto, no como una herramienta global de tu usuario. Una instalación global responde la pregunta “¿qué compilador tengo hoy en esta laptop?”. Una dependencia local responde una pregunta más útil: “¿con qué compilador se debe construir este proyecto, aquí y en otra computadora?”. `package.json` guarda esa decisión; `package-lock.json` registra las versiones resueltas. Así, cuando otra persona clone el `revisor`, no depende de lo que tenga instalado de casualidad.

También empezaremos con ESM, los módulos estándar de JavaScript. Esto evita adoptar una sintaxis de módulos antigua solo porque todavía aparece en ejemplos viejos. En el `revisor`, `package.json` declara `"type": "module"` y los imports relativos escriben la extensión que tendrá el archivo al ejecutar: `.js`, aunque el archivo fuente sea `.ts`. Parece raro la primera vez, pero es una consecuencia directa de que `tsc` emite JavaScript y Node lo carga desde `dist/`.

Finalmente, activar `strict` no es una ceremonia. Es elegir que el compilador señale incertidumbres desde que el proyecto es pequeño. Si empiezas relajado y endureces las reglas después de tener veinte archivos, los diagnósticos se amontonan y cuesta distinguir una decisión de diseño de una corrección mecánica. El `revisor` tendrá servicios que fallan, respuestas ausentes y datos externos; construirlo con verificación estricta desde la primera línea hace visibles esas posibilidades en lugar de esconderlas.

## Los conceptos

### Node.js, npm y la dependencia local

Node.js es el entorno que ejecutará el JavaScript del `revisor`. npm es el gestor de paquetes incluido con Node: descarga dependencias, conserva sus versiones y ofrece comandos definidos por el proyecto. TypeScript es una de esas dependencias de desarrollo: hace falta para convertir el código fuente, pero no para ejecutar el JavaScript ya compilado.

Primero instala Node 24 LTS. `nvm` es un administrador de versiones de Node: permite instalar y seleccionar líneas de Node sin usar el paquete del sistema. La documentación oficial de `nvm` publica este instalador para su versión 0.40.8:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Abre una terminal nueva después de instalarlo. Si tu terminal usa `bash` y aún no encuentra el comando, carga su configuración con `source ~/.bashrc`; el instalador modifica el archivo de inicio adecuado entre `.bashrc`, `.bash_profile`, `.zshrc` y `.profile`. Ahora instala y selecciona la línea 24:

```bash
nvm install 24
nvm alias default 24
nvm use 24
nvm --version
node -v
npm -v
```

`nvm --version` y `npm -v` deben imprimir una versión. `node -v` debe empezar con `v24`; `nvm install 24` puede elegir una revisión menor más reciente dentro de esa línea LTS. Si `nvm` dice que no existe, abre una terminal nueva o carga el archivo de inicio que indicó el instalador. Antes de buscar soluciones al azar, ejecuta `echo "$SHELL"` para saber si usas `bash`, `zsh` u otro shell; un cambio puesto en `.bashrc` no se carga automáticamente en una sesión `zsh`. En Linux Mint, si aún no tienes `curl`, instálalo con `sudo apt install curl` y repite el comando del instalador.

Crea ahora una carpeta para el proyecto. El nombre no tiene significado técnico especial todavía: será la raíz del `revisor`, donde vivirán `package.json`, `tsconfig.json`, el código fuente y la salida compilada.

```bash
mkdir -p ~/proyectos/revisor/src
cd ~/proyectos/revisor
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

`npm init -y` crea un `package.json` básico. `npm install --save-dev` agrega las herramientas necesarias para desarrollar, escribe sus versiones en `package.json` y genera `package-lock.json`. `--save-exact` evita que npm escriba el prefijo `^`: el proyecto conserva exactamente TypeScript 7.0.2 y la revisión de `@types/node` que resolvió dentro de la línea 24. La bandera `--save-dev` expresa que TypeScript y las declaraciones de Node son necesarias para construir y revisar el proyecto, no para ejecutar el resultado final en producción.

Ajusta el archivo `package.json` para declarar ESM y dar nombres útiles a los comandos del proyecto:

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

`"private": true` evita una publicación accidental en el registro público de npm. `"type": "module"` hace que Node interprete los archivos `.js` del proyecto como módulos ESM. Los comandos bajo `"scripts"` se ejecutan con `npm run compilar`, `npm run verificar` y `npm run arrancar`; npm encuentra de manera automática los ejecutables instalados en `node_modules/.bin/`, así que no debes agregar esa carpeta al `PATH`. La revisión exacta de `@types/node` puede ser otra de la línea 24 si instalas el curso más adelante; conserva la que escribió tu instalación con `--save-exact`.

Como ejemplo mínimo, este programa sólo confirma que tienes el compilador y Node coordinados. La primera línea identifica el archivo de figura; no es parte de la sintaxis necesaria para tu proyecto.

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

Dentro del `revisor`, la misma idea aparece en una escala mayor. La dependencia local permite que `npm run compilar` use el compilador acordado por el proyecto, no una versión global que alguien instaló hace meses. Conserva `package-lock.json` en Git junto con `package.json`: el primero no es basura generada, sino el registro preciso de qué paquetes resolvió npm. En cambio, `node_modules/` sí se excluye con `.gitignore`, porque se puede reconstruir con `npm install` a partir de esos dos archivos.

Una confusión frecuente es pensar que `npx tsc` instala TypeScript globalmente. No es así cuando el paquete ya está en el proyecto: `npx` encuentra primero el ejecutable local. Puedes comprobar qué versión está asociada al proyecto con este comando:

```bash
npx tsc --version
```

Debe responder `Version 7.0.2`. Si responde otra versión, no continúes como si nada. Revisa que estés dentro de `~/proyectos/revisor`, que `node_modules/` exista y que `package.json` tenga la dependencia correcta. El nombre de la herramienta, `tsc`, se conserva aunque su implementación actual sea nativa; no tienes que cambiar los comandos del curso por eso.

Las figuras del curso también necesitan su propio contexto ESM y su compilador local. Crea una carpeta hermana del proyecto para experimentar sin mezclar los JavaScript generados con `src/`:

```bash
mkdir -p ~/proyectos/figuras
cd ~/proyectos/figuras
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

Abre su `package.json` y añade `"type": "module"` (y `"private": true`) junto a lo que npm escribió, sin borrar `devDependencies`: si las pierdes, TypeScript deja de estar instalado. El número de `@types/node` puede ser otro de la línea 24. No pongas un `tsconfig.json` en esta carpeta: las figuras de un archivo usan sus opciones explícitas con `npx tsc`. Cuando alguna use `await` en el nivel superior, ese `package.json` ESM evita `TS1309`. `npx tsc` busca primero el ejecutable local de `~/proyectos/figuras/node_modules/.bin/`; no instala TypeScript globalmente.

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

### Compilar, emitir y ejecutar

Node 24 puede ejecutar un `.ts` directamente mediante *type stripping*, el borrado de sintaxis de tipos antes de ejecutar JavaScript. Esta capacidad está disponible sin bandera desde Node 22.18 y es estable desde Node 24.12. No es una compilación: Node reemplaza los tipos por espacios y no hace comprobación de tipos. Por eso `node src/main.ts` puede ser útil para un guion de un solo archivo, pero no demuestra que el programa sea correcto; `tsc` es el que verifica y emite la salida que ejecutará el `revisor`.

El borrado de tipos sólo acepta sintaxis borrable. Node no admite `.tsx`, ni construcciones que generan JavaScript como `enum`, `namespace` con valores o propiedades de parámetro en constructores, salvo que actives el experimental `--experimental-transform-types`. Tampoco lee `tsconfig.json`, `paths` ni archivos `.ts` dentro de `node_modules`. Si importas sólo un tipo, escríbelo con `import type` para que coincida con lo que Node puede borrar. `erasableSyntaxOnly` es una opción de TypeScript que avisa sobre construcciones que Node no puede borrar.

Los imports revelan por qué el flujo del curso compila proyectos antes de arrancarlos. Al ejecutar `.ts` directamente, Node exige la extensión fuente literal: `import "./arranque.ts"` funciona; `import "./arranque.js"` busca precisamente un archivo `.js` junto al fuente y falla si sólo existe `arranque.ts`. El `revisor` usa `.js` en sus imports porque ésa será la ruta de los archivos emitidos en `dist/`. Por tanto, usa `node archivo.ts` sólo para un experimento de un archivo y usa `npm run compilar` seguido de `npm run arrancar` para el proyecto de varios archivos.

`tsc` lee el programa, lo verifica y emite `.js`. Esta transformación recibe a veces el nombre de transpilación porque el origen y el resultado son lenguajes cercanos, pero para tu flujo diario basta recordar dos verbos: verificar y compilar con `tsc`; ejecutar la salida con `node`.

Observa este programa. La anotación `: string` sirve para que TypeScript revise el valor de `estado`; no está destinada a llegar a Node. Los tipos se estudiarán a fondo en la siguiente lección. Por ahora, úsala como evidencia de que el compilador revisa una capa que no forma parte del programa ejecutable.

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

Después de compilar, abre `fig01_02.js`. Verás que contiene `const estado = "entorno listo";`, sin `: string`. TypeScript borra las anotaciones de tipos al emitir JavaScript. Es una diferencia importante frente a Go: Go compila a un binario que lleva instrucciones de máquina; TypeScript emite JavaScript y requiere que Node, un navegador u otro entorno JavaScript ejecute ese resultado.

Eso también establece un límite claro. Si alguien cambia el archivo JavaScript emitido, o si un cliente manda un JSON con datos falsos, las anotaciones TypeScript no aparecerán durante la ejecución para detenerlo. Los tipos protegen el código que compilas; no validan por sí solos lo que llega de la red. En la lección sobre datos externos, el `revisor` validará explícitamente sus fronteras antes de convertir información desconocida en valores confiables.

No ejecutes los archivos que TypeScript deja junto al fuente en un proyecto real. En las figuras es útil porque reduce pasos, pero mezclar `.ts` y `.js` en `src/` termina confundiendo qué archivo se debe editar y cuál se debe publicar. El `revisor` separará las fuentes de la salida: `src/` contendrá lo que escribes; `dist/` contendrá lo que produce `tsc`.

Dentro del proyecto, el programa de arranque inicial puede ser deliberadamente pequeño. No declares aún `Servicio` ni `Estado`: esos nombres tendrán un modelo preciso en la lección 3. En esta etapa el avance correcto es contar con un proyecto que construye de forma repetible, no adelantar tipos que todavía no tienen reglas claras.

La relación entre los comandos del proyecto será siempre la misma:

```bash
npm run compilar
npm run arrancar
```

El primero verifica el proyecto y produce los archivos bajo `dist/`. El segundo ejecuta exactamente la salida construida. Si editas `src/main.ts` y olvidas volver a compilar, `npm run arrancar` ejecutará la versión anterior de `dist/main.js`. Esa separación parece incómoda hasta que depuras una falla: sabes si estás viendo el código actual o un artefacto viejo.

### `tsconfig.json` y el modo estricto

Escribir todas las opciones de compilación en cada comando funciona para una figura, pero no para un proyecto. `tsconfig.json` es el contrato de compilación: identifica los archivos fuente, define la salida y conserva decisiones que deben ser iguales para cada integrante del proyecto y para la integración continua.

Crea este `tsconfig.json` en la raíz de `revisor/`:

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

`target` declara la versión de JavaScript que emitirá TypeScript. `ES2022` es apropiado para Node 24: no obliga al compilador a transformar características modernas a equivalentes más largos. `module` y `moduleResolution` con `NodeNext` hacen que TypeScript siga las reglas de módulos que Node aplica a un proyecto moderno. La pareja importa: elegir una resolución distinta puede permitir imports que luego Node no podrá resolver.

`rootDir` y `outDir` hacen visible el límite entre lo que escribes y lo que se genera. El punto de entrada fijo del curso, `src/main.ts`, termina como `dist/main.js`; una carpeta `src/reporte/tabla.ts` termina como `dist/reporte/tabla.js`. Esta correspondencia hará más adelante que el backend pueda publicar un directorio limpio, sin fuentes ni dependencias de desarrollo mezcladas.

`strict: true` activa una familia de revisiones, entre ellas `strictNullChecks`, `noImplicitAny` y revisiones de inicialización y funciones. Desde TypeScript 6 el valor predeterminado ya es `true`; escribirlo hace explícita una decisión que quien lo apague deberá cambiar a propósito. No significa “TypeScript se vuelve molesto”; significa que el compilador deja de suponer que todo valor existe, que toda variable tiene una forma obvia o que un dato ambiguo es seguro. Puedes activar opciones aún más exigentes en el futuro, pero `strict` es el punto de partida no negociable del curso.

`types: ["node"]` le indica a TypeScript que cargue las declaraciones de tipos de Node instaladas mediante `@types/node`, incluidas las de módulos como `node:fs/promises`. Desde TypeScript 6, la opción `types` ya no carga por defecto todos los paquetes `@types` instalados, por lo que declararla es necesaria aunque `@types/node` esté en `devDependencies`: sin ella, un import de Node puede fallar con `TS2591`.

`noEmitOnError` impide dejar un JavaScript nuevo cuando el proyecto tiene errores. Sin esa opción, es posible que TypeScript encuentre una contradicción y aun así emita archivos; después ejecutas un `dist/` parcialmente actualizado y diagnosticas el problema equivocado. En un proyecto de servicios, producir una salida conocida y completa es preferible a producir una salida dudosa.

`sourceMap: true` crea mapas que relacionan cada archivo JavaScript emitido con su fuente TypeScript. No cambian el comportamiento de producción por sí mismos. Su utilidad se nota al depurar: el editor puede detenerse en la línea `.ts` que escribiste, en lugar de enviarte a una línea de JavaScript emitido que no contiene las anotaciones originales.

Dentro del `revisor`, el primer `src/main.ts` puede reutilizar el patrón de la figura anterior. Cópialo a `src/main.ts`, corre `npm run compilar` y verifica que aparezca `dist/main.js` junto con `dist/main.js.map`. Desde ese momento, no necesitas repetir banderas largas: `npm run compilar` toma sus decisiones de `tsconfig.json`.

Hay un matiz que evita muchas confusiones: con TypeScript 7.0.2, si ejecutas `npx tsc src/main.ts` en una carpeta que contiene `tsconfig.json`, el compilador no lo ignora: se detiene con `TS5112` y te pide elegir. Para compilar un archivo aislado usa `npx tsc --ignoreConfig src/main.ts` y proporciona las banderas que necesites; para compilar el proyecto según su configuración usa `npx tsc` sin archivos, o `npx tsc --project tsconfig.json`. En este curso, `npm run compilar` equivale al segundo caso porque el script sólo contiene `tsc`.

Este proyecto mínimo muestra ambas decisiones. El primer comando falla porque se nombró un archivo mientras existe `tsconfig.json`; el segundo lee la configuración completa y el tercero ejecuta el JavaScript emitido.

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

### Módulos ESM y extensiones `.js`

Un módulo permite repartir el programa en archivos que exportan valores y archivos que los importan. El `revisor` necesitará esa separación: el modelo compartido, la lógica que consulta servicios, el servidor y el panel no deben vivir en un archivo interminable. ESM es el sistema de módulos estándar de JavaScript y es el que usaremos desde ahora.

La primera sorpresa es que un archivo TypeScript importa la extensión `.js`. No es un error tipográfico. TypeScript ve `./arranque.js`, entiende que la fuente correspondiente es `arranque.ts`, y emite un `import "./arranque.js"` que Node puede resolver al ejecutar dentro de `dist/`.

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

El ejemplo tiene dos archivos a propósito. `arranque.ts` ofrece una función con `export`; el archivo principal la recibe mediante `import`. En un proyecto ESM, no escribas `require`, no omitas la extensión en imports relativos y no cambies `.js` por `.ts` sólo porque estás leyendo el fuente. Esas tres decisiones mezclan reglas de épocas distintas y suelen producir errores que parecen problemas del compilador cuando en realidad son reglas de carga de Node.

Dentro del `revisor`, este patrón permitirá una frontera clara. Más adelante `src/modelo/servicio.ts` exportará el vocabulario compartido; `src/revisar/` usará ese vocabulario para consultar; y el panel importará los mismos contratos compilados o publicados desde un paquete compartido. Hoy basta con practicar la mecánica: un archivo exporta, otro importa, y Node ejecuta la salida `.js`.

No uses rutas absolutas del disco como imports ni aliases inventados desde la primera lección. Un alias como `@/modelo` puede ser cómodo en un editor, pero exige configurar a la vez TypeScript, Node, pruebas y el empaquetador web. Los imports relativos explícitos son menos espectaculares y más transparentes mientras aprendes qué archivo depende de cuál.

### Editor, diagnóstico y depuración

Puedes escribir TypeScript con cualquier editor de texto, pero un editor con soporte del lenguaje reduce el tiempo entre cometer un error y entenderlo. Visual Studio Code reconoce `tsconfig.json`, muestra diagnósticos de TypeScript, permite ir a una definición y depura Node. Abre la carpeta completa del proyecto, no sólo `src/main.ts`, para que el editor detecte `package.json`, `tsconfig.json` y la estructura de módulos.

En Linux Mint 22.x puedes descargar el paquete `.deb` para Debian/Ubuntu desde la [página de descarga de VS Code](https://code.visualstudio.com/Download) y, desde la carpeta donde lo guardaste, instalarlo así. El paquete ofrece configurar el repositorio de Microsoft para recibir actualizaciones automáticas:

```bash
sudo apt install ./<archivo>.deb
code --version
```

También puedes configurar ese repositorio manualmente. La lista de arquitecturas es la que publica Microsoft: `amd64`, `arm64` y `armhf`.

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

Estos son procedimientos de instalación del sistema: léelos y ejecútalos en tu Mint, no dentro del proyecto. Para LMDE usa el paquete `.deb` descargado; no asumas que sus fuentes de paquetes son las de Ubuntu.

```bash
cd ~/proyectos/revisor
code .
```

La terminal no necesita que el comando `code` exista para que TypeScript funcione. Si tu instalación de Visual Studio Code no lo agregó al `PATH`, abre la aplicación desde el menú y usa “Abrir carpeta” para seleccionar `~/proyectos/revisor`. Lo importante es abrir la raíz del proyecto, porque ahí está el archivo de configuración que define cómo se revisan los archivos fuente.

Configura la depuración para que primero compile con el script del proyecto. Crea la carpeta `.vscode/` y guarda estos dos archivos JSON válidos. Una tarea es una instrucción que VS Code puede ejecutar antes de iniciar el depurador.

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

Guárdalo como `.vscode/tasks.json`. Ahora crea `.vscode/launch.json`:

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

`preLaunchTask` relaciona ambas configuraciones: antes de ejecutar Node, VS Code corre `npm run compilar`; no usa una tarea de TypeScript instalada por el editor que podría apuntar a otra versión. `outFiles` indica dónde están los JavaScript y los mapas que corresponden al TypeScript fuente.

Compila antes de depurar si quieres comprobar el resultado por separado:

```bash
npm run compilar
```

Después abre `src/main.ts`, haz clic a la izquierda del número de una línea con `console.log` para poner un punto rojo y presiona `F5`. Elige la configuración «Depurar revisor». Gracias a `sourceMap: true`, el depurador debe detenerse en la línea TypeScript original. Desde ahí puedes inspeccionar variables, avanzar una línea, entrar a una función o continuar.

Como alternativa rápida, abre la paleta de comandos, elige «Debug: Create JavaScript Debug Terminal» y corre `node dist/main.js` dentro de esa terminal. Ese modo depura cualquier proceso de Node que inicies ahí; con los mapas de fuente activos, los puntos de interrupción se ponen en los `.ts`. El `launch.json` es mejor cuando quieres repetir el mismo arranque con `F5`; la terminal de depuración sirve para explorar un comando puntual.

Un punto de interrupción no arregla el programa ni reemplaza una prueba. Sirve para observar el estado real justo antes de una operación. Más adelante será útil para detener el `revisor` antes de interpretar una respuesta HTTP y comparar lo que suponías que llegó con el valor que realmente llegó. Si un valor puede ser `undefined`, no asumas que el depurador prueba que siempre será así sólo porque en una corrida concreta tuvo un valor; úsalo para formular una explicación y luego escribe una validación o prueba reproducible.

La consola del editor y la terminal cumplen papeles distintos. Los diagnósticos `TSxxxx` te dicen que el programa contradice sus tipos antes de ejecutar. La consola de depuración enseña qué ocurrió en una ejecución particular. Los dos son valiosos, pero responden preguntas diferentes. Empezar por el diagnóstico del compilador suele ahorrar tiempo: no tiene sentido perseguir en el depurador una rama de un programa que TypeScript ya sabe que no puede construirse correctamente.

## El error que vas a ver

El siguiente programa tiene un error intencional. TypeScript 7.0.2 lo rechaza antes de emitir JavaScript: `limite` fue declarado como número, pero el valor escrito es texto.

```ts
// fig01_04.ts
const limite: number = "30";

console.log(limite);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_04.ts
fig01_04.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

`TS2322` significa que intentaste asignar un valor de un tipo a un lugar que exige otro. No se arregla silenciando el compilador ni convirtiendo todo a `any`. Primero decide cuál era la intención. Si el límite representa segundos, el valor correcto puede ser `30` sin comillas. Si el dato llegó como texto desde una variable de entorno, tendrás que validarlo y convertirlo en la frontera; esa situación se trabajará en la lección 6.

Hay otro diagnóstico común al iniciar un proyecto ESM. Si escribes un import relativo sin extensión:

```ts
import { mensajeDeArranque } from "./arranque";
```

con `moduleResolution: "NodeNext"`, TypeScript 7.0.2 reporta este mensaje:

```bash
$ npx tsc
src/main.ts(1,35): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './arranque.js'?
```

`TS2835` no pide que conviertas el archivo fuente a JavaScript. Pide que escribas la ruta que Node verá después de compilar: `./arranque.js`. TypeScript relacionará esa ruta con `arranque.ts` durante la compilación. El detalle evita que `tsc` acepte un import que Node no sabría localizar al ejecutar `dist/main.js`.

Dos errores cercanos expresan problemas distintos. `TS2307` significa que TypeScript no encuentra el módulo indicado; por ejemplo, si no existe `src/arranque.ts`:

```bash
$ npx tsc
src/main.ts(1,35): error TS2307: Cannot find module './arranque.js' or its corresponding type declarations.
```

`TS2305` es diferente: el archivo sí existe, pero no exporta el nombre solicitado. Si `arranque.ts` no exporta `mensajeDeArranque`, el import produce este diagnóstico:

```bash
$ npx tsc
src/main.ts(1,10): error TS2305: Module '"./arranque.js"' has no exported member 'mensajeDeArranque'.
```

Antes de reinstalar paquetes, verifica lo concreto: que exista `src/arranque.ts`, que la ruta sea relativa a `src/main.ts`, que el nombre use las mismas mayúsculas y minúsculas, y que el archivo realmente exporte el símbolo que intentas importar. Linux distingue `Arranque.ts` de `arranque.ts`; un proyecto que parecía funcionar en otro sistema puede fallar al llegar a Mint por esa diferencia.

Por último, distingue un error de compilación de uno de comandos. Si escribes `tsc` y la terminal responde `command not found`, no es un diagnóstico de TypeScript: el shell no encontró un ejecutable global. Dentro del proyecto usa `npx tsc --version` o `npm run compilar`. Así invocas la versión local declarada en `package.json` sin depender de una instalación global.

## Lo que se hace mal

- **Instalar TypeScript globalmente y asumir que todos usarán la misma versión.** Un `npm install --global typescript` puede servir para experimentar, pero no define el compilador del `revisor`. La dependencia local y el archivo de bloqueo hacen que el proyecto sea reproducible. Usa `npx tsc` o scripts de npm para construirlo.

- **Creer que ejecutar `node src/main.ts` equivale a verificar.** Node 24 puede borrar tipos y ejecutar un `.ts` de sintaxis borrable, pero no ejecuta `tsc` ni encuentra los imports `.js` que el proyecto reserva para `dist/`. Usa ese modo sólo para un guion aislado; en el `revisor`, compila a `dist/` y ejecuta `node dist/main.js`.

- **Mezclar archivos generados con archivos fuente.** Dejar `.js`, `.map` y `.ts` juntos puede hacer que edites una salida generada o ejecutes una versión vieja. `src/` es el origen; `dist/` es el resultado. Borra y vuelve a generar `dist/` si sospechas que está desactualizado, no lo edites a mano.

- **Desactivar `strict` para “avanzar”.** Una configuración permisiva no elimina incertidumbre: sólo deja que llegue más lejos. El costo se paga después, cuando una función acepta un valor ambiguo y el error aparece lejos de su causa. Corrige el diagnóstico o entiende qué valor puede faltar; no escondas la advertencia.

- **Escribir imports ESM relativos sin `.js`.** TypeScript puede encontrar el fuente, pero Node necesita resolver el JavaScript emitido. Con `NodeNext`, la extensión `.js` es parte del contrato de ejecución. Escríbela desde el inicio y no tendrás que corregir todos los imports cuando el proyecto crezca.

- **Usar un punto de interrupción como prueba de que el código funciona.** El depurador muestra una corrida, con unos datos concretos. Una prueba debe expresar qué resultado esperas para varios casos y poder repetirse. Usa el depurador para descubrir qué sucede y las pruebas, que llegarán en la lección 7, para impedir que una corrección se pierda.

## Ejercicios

### Ejercicio 1 — Tu entorno medido

Instala Node 24 LTS y crea la carpeta `~/proyectos/revisor`. Inicializa npm, instala `typescript@7.0.2` y `@types/node@24` como dependencias de desarrollo. Comprueba `node --version`, `npm --version` y `npx tsc --version`. Guarda el `package-lock.json` y agrega `node_modules/` a `.gitignore`.

### Ejercicio 2 — El primer arranque del revisor

Crea `tsconfig.json` con la configuración estricta de esta lección, incluida la opción `"types": ["node"]`. Copia el programa de la figura 01.02 a `src/main.ts`, ajusta el texto para que imprima `revisor: entorno listo`, compila con `npm run compilar` y ejecútalo con `npm run arrancar`. Confirma que la salida está en `dist/`, no junto al archivo fuente.

### Ejercicio 3 — Un módulo y un diagnóstico

Separa el mensaje de arranque en `src/arranque.ts` y haz que `src/main.ts` lo importe con la extensión `.js`. Compila y ejecútalo. Después quita temporalmente la extensión del import, corre `npm run compilar`, copia el código `TSxxxx` que aparece y corrige el import. Por último, pon un punto de interrupción dentro de la función exportada y verifica que el depurador se detiene en el archivo `.ts`.

## Soluciones

### Solución 1

Desde la raíz del proyecto, las tres comprobaciones deben identificar Node 24, una versión de npm y TypeScript 7.0.2. La versión exacta menor de Node puede cambiar dentro de la línea 24 cuando actualices LTS; lo importante es no estar ejecutando Node 22, 23 u otra línea distinta.

```bash
node --version
npm --version
npx tsc --version
```

El archivo `.gitignore` debe incluir, como mínimo, esta línea:

```text
node_modules/
```

No incluyas `package-lock.json` en `.gitignore`. Es parte de la definición reproducible del proyecto.

### Solución 2

La estructura esperada es ésta:

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

El bloque `compilerOptions` de `tsconfig.json` debe incluir `"types": ["node"]`, para que el proyecto cargue las declaraciones de `@types/node`. Después de `npm run compilar`, `npm run arrancar` debe ejecutar `dist/main.js`, no `src/main.ts`. Si no aparece `dist/`, revisa que corriste `npm run compilar` o `npx tsc` sin nombrar archivos. Si nombras un archivo en una carpeta con `tsconfig.json`, TypeScript 7 muestra `TS5112`; para aislarlo usa `--ignoreConfig` y las opciones que necesite.

### Solución 3

El import correcto en `src/main.ts` lleva `.js`, aunque el archivo que escribiste se llame `arranque.ts`:

```ts
import { mensajeDeArranque } from "./arranque.js";
```

El diagnóstico esperado al omitir la extensión es `TS2835`. Al restaurarla, `npm run compilar` debe terminar sin mensajes de error. Si el depurador se detiene en `dist/arranque.js` en vez de `src/arranque.ts`, confirma que `sourceMap` sigue en `true`, recompila y vuelve a iniciar la sesión de depuración.

## Cómo sé que lo logré

- [ ] `node --version` empieza con `v24` y `npx tsc --version` imprime `Version 7.0.2`.
- [ ] `package.json` declara `"type": "module"` y TypeScript está en `devDependencies`.
- [ ] `tsconfig.json` declara `"types": ["node"]` y `npm run verificar` termina sin diagnósticos.
- [ ] `npm run compilar` crea `dist/main.js`.
- [ ] El siguiente comando imprime exactamente la línea indicada:

```bash
$ node dist/main.js
revisor: entorno listo
```

- [ ] Un import relativo del proyecto usa `.js` y `npm run compilar` no reporta `TS2835`.
- [ ] Al cambiar un número por texto en una variable declarada como `number`, el compilador muestra `TS2322`.
- [ ] Un punto de interrupción en `src/arranque.ts` se detiene en el código TypeScript al ejecutar la salida de Node.

## Para leer más

- [TypeScript: qué es un `tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) — documentación oficial sobre la raíz del proyecto, los archivos incluidos y cómo invoca el compilador la configuración. Consultado el 2 de octubre de 2026.

- [TypeScript: referencia de opciones de TSConfig](https://www.typescriptlang.org/tsconfig/) — referencia oficial de `strict`, `sourceMap`, `module`, `moduleResolution` y las demás opciones del compilador. Consultado el 2 de octubre de 2026.

- [Node.js: descarga e instalación](https://nodejs.org/en/download) — página oficial para elegir la línea LTS y el método de instalación para Linux. Consultado el 2 de octubre de 2026.

- [Visual Studio Code: transpilar TypeScript](https://code.visualstudio.com/docs/typescript/typescript-transpiling) — documentación oficial del editor sobre compilación, configuración y trabajo con TypeScript. Consultado el 2 de octubre de 2026.
