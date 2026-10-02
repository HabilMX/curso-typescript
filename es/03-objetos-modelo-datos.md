# Lección 3 — Objetos y el modelo de datos

**Tiempo:** 2 × 45 min

**Qué construyes:** el modelo `Servicio` / `Estado`

**Qué aprendes:** `type` vs `interface`, tipado estructural, `readonly`, uniones discriminadas para estados

## Al terminar vas a poder

- Definir un objeto `Servicio` con propiedades obligatorias y explicar qué contrato representa cada una.
- Elegir entre `type` e `interface` al modelar una forma de datos o una unión.
- Explicar por qué TypeScript acepta objetos por su forma y no por una etiqueta nominal.
- Proteger propiedades que no deben reasignarse con `readonly` y reconocer su límite en tiempo de ejecución.
- Representar resultados correctos y fallidos mediante una unión discriminada.
- Corregir diagnósticos TS2540, TS2339 y TS2741 sin desactivar `strict`.

## El porqué antes del cómo

Hasta ahora el `revisor` ha tenido valores simples: un nombre, una URL, una cadena que describe un estado. Eso basta para explicar una función o comprobar que el entorno compila, pero deja una pregunta importante sin resolver: ¿cómo evitas que los datos que pertenecen al mismo servicio terminen separados, mezclados o usados con nombres distintos?

En JavaScript puedes guardar la información de un servicio en varias variables sueltas:

```ts
const nombre = "catálogo";
const url = "https://catalogo.example";
const timeoutMs = 1500;
```

No hay nada incorrecto en esas tres líneas. El problema aparece cuando hay varios servicios. Tendrías `nombreCatalogo`, `urlCatalogo`, `timeoutCatalogo`, luego `nombrePagos`, `urlPagos`, `timeoutPagos`, y después tendrías que recordar qué valores corresponden entre sí. JavaScript no distingue por sí mismo el nombre de un servicio de la URL de otro. Una función puede recibir tres argumentos en el orden equivocado y, si todos son cadenas o números compatibles, el error puede pasar inadvertido.

El objeto resuelve la primera parte del problema: agrupa datos que describen una misma cosa. En lugar de transportar tres valores desconectados, transportas un `Servicio`. El nombre de las propiedades deja visible qué representa cada valor, y el compilador puede revisar que el objeto trae todos los datos que el programa necesita.

Pero un objeto por sí solo todavía no expresa todas las reglas del dominio. El `revisor` no sólo conoce servicios configurados: también produce resultados. Un resultado disponible tiene un código HTTP y una duración; un resultado fallido quizá no tiene código HTTP, pero sí tiene un detalle de la falla. Si modelas ambos resultados como un solo objeto lleno de propiedades opcionales, la lógica termina llena de preguntas ambiguas: “¿el código falta porque falló la red o porque nadie lo asignó?”, “¿puedo imprimir `detalle` aunque el estado sea disponible?”, “¿qué significa que ambos campos existan al mismo tiempo?”.

La lección trata de convertir esas preguntas en contratos visibles. `interface` y `type` permiten nombrar formas de objeto. El tipado estructural permite que una función acepte un valor porque tiene las propiedades que necesita, no porque provenga de una clase o haya declarado que pertenece a una jerarquía. `readonly` comunica que cierta parte de una configuración no debe cambiar después de crearla. Las uniones discriminadas permiten describir estados mutuamente excluyentes y obligan a atender cada camino antes de acceder a datos específicos.

En Go, un `struct` agrupa campos bajo un tipo con nombre. TypeScript también usa objetos para agrupar datos, pero se apoya en una diferencia importante: sus tipos se revisan antes de ejecutar y se borran al emitir JavaScript. `interface Servicio` no crea una clase, no construye objetos y no existe para Node cuando el programa corre. Es una descripción estática de la forma que los objetos deben tener dentro del código TypeScript.

