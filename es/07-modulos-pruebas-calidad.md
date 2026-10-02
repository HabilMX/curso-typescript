# Lección 7 — Módulos, pruebas y calidad

**Tiempo:** 2 × 45 min

**Qué construyes:** el proyecto de verdad, con pruebas

**Qué aprendes:** módulos ESM, organización por responsabilidad, pruebas con tabla de casos, lint y formato

## Al terminar vas a poder

- Separar el `revisor` en módulos ESM con responsabilidades nombradas y dependencias explícitas.
- Importar valores y tipos desde archivos relativos usando extensiones `.js` compatibles con Node.
- Escribir una prueba con una tabla de casos que compruebe resultados disponibles y fallas.
- Interpretar un error TS2305 de una exportación o importación que no coincide.
- Configurar comandos distintos para compilar, probar, revisar estilo y formatear un proyecto.
- Decidir qué código debe ser puro y fácil de probar, y qué código pertenece a las fronteras de archivos, red o consola.

## El porqué antes del cómo

Hasta la lección anterior, el `revisor` ya puede hacer trabajo útil. Tiene un modelo `Servicio`, representa cada desenlace con una unión discriminada `Estado`, consulta varios destinos de forma concurrente y valida la configuración antes de usarla. Sin embargo, los ejemplos todavía caben en pocos archivos. Eso ayuda a estudiar una idea aislada, pero no es suficiente para sostener un programa que seguirá creciendo con una API HTTP en la lección 8 y una pantalla en la lección 9.

Un archivo grande tiene una ventaja inicial: todo está a la vista. También tiene un costo que aumenta rápido. Para encontrar cómo se presenta un estado, recorres código de configuración, validación, temporizadores y consultas. Para probar una regla de texto, terminas importando o ejecutando piezas que no tienen relación con ese texto. Para cambiar un detalle de la respuesta HTTP, puedes tocar sin querer una regla que el panel necesita conservar. El problema no es que un archivo largo sea moralmente malo; es que deja de comunicar dónde vive cada decisión.

Los módulos resuelven esa falta de límites. Un módulo es un archivo que declara qué valores ofrece con `export` y qué necesita de otros módulos con `import`. Esa frontera no es un comentario ni una sugerencia para quien mantenga el código: TypeScript verifica que los nombres importados existan, y Node resuelve los archivos que se cargarán durante la ejecución. Cuando `reporte.ts` exporta `lineaReporte`, anuncia una capacidad concreta. Cuando `revisor.ts` importa `Servicio` y `Estado`, deja visible qué conceptos necesita para coordinar una revisión.

En JavaScript, los módulos ESM también son una solución a un problema histórico. Antes era frecuente cargar varios archivos mediante etiquetas `<script>` y depender del orden de carga global. Un archivo podía asumir que otro ya había creado una variable global, aunque nada en su código mostrara esa relación. Si el orden cambiaba, el error aparecía al ejecutar. ESM reemplaza ese acuerdo implícito por una relación declarada: el archivo que necesita algo lo importa con una ruta concreta. Node puede construir el grafo de dependencias antes de arrancar el programa.

El `revisor` necesita una organización que crezca sin crear cajones de sastre. No conviene poner todas las interfaces en una carpeta llamada `types`, todas las funciones en `utils` y todo lo demás en `helpers`. Esos nombres describen la forma técnica del código, no la responsabilidad del dominio. Con el tiempo, `utils` se vuelve el lugar donde termina cualquier función que nadie quiso nombrar. Encontrar algo exige recordar dónde se escondió, no entender qué hace.

Una estructura inicial más útil puede verse así:

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

`modelo.ts` describe `Servicio`, `EstadoDisponible`, `EstadoFalla` y `Estado`: no lee archivos, no abre conexiones y no imprime. `configuracion.ts` recibe datos externos y los valida, como aprendiste en la lección 6. `revisar.ts` coordina las consultas concurrentes y convierte sus desenlaces en estados. `reporte.ts` transforma estados confiables en texto o, más adelante, en datos para la API y el panel. `main.ts` conecta las piezas al arrancar el programa. La prueba vive junto al código que protege, en `src/reporte.test.ts`; al compilar termina como `dist/reporte.test.js` y Node la descubre ahí.

La meta no es tener muchas carpetas. Separar cada función pequeña en un archivo también puede ocultar la relación entre piezas que deberían leerse juntas. La pregunta útil es: “¿este archivo responde una pregunta clara del programa?”. Si la respuesta de `reporte.ts` es “cómo representamos lo que ocurrió”, hay una responsabilidad. Si una carpeta se llama `misc`, `common` o `helpers`, probablemente no hay una pregunta clara todavía.

Esta organización tiene una consecuencia importante para las pruebas. Una función que recibe un `Estado` y devuelve una cadena no necesita red, archivos, reloj ni variables de entorno. Con los mismos datos, devuelve el mismo resultado. Esa clase de función es barata de probar con una tabla de casos. En cambio, una función que lee `process.env`, llama `fetch`, mide tiempo y escribe en consola mezcla varias fronteras. Puede necesitar pruebas de integración, pero no debe impedir que las reglas centrales se prueben por separado.

Go hace una separación comparable mediante paquetes. Una diferencia útil es que Go compila paquetes y decide qué nombres son públicos por mayúsculas, mientras que TypeScript y JavaScript usan explícitamente `export` e `import`. En ambos casos, la idea de fondo es la misma: una dependencia debe ser visible y limitada. No se trata de dividir archivos por deporte; se trata de poder cambiar una parte sin tener que comprender ni arriesgar todo el programa.

Las pruebas son la segunda mitad de ese acuerdo. El compilador responde si el programa respeta los tipos: por ejemplo, que `lineaReporte` reciba un `Estado` y no una cadena. No responde si la regla de presentación es la que necesitabas. Una función puede compilar y, aun así, imprimir `HTTP undefined`, omitir una falla o clasificar el código 500 como disponible. Una prueba construye una entrada conocida, ejecuta una regla y compara el resultado con una expectativa explícita.

La calidad tampoco se reduce a las pruebas. Un formateador hace que las decisiones visuales sean consistentes: sangría, espacios, comillas y saltos de línea dejan de ser una discusión repetida en cada cambio. Un linter busca patrones que compilan pero suelen esconder errores o ambigüedades: una variable declarada y nunca usada, una promesa olvidada, una condición difícil de leer o una conversión riesgosa. Cada herramienta responde una pregunta diferente. `tsc` pregunta si el programa cumple sus contratos estáticos; las pruebas preguntan si casos conocidos producen los resultados esperados; el linter busca señales de código problemático; el formateador mantiene una presentación predecible.

No debes esperar a tener cientos de archivos para incorporar estas prácticas. Justamente cuando el proyecto es pequeño resulta más fácil elegir nombres claros, probar una regla importante y automatizar revisiones mecánicas. Después, cuando el `revisor` tenga servidor y pantalla, esas decisiones ya estarán funcionando como una red de seguridad en vez de convertirse en una limpieza enorme y riesgosa.

## Los conceptos

### Módulos ESM: archivos con contratos explícitos

En un proyecto con `"type": "module"` en `package.json`, Node interpreta los archivos `.js` emitidos como módulos ECMAScript, también llamados ESM. TypeScript puede analizar archivos `.ts` que siguen esas reglas y emitir JavaScript compatible. La opción `--module nodenext` le indica al compilador que debe respetar la resolución moderna de Node, incluida una regla que suele sorprender al principio: las importaciones relativas deben escribir la extensión del archivo que ejecutará Node.

Por eso un archivo TypeScript escribe `import { lineaReporte } from "./reporte.js"` aunque el archivo fuente se llama `reporte.ts`. TypeScript entiende que, después de compilar, Node cargará `reporte.js`. Escribir `./reporte` deja una ambigüedad que ESM no resuelve como lo hacía CommonJS, el sistema de módulos anterior de Node que resolvía rutas y exportaciones con reglas distintas.