Esa diferencia explica dos consecuencias. La primera es positiva: puedes aplicar un contrato a objetos ordinarios de JavaScript sin reescribirlos como clases ni hacerlos heredar de una base común. La segunda exige cuidado: no basta escribir un tipo para validar JSON, una variable de entorno o una respuesta HTTP. La validación de esas fronteras llegará en la lección 6. Aquí modelarás los valores que ya son confiables dentro del programa.

El objetivo no es llenar el proyecto de tipos largos. Es volver explícitas las decisiones que cambian el comportamiento del `revisor`: qué necesita un servicio para ser revisable, qué datos no deben alterarse durante una revisión y qué información existe en cada resultado posible. Cuando esas decisiones quedan en el tipo, el compilador puede detectar combinaciones imposibles antes de que el panel o la API intenten usarlas.

## Los conceptos

### Objetos: una cosa con datos que van juntos

Un objeto de JavaScript reúne pares de propiedad y valor. Las llaves crean el objeto; cada propiedad tiene un nombre y un valor. Puedes leer una propiedad con punto, como `servicio.nombre`, o con corchetes, como `servicio["nombre"]`. TypeScript parte de este mismo mecanismo de JavaScript y agrega la posibilidad de describir qué propiedades espera el programa.

La diferencia entre “un objeto que hoy trae estas propiedades” y “un objeto que el programa reconoce como `Servicio`” es importante. El primero puede crecer, cambiar o llegar incompleto. El segundo es un contrato: debe tener las propiedades declaradas, y cada una debe contener un valor del tipo indicado. El compilador no revisa una red ni consulta una URL; sí revisa que un objeto literal escrito en el programa cumpla la forma prometida.

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

La función no recibe tres parámetros cuya relación debes recordar. Recibe un solo `Servicio`, y el tipo documenta que esa unidad tiene `nombre`, `url` y `timeoutMs`. También es más fácil extender el contrato de manera consciente. Si más adelante el programa necesita una política de reintentos, puedes agregar `reintentos` al tipo y dejar que TypeScript señale los lugares que ahora deben decidir su valor.

Dentro del `revisor`, el objeto de configuración debe describir al servicio, no el resultado de consultarlo. Un `Servicio` es estable mientras dura una corrida: identifica qué se quiere revisar y con qué límite. El resultado se representará con otro tipo llamado `Estado`. Separar ambas ideas evita un objeto confuso donde una URL configurada, un código HTTP observado y un mensaje de falla se mezclan como si fueran la misma clase de dato.

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

No conviertas cada dato relacionado en una clase por costumbre. Para la mayoría de los valores del `revisor`, un objeto con un tipo bien elegido es suficiente. Las clases agregan comportamiento de ejecución, constructores, prototipos y, en ocasiones, herencia. Nada de eso es necesario para expresar que un servicio tiene nombre, URL y límite. Un objeto ordinario con un contrato claro suele ser más directo y más fácil de convertir a JSON.

Tampoco uses objetos como bolsas sin forma con propiedades inventadas sobre la marcha. Una anotación como `Record<string, unknown>` sirve cuando realmente no conoces las claves, pero un servicio sí tiene un vocabulario conocido. Si aceptas cualquier clave para algo que tiene tres propiedades concretas, pierdes la ayuda que el tipo podía darte.

### `type` e `interface`: dos herramientas cercanas, no dos bandos

Un alias creado con `type` da nombre a cualquier tipo. Puede nombrar un objeto, una unión, un literal, un arreglo o una combinación de otros tipos. Una interfaz describe sobre todo la forma de un objeto: propiedades, métodos y relaciones que puede extender. Para una forma simple de datos, ambos se ven casi iguales.

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

La elección práctica para este curso es sencilla. Usa `interface` para entidades con forma de objeto que representan contratos extensibles del programa, como `Servicio`. Usa `type` para uniones, composiciones y nombres de tipos que no son necesariamente objetos, como `Estado`, `"disponible" | "falla"` o `string | undefined`. No es una ley del compilador: ambos pueden describir muchos objetos. Es una convención para que quien lea el código vea de inmediato si está frente a una entidad o a una combinación de posibilidades.