Node 24 LTS también puede ejecutar un archivo `.ts` directamente mediante *type stripping*: reemplaza la sintaxis de tipos por espacios y ejecuta el JavaScript resultante. No es una compilación ni una revisión de tipos; `node archivo.ts` no lee `tsconfig.json` ni aplica `strict`. Además, sólo acepta sintaxis borrable: `enum`, `namespace` con valores y propiedades de parámetro requieren `--experimental-transform-types`; `.tsx` no está soportado, no admite `.ts` dentro de `node_modules` y los tipos importados deben usar `import type`. Para un guion de un solo archivo puede ser cómodo, pero no es el flujo del `revisor`.

En particular, Node ejecutando `.ts` exige extensiones `.ts` literales en los `import`, mientras que este proyecto escribe `.js` para que el JavaScript emitido sea correcto. Si Node recibe `src/main.ts`, buscaría literalmente `./modelo.js` dentro de `src/` y no lo encontraría. Por eso el proyecto de varios archivos se compila con `tsc` y se ejecuta desde `dist/main.js`: ahí sí existen `modelo.js`, `reporte.js` y los demás módulos que los imports declaran. La opción `erasableSyntaxOnly` puede avisarte de construcciones que Node no podría borrar; no sustituye la compilación ni las pruebas.

Un módulo puede exportar valores que existen al ejecutar, como funciones y constantes, y también tipos que sólo sirven al compilador. La sintaxis `import type` hace visible esa diferencia. Si importas `Estado` únicamente para anotar una variable, TypeScript elimina esa importación del JavaScript emitido. Si importas `lineaReporte`, Node necesita cargarla, porque es una función que se invoca en tiempo de ejecución.

El siguiente programa tiene dos módulos. `modelo.ts` es dueño del contrato de los estados y de la regla para convertirlos en líneas. El archivo principal construye datos del `revisor` y consume la función exportada. Ningún archivo depende de una variable global ni necesita saber cómo está implementado el otro más allá de su exportación pública.

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

La frontera del módulo obliga a tomar decisiones útiles. `Estado` se exporta porque `revisar.ts`, `reporte.ts`, la API futura y el panel necesitan hablar del mismo resultado. Un auxiliar privado que sólo ayuda a `lineaReporte` no tiene por qué exportarse. Mantenerlo sin `export` reduce la superficie que otros archivos pueden usar por accidente. Si una función privada cambia de nombre o desaparece, ningún módulo externo debería romperse por ello.

Dentro del `revisor`, evita crear una dependencia circular. Por ejemplo, `revisar.ts` puede importar tipos desde `modelo.ts` y una función de texto desde `reporte.ts` puede importar `Estado` desde `modelo.ts`. En cambio, `modelo.ts` no debe importar a `revisar.ts` para pedirle que consulte la red. El modelo describe los datos; el coordinador usa ese modelo. Si dos módulos necesitan importarse mutuamente, normalmente una responsabilidad está mezclada y conviene extraer el concepto compartido a un tercer módulo más pequeño.

Una ruta de importación también es parte del contrato. No renombres archivos a mano sin actualizar las importaciones ni uses rutas absolutas locales que sólo funcionen en tu máquina. El proyecto debe poder clonarse y ejecutarse desde cualquier ruta. Las rutas relativas con `.js` hacen esa dependencia explícita y funcionan tanto en la carpeta de desarrollo como en el JavaScript emitido.

### Organización por responsabilidad: el flujo del revisor

Los nombres de módulos deben seguir el flujo real del programa. El `revisor` recibe configuración externa, valida servicios, coordina consultas, transforma resultados y los presenta. Esa secuencia sugiere responsabilidades naturales:

| Módulo | Pregunta que responde | Lo que no debe hacer |
|---|---|---|
| `modelo.ts` | ¿Qué es un servicio y qué resultados puede producir? | Leer JSON, llamar la red o imprimir |
| `configuracion.ts` | ¿Los datos externos forman una lista válida de servicios? | Decidir cómo se presenta un reporte |
| `revisar.ts` | ¿Cómo se consulta cada servicio y se conserva cada desenlace? | Conocer detalles de una pantalla |
| `reporte.ts` | ¿Cómo se transforma un estado confiable en salida legible? | Validar JSON o abrir conexiones |
| `main.ts` | ¿Cómo se conectan las piezas al iniciar el proceso? | Contener reglas de negocio largas |

Esta tabla no es una ley universal. Un proyecto pequeño puede tener `modelo.ts` y `reporte.ts` juntos mientras la relación sea clara. Un proyecto mayor puede dividir configuración de archivo, variables de entorno y opciones HTTP en módulos específicos. El criterio no es la cantidad de archivos; es que un cambio tenga un hogar obvio. Si cambias el texto que verá una persona, buscas `reporte.ts`. Si cambia la regla de un `timeoutMs` válido, buscas el validador de configuración.

La lección 6 ya separó la validación de la entrada desconocida. Conserva esa separación ahora que aparecen módulos. `configuracion.ts` puede exportar `leerServicios(valor: unknown): Resultado<readonly Servicio[]>`. El archivo `main.ts` puede leer un archivo con `node:fs/promises`, convertir el texto JSON a `unknown`, llamar el validador y sólo entonces entregar los servicios a `revisarTodos`. Así, la parte que toca disco es pequeña y la regla de validación sigue siendo una función que recibe valores y devuelve un resultado comprobable.

La lección 5 separó de manera parecida la coordinación de una consulta concreta. El tipo `Consultar` recibe un `Servicio` y una `AbortSignal`, y devuelve una promesa con una respuesta. En una prueba, puedes entregar una función de consulta controlada. En el programa real, `main.ts` podrá construir una implementación con `fetch`. La inyección de dependencias es entregar a una función la colaboración que necesita, en vez de que la cree u oculte dentro; aquí evita que una prueba de “un código 503 se vuelve una falla” tenga que depender de un servidor externo.

Una mala organización suele empezar con nombres cómodos. `utils.ts` parece práctico porque permite guardar una función sin decidir dónde pertenece. Después recibe validadores, convertidores, formateadores, constantes y piezas de red. El resultado es un módulo muy importado que no tiene una responsabilidad propia y vuelve difícil saber qué cambios pueden afectarlo. Si una función formatea un estado, pertenece al reporte. Si normaliza un valor de configuración, pertenece a configuración. Si no cabe en ninguna responsabilidad existente, quizá el dominio necesita un nombre nuevo.

También evita convertir `main.ts` en el nuevo archivo gigantesco. Debe ser una composición del programa: obtener configuración, validar, pedir una revisión e imprimir o iniciar el servidor. Si `main.ts` contiene cincuenta líneas de reglas para interpretar respuestas, extrae esa decisión al módulo que le corresponda. La claridad de `main.ts` sirve como un mapa de alto nivel: quien lo lea debería poder entender el recorrido del programa sin necesitar memorizar cada detalle.

### Pruebas con tabla de casos: una regla, muchas entradas

Una tabla de casos es una colección de entradas, salidas esperadas y nombres de escenario que comparte un mismo cuerpo de prueba. Es especialmente útil cuando una función tiene muchas alternativas pequeñas. En lugar de copiar cuatro veces la preparación, la llamada y la comparación, escribes una vez la mecánica y agregas filas que describen nuevos comportamientos.

El nombre de cada caso importa. `"caso 1"` no ayuda cuando una falla aparece semanas después. `"disponible conserva código y duración"` comunica la regla que se está protegiendo. `"falla conserva detalle"` comunica otra. Si se rompe la segunda fila, sabes si debes revisar el modelo, la función de presentación o la expectativa. Una tabla no sustituye pensar; hace que cada expectativa sea visible y ampliable.

Node incluye `node:assert/strict`, una biblioteca estándar de aserciones. `assert.equal(real, esperado)` termina el programa con un error si los valores son diferentes. En esta figura usamos una tabla sencilla y una salida estable para que puedas verla como un programa ordinario. En un proyecto, el mismo patrón puede vivir dentro de `node:test`, Vitest u otro ejecutor de pruebas; la tabla sigue siendo la parte que define el comportamiento esperado.