Hay diferencias que conviene conocer sin convertirlas en una discusión religiosa. Una interfaz puede extender otra con `extends` y puede declararse más de una vez; TypeScript combina declaraciones de interfaz con el mismo nombre. Esa combinación, llamada *declaration merging*, es útil principalmente al ampliar declaraciones de una biblioteca. Un alias `type` no se vuelve a abrir de esa manera: si lo declaras dos veces en el mismo ámbito, es un error. A cambio, `type` puede representar directamente una unión, algo que una interfaz no puede hacer.

No declares dos veces una interfaz de dominio sólo porque el compilador permite combinarla. Si una parte del proyecto agrega `timeoutMs` y otra agrega `equipo`, el contrato final queda repartido entre archivos y cuesta descubrir de dónde salió cada obligación. Para el `revisor`, cada entidad del dominio tendrá una declaración principal, localizada junto a los demás tipos compartidos.

También evita deducir una diferencia inexistente: `interface` no hace que los objetos sean más rápidos, no genera validación y no crea una instancia especial. En JavaScript emitido, las dos declaraciones desaparecen. La elección es para comunicar intención y ayudar al compilador, no para modificar el comportamiento de Node.

Dentro del `revisor`, `Servicio` usa una interfaz porque expresa la forma estable de una configuración. `Estado`, en cambio, será un alias de una unión porque su función es declarar alternativas excluyentes. Leer `type Estado = EstadoDisponible | EstadoFalla` comunica una idea que una interfaz única no puede expresar por sí misma: un resultado siempre pertenece a una alternativa concreta.

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

El tipo `EstadoInicial` todavía tiene una sola alternativa porque el revisor aún no ha consultado nada. Más abajo ampliarás el modelo para describir resultados disponibles y fallidos. Lo importante es que los nombres no se reciclan para ideas diferentes: `Servicio` describe la entrada de la consulta; `Estado` describe lo que la consulta observó.

En `fig03_04`, `timeoutMs` todavía es ajustable para mostrar una configuración durante su normalización; desde `fig03_07` cambia el modelo y las tres propiedades de `Servicio` son `readonly`, porque ya representa la configuración definitiva de una consulta.

### `readonly`: proteger una referencia, no congelar el mundo

El modificador `readonly` prohíbe reasignar una propiedad desde un lugar donde TypeScript conoce ese contrato. Es útil para datos de identidad y configuración que no deberían cambiar durante la operación. En el `revisor`, cambiar `nombre` o `url` a mitad de una revisión haría difícil interpretar el reporte: podrías iniciar la consulta para catálogo y terminar imprimiendo que revisaste pagos.

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

El ejemplo muestra un matiz esencial: `readonly` es superficial. Impide reasignar `registro.id` y también impediría reemplazar por completo `registro.cliente` si esa propiedad fuera `readonly`. No impide modificar las propiedades internas de `cliente`, porque `cliente.nombre` no fue declarado como de sólo lectura. No confundas “una propiedad no puede apuntar a otro objeto” con “el objeto al que apunta es inmutable”.

Esto se parece a tener una etiqueta fija en una carpeta. No puedes sustituir la carpeta asociada a la etiqueta, pero sí puedes editar una hoja dentro si sus reglas lo permiten. Si necesitas que toda una estructura sea inmutable, tendrás que expresar `readonly` en sus niveles relevantes, usar una utilidad como `Readonly<T>` o diseñar operaciones que construyan valores nuevos. Esa decisión depende del dominio; no es una consecuencia automática de poner una palabra delante de una propiedad.

`readonly` tampoco existe como barrera de ejecución. TypeScript lo borra al compilar. Si JavaScript externo obtiene una referencia al mismo objeto, o si alguien usa una aserción para esquivar el contrato, Node no bloqueará por sí solo el cambio. Para impedir cambios durante la ejecución existe `Object.freeze`, aunque también es superficial y tiene otras implicaciones. En esta etapa, `readonly` sirve para expresar una regla de diseño y obtener diagnósticos antes de ejecutar.

Con TypeScript 7.0.2, el siguiente archivo imprime este error si intentas modificar una propiedad declarada como de sólo lectura.

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