Como el archivo importa un módulo con prefijo `node:`, el comando incluye `--types node`. Desde TypeScript 6, el compilador ya no carga automáticamente las declaraciones de Node al compilar archivos aislados. Esa bandera sólo informa a TypeScript de los tipos instalados; Node sigue proporcionando `node:assert/strict` durante la ejecución.

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

Una prueba útil no sólo cubre el camino feliz. El primer caso revisa un estado disponible, pero usa 204 en vez de sólo 200 para confirmar que la función conserva el código que recibió. El segundo prueba la otra alternativa de la unión discriminada. Si alguien modifica `lineaReporte` y olvida atender las fallas, el segundo caso se pondrá rojo. Esa es una señal mejor que un porcentaje de cobertura: explica qué comportamiento dejó de cumplirse.

Los valores de frontera también deben tener lugar en tus tablas. Si una función clasifica códigos HTTP exitosos de 200 a 299, no basta con probar 200 y 500. Agrega 199, 200, 299 y 300. Los errores de comparación suelen vivir justo ahí: `<= 300` en vez de `< 300`, o `> 200` en vez de `>= 200`. Una tabla permite añadir esos casos como datos, sin duplicar toda la estructura de una prueba.

No pruebes sólo por la cobertura. Una función puede ejecutarse en una prueba y seguir sin una aserción relevante. Por ejemplo, una prueba que sólo verifica que `lineaReporte` devuelve una cadena ejercita ambas ramas, pero no detecta que la salida diga `"todo bien"` para cualquier estado. La comparación debe afirmar el detalle que importa: nombre, código, duración o mensaje de falla.

Dentro del `revisor`, las pruebas más rápidas deben enfocarse en funciones deterministas como `leerServicio`, `leerServicios`, `lineaReporte`, clasificadores de códigos y conversiones de datos. Las pruebas que usan `fetch`, archivos o un servidor local son útiles, pero responden otra pregunta: si varias piezas se integran correctamente. Empieza por las reglas puras; después agrega pruebas de integración deliberadas donde una frontera lo justifique.

### Calidad automática: compilación, lint y formato

Una rutina mínima de calidad debe ser fácil de recordar y posible de ejecutar antes de entregar un cambio. En un proyecto Node, `package.json` puede reunir los comandos para que nadie tenga que memorizar opciones largas. Un ejemplo de scripts para el `revisor` es el siguiente:

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

`compilar` emite el JavaScript en `dist/`; `verificar` hace la misma comprobación de tipos sin emitir; y `arrancar` ejecuta la entrada emitida. Esa separación es necesaria: las pruebas de Node corren los archivos JavaScript de `dist/`, por lo que `probar` primero compila y después busca `dist/**/*.test.js`. Un directorio ficticio como `dist/test` no es una prueba: Node intentaría cargarlo como módulo y fallaría antes de descubrir casos.

El `tsconfig.json` debe contener las decisiones que el proyecto repite. Para Node y ESM, una base razonable incluye `strict`, `module` y `moduleResolution` con valor `nodenext`, además de las declaraciones explícitas de Node. No necesitas copiar cada opción existente en internet: agrega una opción cuando entiendas qué contrato impone.

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

El linter no reemplaza al compilador. TypeScript sabe, por ejemplo, que una función exige un `Estado`; ESLint puede avisar de una variable que declaraste y no usaste, una promesa que dejaste sin esperar o un patrón que el equipo decidió evitar. Configúralo con reglas que puedas explicar. Una lista enorme de reglas copiadas de otro proyecto suele producir avisos que nadie atiende. Es mejor empezar con un conjunto pequeño, corregir los avisos y endurecerlo sólo cuando el equipo comprenda la razón.

Primero instala las herramientas de desarrollo. TypeScript 7 y `typescript-eslint` no se ejecutan juntos todavía: `typescript-eslint` usa la API de TypeScript 6. El proyecto conserva TypeScript 7 para `npx tsc` bajo `@typescript/native` y deja TypeScript 6 como alias `typescript` para ESLint, cuyo ejecutable adicional queda disponible como `npx tsc6`. No cambies uno por el otro: son dos papeles distintos mientras la compatibilidad llega.