Dentro del `revisor`, marca como `readonly` las propiedades que identifican lo que se va a consultar: `nombre` y `url`. No marques todo automáticamente. El límite `timeoutMs` podría ser ajustable por una función que normaliza la configuración antes de iniciar las consultas; después de esa frontera, podrías construir un `Servicio` definitivo con valores inmutables. La pregunta útil es “¿quién puede cambiar este dato y en qué momento?”, no “¿cuántas propiedades puedo congelar?”.

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

La función `destinoDe` sólo necesita leer el servicio, por lo que puede aceptar el contrato de sólo lectura. Esto comunica a quien la llama que la función no debe cambiar el destino de la consulta ni alterar sus límites. Si una función necesita construir una versión modificada, es preferible que devuelva un objeto nuevo con la modificación explícita, en lugar de mutar silenciosamente la configuración que otras partes del programa siguen usando.

### Tipado estructural: importa la forma que necesitas

TypeScript tiene tipado estructural. En términos prácticos, si un valor tiene las propiedades requeridas con tipos compatibles, puede usarse donde se pide esa forma. No necesita declarar que “implementa” la interfaz ni pertenecer a una familia de clases. Esta idea se parece a las interfaces de Go: un valor es aceptable porque satisface lo que la función necesita, no porque lleve una etiqueta especial.

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

`servicioCompleto` tiene propiedades adicionales, pero eso no impide pasarlo a `saludar`. La función sólo prometió leer `nombre`; exigir URL y tiempo límite sería agregar una dependencia que no necesita. Esta capacidad permite diseñar funciones pequeñas y contratos pequeños.

No obstante, el tipado estructural no significa que debas hacer todos los contratos mínimos posibles. Una función que inicia una consulta HTTP sí necesita URL y límite; su parámetro debe ser `Servicio`, no sólo `ConNombre`. El principio es pedir exactamente lo que usas, ni menos ni más. Pedir menos puede esconder una dependencia real; pedir más amarra funciones sencillas a detalles que no les corresponden.

Hay una protección adicional para objetos literales escritos directamente en una llamada o asignación. Si escribes `saludar({ nombre: "catálogo", nombreVisible: "Catálogo" })`, TypeScript puede advertir que `nombreVisible` no pertenece a `ConNombre`. Esa comprobación de exceso de propiedades detecta errores de dedo frecuentes. No contradice el ejemplo anterior: un valor ya guardado en una variable puede tener más propiedades y seguir cumpliendo una forma menor.

Dentro del `revisor`, un resumen puede necesitar sólo el nombre de un servicio, mientras que la operación de consulta necesita la configuración completa. No hace falta crear una jerarquía de clases para esa diferencia. Basta describir cada contrato según su consumidor.

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

`Servicio extends ConNombre` reutiliza una forma porque todo servicio tiene nombre. Aun así, `encabezado` no necesita conocer `Servicio`; depende de la forma menor que consume. Esta separación será útil cuando la API y el panel compartan tipos: cada función podrá importar el contrato que requiere sin recibir un objeto más acoplado de lo necesario.

Evita usar el tipado estructural como permiso para mezclar conceptos distintos sólo porque por accidente tienen la misma forma. Dos objetos con `{ nombre: string }` son compatibles aunque uno represente un servicio y otro a una persona responsable. Si el dominio requiere distinguirlos incluso cuando comparten estructura, necesitarás un diseño más específico. Para este curso, los nombres de las propiedades y los tipos de dominio claros bastan; las técnicas de marcas nominales se reservan para casos donde el riesgo justifica esa complejidad.

### Uniones discriminadas: cada estado trae sus propios datos

Una unión declara que un valor puede ser una de varias alternativas. Ya usaste uniones de literales como `"disponible" | "falla"`. Una unión discriminada va un paso más allá: cada alternativa es un objeto que comparte una propiedad literal, llamada discriminante, pero contiene datos propios. El discriminante permite que TypeScript reduzca el tipo cuando compruebas su valor.

Para el `revisor`, el discriminante será `tipo`. En este primer ejemplo mínimo, un estado disponible trae `codigoHttp` y un estado fallido trae `detalle`. En el modelo completo de la figura siguiente se agrega `duracionMs` al caso disponible. No son datos opcionales de un objeto genérico; son datos que existen por la clase de resultado que ocurrió.

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

Dentro del `if`, TypeScript sabe que `estado` es `EstadoDisponible`, porque sólo esa alternativa puede tener `tipo: "disponible"`. Después del `if`, sabe que quedó `EstadoFalla`, porque la unión tenía exactamente dos alternativas. Esta reducción se llama *narrowing*. No es una conversión de datos: el objeto ya tenía una forma concreta; la condición permite que el compilador determine cuál.

El diseño evita combinaciones sin significado. Con un tipo débil como este:

```ts
type EstadoDebil = {
  tipo: "disponible" | "falla";
  codigoHttp?: number;
  detalle?: string;
};
```

podrías crear un estado disponible sin código, una falla sin detalle o un estado disponible que además tiene el detalle de una falla. Todas esas combinaciones compilarían, porque el tipo admite propiedades opcionales sin relacionarlas con `tipo`. La unión discriminada incorpora la relación al contrato.

Dentro del revisor, el estado completo conserva el servicio junto con el resultado. Esto vuelve posible imprimir un reporte sin reconstruir qué servicio produjo cada dato. Observa que cada variante repite `servicio`; más adelante podrás extraer esa parte común si mejora la claridad, pero repetir unas cuantas propiedades es preferible a esconder un modelo difícil de leer.

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

El import usa `type Estado` porque sólo importa información para el compilador. TypeScript elimina esa importación de tipo en el JavaScript emitido; `lineaReporte`, en cambio, es una función real y sí se importa para que Node pueda ejecutarla. La extensión `.js` en la ruta relativa sigue siendo obligatoria porque Node resolverá el archivo emitido.

No escribas condiciones basadas en la presencia de una propiedad cuando ya tienes un discriminante claro. Preguntar `if ("codigoHttp" in estado)` puede funcionar, pero describe un detalle accidental de la representación. Preguntar `if (estado.tipo === "disponible")` expresa la regla del dominio: estás atendiendo el caso disponible. El código queda más fácil de leer, y TypeScript puede reducir el tipo de manera directa.

Cuando agregues una tercera alternativa, por ejemplo `"cancelado"`, las funciones que manejan los estados deben decidir qué hacer con ella. Una guarda de exhaustividad hace comprobable esa obligación: en el `default` de un `switch`, asignas el estado restante a una variable `never`. `never` es el tipo que representa un valor imposible; si todas las alternativas ya fueron atendidas, TypeScript acepta esa asignación. Esa fricción es una ventaja. Un estado nuevo no debería aparecer silenciosamente en el panel como si fuera una falla conocida; la guarda permite que el compilador señale cada función que debe agregar una rama.

El siguiente programa agrega `EstadoCancelado` pero deja intacto el `switch`. Con TypeScript 7.0.2, `tsc` imprime TS2322 porque en el `default` todavía queda un `EstadoCancelado`, que no puede asignarse a `never`.

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

## El error que vas a ver

TS2540 aparece cuando intentas reasignar una propiedad `readonly`, como ocurrió en `fig03_06.ts`. El compilador no está diciendo que el objeto sea imposible de usar; está señalando una operación concreta que contradice el contrato. El arreglo correcto depende de la intención: si el identificador realmente no debe cambiar, crea un objeto nuevo con el nuevo valor; si debía poder cambiar durante una etapa de normalización, usa un tipo mutable sólo dentro de esa etapa y construye después el valor definitivo.

Otro diagnóstico frecuente con uniones discriminadas es TS2339. Ocurre cuando intentas leer una propiedad que no existe en todas las alternativas sin comprobar antes el discriminante.

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