```bash
npm install --save-dev eslint@10.11.0 @eslint/js@10.0.1 typescript-eslint@8.71.0 prettier@3.9.9 @types/node@24 typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2
```

npm escribe esas versiones en `package.json` precedidas de `^` (por ejemplo `"^10.11.0"`). Para este curso da igual: `package-lock.json` fija lo que se instaló. Si prefieres que `package.json` quede con versiones exactas, como en el ejemplo de la solución 4, agrega `--save-exact` al comando o quita los `^` a mano.

ESLint 10 usa un archivo de configuración plano; sin `eslint.config.js`, `eslint src` termina con un error que informa que no encontró `eslint.config.*`. Esta configuración mínima combina las reglas recomendadas de JavaScript y TypeScript. Prettier recibe una decisión explícita de comillas y ancho de línea.

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

El formateador tampoco sustituye una revisión de diseño. Prettier no sabe si `revisarTodos` vive en el módulo correcto ni si tu tabla prueba un borde importante. Su valor está en quitar decisiones mecánicas de la conversación. Si todo el proyecto usa la misma sangría y el mismo acomodo de líneas, una revisión puede concentrarse en cambios de comportamiento. Ejecuta `prettier --check src` en verificaciones automáticas y usa `npx prettier --write src` sólo cuando quieras aplicar el formato a los archivos fuente.

No ignores un linter porque el programa “funciona”. Un aviso de promesa no esperada puede significar que el proceso termina antes de registrar un resultado. Una variable no usada puede ser un resto de una validación que ya no ocurre. Tampoco obedezcas cada regla sin pensar: si una regla no representa una decisión útil para este proyecto, ajústala o elimínala con una razón visible. La calidad automática debe reducir errores y fricción, no convertirse en ruido.

En Go, `gofmt` forma parte natural del flujo y `go vet` encuentra construcciones que compilan pero parecen incorrectas. En TypeScript, el ecosistema deja más elecciones: `tsc`, ESLint, Prettier y el ejecutor de pruebas son herramientas distintas. Esa flexibilidad exige una decisión explícita. Una vez elegidas, los scripts del proyecto dan una experiencia parecida: un conjunto corto de comandos que cualquiera puede ejecutar y que una integración continua puede repetir.

## El error que vas a ver

TS2305 aparece cuando importas un nombre que el módulo no exporta. Con TypeScript 7.0.2, `tsc` imprime el siguiente diagnóstico. El módulo existe y la ruta es correcta, pero el archivo sólo exporta `revisarTodos`; no exporta una función llamada `revisarUno`.

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

TS2305 no significa que debas agregar `export` a todo hasta que desaparezca el error. Primero decide qué parte del contrato necesitas. Si el programa debe coordinar una lista completa, importa `revisarTodos`. Si realmente necesitas revisar un servicio individual, crea y exporta `revisarUno` como una función con un contrato claro, y conserva `revisarTodos` como el coordinador que la llama para cada servicio.

Otro error frecuente en ESM ocurre al omitir `.js` en una ruta relativa. TypeScript con `module: "nodenext"` puede reportar TS2835 y sugerir una extensión explícita. La corrección no es escribir `.ts`; escribe la extensión `.js` del archivo emitido. Ese detalle parece extraño sólo mientras miras el código fuente. Node resolverá el JavaScript generado, y el import debe describir justamente ese archivo.

Cuando Node muestra `ERR_MODULE_NOT_FOUND`, la compilación ya pasó y el problema está en la resolución durante la ejecución. Revisa la ruta relativa, las mayúsculas y minúsculas del nombre del archivo y la extensión `.js`. No soluciones ese error cambiando a `require` ni desactivando ESM: el diagnóstico te está mostrando una diferencia real entre el nombre que importaste y el archivo que Node puede cargar.

Un fallo de prueba tiene otra lectura. Si `assert.equal` informa que obtuvo una cadena distinta de la esperada, no cambies la expectativa de inmediato para recuperar el verde. Pregunta primero si cambió el requisito o si cambió el código por accidente. Una prueba debe documentar comportamiento acordado; modificarla para acomodar cualquier salida elimina justo la señal que te avisaba del cambio.

## Lo que se hace mal

- **Crear un módulo `utils`, `helpers` o `common` para todo lo que no tiene lugar.** Esos nombres no explican una responsabilidad y terminan concentrando dependencias sin relación. Nombra el concepto dueño de la función, como `configuracion`, `reporte` o `revisar`; si no puedes hacerlo, quizá falta aclarar el diseño antes de mover código.

- **Importar rutas relativas sin `.js` en ESM.** Puede parecer que el archivo fuente debería importarse con `.ts` o sin extensión, pero Node ejecuta el JavaScript emitido. Usa la ruta que Node resolverá, por ejemplo `./modelo.js`, y deja que TypeScript relacione esa ruta con el archivo fuente.

- **Exportar todo “por si acaso”.** Cada exportación se vuelve una dependencia potencial de otros módulos. Mientras más superficie pública tenga un archivo, más difícil será cambiar su interior. Exporta tipos y funciones que otros módulos realmente necesitan; conserva privados los auxiliares de implementación.

- **Hacer pruebas que dependen de red, reloj y archivos para comprobar una regla de texto.** Esas pruebas son más lentas, menos deterministas y más difíciles de diagnosticar. Separa primero la regla pura, pruébala con datos construidos en memoria y deja las fronteras para pruebas de integración específicas.

- **Probar un solo caso feliz.** Una función que maneja una unión discriminada necesita al menos un caso por alternativa importante. Las comparaciones de rangos necesitan valores de frontera. Un caso aislado puede pasar aunque el programa falle para las entradas que realmente distinguen una regla.

- **Perseguir 100 % de cobertura como meta única.** Cobertura significa que una línea se ejecutó, no que una expectativa importante se verificó. Úsala para descubrir rutas que no has considerado, pero revisa si cada prueba puede fallar cuando cambia el comportamiento que pretende proteger.

- **Usar el linter y el formateador como sustitutos de una revisión.** Las herramientas automáticas encuentran clases limitadas de problemas. No pueden decidir si `timeoutMs` tiene una política correcta, si un mensaje de error ayuda a operar el sistema o si el módulo elegido representa bien la responsabilidad.

- **Aplicar formato manualmente antes de cada revisión.** Si el proyecto tiene un formateador, deja que haga el trabajo mecánico. Las diferencias de estilo mezcladas con un cambio de comportamiento dificultan revisar qué cambió de verdad.

## Ejercicios

### Ejercicio 1 — Extraer el modelo del revisor

Crea un módulo `modelo.ts` que exporte `Servicio`, `EstadoDisponible`, `EstadoFalla` y `Estado` con los mismos contratos usados en las lecciones 3 y 5. Crea un archivo principal que importe `type Estado` desde `./modelo.js`, construya un estado disponible y otro de falla, y los imprima mediante una función exportada desde el módulo.

### Ejercicio 2 — Una tabla para clasificar códigos

Escribe `clasificarCodigo(codigoHttp: number): "disponible" | "falla"` en un módulo. Crea una prueba con tabla de casos para 199, 200, 299, 300 y 503. Cada fila debe tener un nombre que describa el borde o la regla que comprueba. Usa `node:assert/strict` y documenta el comando de compilación con `--types node`.

### Ejercicio 3 — Separar configuración de arranque

Parte de `leerServicios` de la lección 6. Colócalo en `configuracion.ts`, conserva la entrada como `unknown` y exporta sólo la función de lectura y los tipos que otro módulo necesite. Crea un `main.ts` pequeño que reciba un valor ya parseado, llame la función y sólo entregue la lista a la revisión si el resultado tiene `ok: true`.

### Ejercicio 4 — Una rutina de calidad