TS2339 significa que la propiedad no está garantizada por el tipo actual. `codigoHttp` existe para `EstadoDisponible`, pero no para `EstadoFalla`. No uses una aserción como `estado as EstadoDisponible` para esconder el diagnóstico: si el resultado realmente es una falla, esa promesa sería falsa. Primero comprueba `estado.tipo === "disponible"`; sólo dentro de esa rama el código HTTP está disponible.

TS2741 aparece al construir un objeto que omite una propiedad obligatoria. Es particularmente útil al cambiar el modelo, porque señala todas las construcciones que ya no cumplen el contrato.

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

No arregles TS2741 agregando valores inventados como `timeoutMs: 0` sin decidir qué significa cero. Puede ser un valor válido, puede significar “sin tiempo límite”, o puede ser una configuración peligrosa. El diagnóstico no sólo pide una propiedad; te pide resolver una decisión del dominio. Si el tiempo límite debe ser obligatorio, proporciona un valor elegido conscientemente. Si de verdad puede faltar, modela esa ausencia y atiéndela antes de iniciar una consulta.

## Lo que se hace mal

- **Guardar un servicio en variables sueltas.** Mientras hay un solo servicio, parece más corto. Con varios, los valores se mezclan y las firmas de funciones se vuelven largas y frágiles. Un objeto `Servicio` conserva juntos los datos que describen una misma configuración.

- **Elegir `type` o `interface` como una regla absoluta.** Los dos sirven para muchos objetos. Usar `interface` para entidades de objeto y `type` para uniones es una convención útil; discutir cuál es universalmente superior distrae de la pregunta importante: qué forma debe admitir el programa.

- **Usar `readonly` como si fuera seguridad de ejecución.** El modificador sólo existe durante la comprobación de tipos y es superficial. No valida entradas externas, no congela objetos anidados y no evita que JavaScript sin tipos cambie una referencia compartida.

- **Declarar todas las propiedades opcionales en un estado único.** Un tipo con `codigoHttp?: number` y `detalle?: string` admite combinaciones contradictorias. Una unión discriminada expresa qué propiedades existen en cada alternativa y obliga a comprobar el caso antes de usarlo.

- **Comprobar propiedades accidentales en lugar del discriminante.** `if ("detalle" in estado)` depende de cómo está representado el objeto hoy. `if (estado.tipo === "falla")` expresa la decisión del dominio y hace más clara la reducción de tipo.

- **Usar `as EstadoDisponible` para quitar TS2339.** Una aserción no convierte una falla en un resultado disponible. Si el valor viene de una unión, el camino seguro es estrecharlo con el discriminante. Si viene de fuera del programa, primero debe validarse.

- **Modelar `Servicio` y `Estado` como si fueran la misma entidad.** El servicio representa la intención de consultar una URL; el estado representa lo que ocurrió al intentarlo. Tenerlos separados evita que una respuesta observada cambie accidentalmente la configuración que la originó.

## Ejercicios

### Ejercicio 1 — Un servicio completo

Define una interfaz `Servicio` con `nombre`, `url` y `timeoutMs`, todos obligatorios. Crea dos servicios, `catálogo` y `pagos`, y una función `etiqueta` que reciba un `Servicio` e imprima su nombre y URL. Compila con `strict`; después elimina `timeoutMs` de uno de los objetos y explica el diagnóstico que aparece.

### Ejercicio 2 — Configuración que no cambia

Modifica `Servicio` para que `nombre`, `url` y `timeoutMs` sean `readonly`. Intenta reasignar `url` después de crear un servicio y confirma TS2540. Luego escribe una función `conTimeout(servicio, timeoutMs)` que devuelva un nuevo objeto `Servicio` con el límite cambiado, sin mutar el original.

### Ejercicio 3 — Reporte de resultados

Define `EstadoDisponible` con `servicio`, `tipo: "disponible"`, `codigoHttp` y `duracionMs`. Define `EstadoFalla` con `servicio`, `tipo: "falla"` y `detalle`. Crea `type Estado` como unión de ambas alternativas y una función `lineaReporte` que produzca una línea distinta para cada caso. Prueba por lo menos un resultado de cada clase.

### Ejercicio 4 — Un estado nuevo obliga a decidir