Agrega los scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` y `formato` con los contratos de esta lección. Incluye `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` y `"sourceMap": true` en `tsconfig.json`. Instala ESLint, `typescript-eslint` y Prettier con los aliases de TypeScript 6 y 7; ejecuta cada script, corrige al menos un detalle de formato y deja anotado qué pregunta responde cada comando.

## Soluciones

### Solución 1

El módulo es dueño de los tipos y de la presentación porque ambos describen el resultado del dominio. El archivo consumidor importa el tipo con `import type`, por lo que Node sólo necesita cargar la función que existe al ejecutar.

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

No hace falta exportar una constante de ejemplo ni funciones auxiliares que sólo `resumen` necesita. El módulo ofrece el contrato mínimo que otro archivo requiere.

### Solución 2

La tabla hace visibles los cuatro límites relevantes y un caso claramente fuera del rango. La función conserva una regla simple: disponible incluye desde 200 hasta antes de 300.

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

El `as const` conserva los literales de cada expectativa. No es indispensable para esta prueba, pero evita que la tabla se ensanche a `string` si después quieres reutilizar sus valores en una función con una unión de literales.

### Solución 3

La función que lee configuración no debe importar `node:fs/promises` ni depender de la ruta del archivo. Su trabajo es decidir si un valor desconocido forma una lista válida. La lectura física del archivo corresponde a una capa exterior, que puede vivir en `main.ts` o en un módulo pequeño dedicado a la frontera de disco.

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

La solución reutiliza la misma guarda `esRegistro` y las mismas reglas de la lección 6: texto no vacío para nombre y URL, y entero seguro positivo para `timeoutMs`. La validación conserva una entrada `unknown` y devuelve un contrato confiable antes de iniciar la revisión; `esRegistro` hace el estrechamiento con comprobaciones de ejecución, no con una aserción de tipo, así que el compilador y el programa coinciden.

### Solución 4

Los scripts convierten una rutina oral en una interfaz del proyecto. Este `revisor` completo conserva `src/main.ts` como única entrada, deja la prueba junto a la regla y repite en un proyecto real las decisiones explicadas arriba. El modelo no cambia de forma entre estos archivos: cada `Estado` mantiene el `Servicio` completo y distingue disponibilidad de falla con `tipo`.

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

`npm run verificar` responde sólo a los tipos sin crear archivos; `npm run probar` recompila y ejecuta las pruebas descubiertas en `dist/`; `npm run lint` carga la configuración plana de ESLint; y `npm run formato` confirma que los archivos de `src` ya respetan Prettier. `npm run arrancar` es la comprobación pequeña de la composición completa. Si necesitas aplicar formato, ejecuta `npx prettier --write src`, revisa el cambio y vuelve a ejecutar `npm run formato`.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2` en el proyecto.
- [ ] `npm run verificar` termina sin diagnóstico y no crea ni actualiza archivos en `dist/`.
- [ ] `npm run probar` compila, descubre `dist/reporte.test.js` y reporta dos pruebas aprobadas.
- [ ] `npm run lint` y `npm run formato` terminan correctamente después de instalar y configurar sus herramientas.
- [ ] `npm run arrancar` imprime un estado disponible y uno de falla con el proyecto compilado.
- [ ] Al compilar una importación de un nombre no exportado, aparece TS2305 en el nombre importado.
- [ ] Mi proyecto usa importaciones relativas con extensión `.js` y tiene `"type": "module"` en su `package.json`.
- [ ] Mi `tsconfig.json` de Node incluye `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` y `"sourceMap": true`.

## Para leer más

- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) — documentación oficial sobre `export`, `import`, módulos y organización del código; consultado el 2 de octubre de 2026.

- [Node.js: ejecutar TypeScript](https://nodejs.org/api/typescript.html) — documentación oficial sobre type stripping, sintaxis borrable y límites de ejecutar archivos `.ts` directamente; consultado el 2 de octubre de 2026.

- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html) — documentación oficial sobre ESM en Node y extensiones en importaciones relativas; consultado el 2 de octubre de 2026.

- [Node.js: `node:assert/strict`](https://nodejs.org/api/assert.html) — documentación oficial de las aserciones estrictas usadas para comprobar tablas de casos; consultado el 2 de octubre de 2026.