Agrega `EstadoCancelado` con `tipo: "cancelado"` y `motivo`. Inclúyelo en `Estado`. Reescribe `lineaReporte` como un `switch` con un `default` que asigne el estado a una variable `never`. Primero deja fuera el caso `"cancelado"` y confirma TS2322; después agrega su rama para que también lo muestre. Identifica las funciones que tienen esa guarda de exhaustividad y explica por qué eso es preferible a que una cancelación aparezca como una falla genérica.

## Soluciones

### Solución 1

La interfaz debe agrupar los tres datos necesarios para iniciar una consulta. Al borrar `timeoutMs`, TypeScript produce TS2741 porque la configuración dejó de cumplir el contrato. El diagnóstico es correcto: el programa todavía debe decidir cuánto tiempo puede esperar antes de dar por fallida una consulta.

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

### Solución 2

`readonly` impide asignar a la propiedad existente, pero crear un valor nuevo es válido. La función devuelve una copia con el nuevo límite; el operador de propagación conserva las demás propiedades.

```ts
function conTimeout(servicio: Servicio, timeoutMs: number): Servicio {
  return {
    ...servicio,
    timeoutMs,
  };
}
```

El objeto original no cambia. Esa propiedad es valiosa cuando el mismo `Servicio` se comparte entre el código que arma el reporte y el código que ejecuta la consulta.

### Solución 3

La solución necesita preguntar por el discriminante antes de acceder a datos particulares de una alternativa. Dentro de cada rama, TypeScript reduce el tipo de forma automática.

```ts
function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

No hace falta preguntar si `codigoHttp` existe: la comparación con `tipo` ya prueba que el valor es un `EstadoDisponible`.

### Solución 4

La nueva alternativa debe añadirse explícitamente a la unión y a la función que la presenta.

```ts
type EstadoCancelado = {
  servicio: Servicio;
  tipo: "cancelado";
  motivo: string;
};
```

Después, `lineaReporte` necesita una rama para `"cancelado"` y una guarda de exhaustividad al final del `switch`.

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

Con las tres ramas, `estado` ya es imposible en `default`, por lo que la asignación a `never` compila. Si agregas otra alternativa a `Estado` y olvidas su `case`, TS2322 señalará esta función. Esto permite diferenciar una cancelación intencional de una falla de red y obliga a actualizar las funciones que sí eligieron una guarda de exhaustividad; una función sin esa guarda no puede prometer que el compilador la señale.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] `node --version` empieza con `v24`.
- [ ] Después de crear la estructura de `fig03_11`, `cd fig03_11 && npm run compilar && npm run arrancar` imprime exactamente:

```text
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

- [ ] Al compilar `fig03_06.ts` con `npx tsc --strict --target ES2022 --module nodenext fig03_06.ts`, obtienes TS2540 y no intentas ejecutarlo como si hubiera compilado.
- [ ] Al compilar `fig03_12.ts` con `npx tsc --strict --target ES2022 --module nodenext fig03_12.ts`, obtienes TS2339 y puedes explicar por qué `codigoHttp` sólo se puede leer después de comprobar `tipo`.
- [ ] Al compilar `fig03_14.ts` con `npx tsc --strict --target ES2022 --module nodenext fig03_14.ts`, obtienes TS2322; agregas el `case "cancelado"` y la guarda `never` vuelve a compilar sin `any` ni aserciones.
- [ ] Puedes explicar que `readonly` protege la reasignación durante la comprobación de TypeScript, pero no congela por sí mismo un objeto en Node.

## Para leer más

- [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — documentación oficial sobre objetos, interfaces, propiedades `readonly` y compatibilidad estructural; consultado el 2 de octubre de 2026.

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) — documentación oficial sobre interfaces, alias y sus diferencias prácticas; consultado el 2 de octubre de 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) — documentación oficial sobre reducción de tipos y uniones discriminadas; consultado el 2 de octubre de 2026.

- [MDN: Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) — referencia sobre la diferencia entre una restricción estática y congelar objetos durante la ejecución; consultado el 2 de octubre de 2026.
