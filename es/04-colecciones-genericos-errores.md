# Lección 4 — Colecciones, genéricos y errores

**Tiempo:** 2 × 45 min

**Qué construyes:** la lista de servicios y el reporte

**Qué aprendes:** arreglos, `Map`/`Set`, genéricos, tipos utilitarios; errores: excepciones vs resultado, `unknown` en `catch`

## Al terminar vas a poder

- Construir y recorrer una lista tipada de `Servicio` sin perder la relación entre cada servicio y su configuración.
- Elegir entre un arreglo, `Map` y `Set` según la pregunta que el `revisor` necesita responder.
- Escribir una función genérica que conserve la relación entre el tipo que recibe y el tipo que devuelve.
- Usar `Pick`, `Omit`, `Readonly` y `Record` para derivar contratos sin duplicar el modelo.
- Representar una operación que puede fallar con una unión discriminada de resultado.
- Corregir un acceso inseguro a un valor `unknown` dentro de `catch` sin usar `any`.

## El porqué antes del cómo

El modelo de la lección anterior definió qué es un `Servicio` y qué formas puede tener un `Estado`. Eso resolvió una parte importante del problema: cada valor ya tiene una forma explícita. Sin embargo, un revisor real no consulta un solo servicio. Necesita conservar una lista de destinos, revisar cada uno, reunir sus estados y producir un reporte que permita contestar preguntas concretas: cuántos servicios se configuraron, cuáles fallaron, cuál resultado corresponde a catálogo y qué nombres se repitieron accidentalmente.

En JavaScript es fácil empezar con varios valores sueltos. Puedes crear `catalogo`, `pagos` e `inventario` como variables independientes y después llamar una función para cada una. El enfoque sirve para una demostración pequeña, pero el programa se vuelve frágil en cuanto la configuración cambia. Agregar un servicio obliga a buscar varios sitios; ordenar el reporte exige repetir lógica; y evitar nombres duplicados queda como una regla que nadie está verificando.

Las colecciones permiten expresar que los datos forman un conjunto con una relación concreta. Un arreglo responde “¿cuáles son los servicios y en qué orden los quiero recorrer?”. Un `Map` responde “dado este nombre, ¿cuál es su estado?”. Un `Set` responde “¿ya vi este nombre?”. Las tres estructuras pueden contener datos relacionados, pero no hacen el mismo trabajo. Elegir una estructura por costumbre, en vez de por la pregunta que necesitas responder, suele producir código más lento de leer y más fácil de romper.

También aparece una dificultad que no se ve con un solo tipo. El `revisor` procesará arreglos de servicios, arreglos de estados y quizá arreglos de mensajes para el panel. Podrías escribir una función distinta para cada arreglo, pero terminarías copiando la misma lógica. Una función genérica permite describir la relación que se conserva aunque cambie el tipo de los elementos. No se trata de reemplazar todos los tipos por una letra misteriosa: se trata de decir con precisión que el resultado sigue siendo del mismo tipo que la entrada.

Por último, esta lección necesita hablar de fallas antes de que la lección 5 agregue operaciones asíncronas y consultas reales. Un programa puede fallar porque un servicio no respondió, porque la configuración tiene datos incoherentes o porque una función recibió algo que no esperaba. JavaScript permite lanzar casi cualquier valor con `throw`: una instancia de `Error`, una cadena, un número o incluso un objeto incompleto. TypeScript estricto parte de esa realidad y trata el valor de `catch` como `unknown`. Esa decisión puede parecer incómoda al principio, pero evita que el propio código de manejo de errores falle al intentar leer una propiedad que quizá no existe.

En Go, una función suele devolver un valor y un `error`, y quien llama decide si puede continuar. JavaScript y TypeScript también tienen excepciones: una operación puede interrumpir el flujo normal con `throw`, y otro bloque puede capturarla con `catch`. Ningún mecanismo es automáticamente mejor. La diferencia útil es decidir qué clase de falla representa cada uno. Una excepción sirve para un problema excepcional que atraviesa varias capas o para interoperar con una biblioteca que ya lanza errores. Un resultado tipado sirve cuando fallar es una posibilidad normal del dominio y quien llama debe tomar una decisión visible.

El reporte del `revisor` no debe depender de que una excepción invisible corte toda la corrida. Si pagos falla y catálogo responde, el reporte todavía necesita mostrar ambos hechos. Por eso el resultado de revisar cada servicio se modelará como una unión discriminada: éxito con un valor, o falla con un detalle. La excepción, si aparece en una capa inferior, se convierte en ese resultado antes de seguir. Así el resto del programa trabaja con datos explícitos y el panel puede mostrar un reporte completo.

Esta separación también evita una falsa promesa. TypeScript puede comprobar que una función que devuelve `Resultado<Estado>` entrega una de las dos alternativas declaradas. No puede garantizar que una URL exista ni que una respuesta HTTP describa correctamente la salud de un servicio. La validación de datos externos llegará en la lección 6. Aquí construirás las estructuras y los contratos internos que harán posible recibir, organizar y reportar esos datos sin confundir una ausencia con un éxito.

## Los conceptos

### Arreglos: una lista ordenada y tipada

Un arreglo de TypeScript usa la misma estructura que un arreglo de JavaScript. Conserva un orden de inserción, permite recorrer sus elementos y tiene una longitud accesible con `length`. La diferencia es que TypeScript puede describir qué clase de elementos pertenecen a la lista. `Servicio[]` significa “arreglo cuyos elementos son servicios”; no significa “un objeto que casualmente tiene algunas propiedades parecidas”.

El orden es una propiedad importante. Si la configuración lista catálogo, pagos e inventario en ese orden, el reporte puede respetar ese orden para que quien lo lea encuentre los resultados donde espera. Un arreglo es apropiado cuando quieres recorrer todos los elementos, conservar su secuencia o transformar cada uno con operaciones como `map`, `filter` y `find`.

```ts
// fig04_01.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDe(servicios: readonly Servicio[]): string {
  return servicios.map((servicio) => servicio.nombre).join(", ");
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

servicios.push({
  nombre: "inventario",
  url: "https://inventario.example",
  timeoutMs: 2000,
});

console.log(`cantidad: ${servicios.length}`);
console.log(nombresDe(servicios));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_01.ts
$ node fig04_01.js
cantidad: 3
catálogo, pagos, inventario
```

La anotación `Servicio[]` protege tanto la creación como los cambios posteriores. Si intentaras agregar una cadena, un objeto sin URL o un valor con `timeoutMs` de tipo cadena, el compilador señalaría el problema antes de ejecutar. Esto es especialmente útil porque `push` cambia el arreglo existente: no estás creando una lista nueva que pueda revisarse sólo en su literal inicial.

Fíjate en el parámetro de `nombresDe`: es `readonly Servicio[]`, no `Servicio[]`. La función sólo necesita leer la lista. Declarar el parámetro como de sólo lectura comunica esa intención y evita que, por accidente, la función haga `push`, `pop` o reasigne una posición. No congela el arreglo en tiempo de ejecución; como `readonly` en una propiedad, es una protección estática. La persona que posee la lista decide si puede modificarla; una función que sólo la consulta recibe una vista con menos permisos.

Dentro del `revisor`, el arreglo de servicios es la fuente de trabajo. La configuración tendrá una lista ordenada de `Servicio`, la lección 5 la recorrerá para iniciar consultas concurrentes y el reporte conservará una lista de `Estado` para que el panel tenga una representación fácil de mostrar. No conviertas esa lista en un `Map` sólo porque cada servicio tiene nombre: perderías la secuencia declarada y obligarías al código de presentación a decidir un orden posterior.

JavaScript admite posiciones inexistentes y permite leer más allá del final de un arreglo. `servicios[10]` produce `undefined` si sólo hay tres elementos. `strictNullChecks` hace que `null` y `undefined` sean alternativas explícitas cuando un contrato ya las declara, como ocurre con `find`, pero `strict` por sí solo no cambia el tipo de un acceso por índice: para TypeScript, `servicios[10]` sigue siendo `Servicio`. Si quieres que cada acceso por índice se trate como potencialmente ausente, activa `noUncheckedIndexedAccess`; entonces el tipo pasa a ser `Servicio | undefined` y debes comprobarlo antes de leer una propiedad. La figura 04_08 muestra el diagnóstico que produce esa opción. Antes de indexar una lista que vino de fuera, debes comprobar su longitud o usar una operación que comunique la ausencia, como `find`.

Para aislar las colecciones, las figuras 04_01, 04_02 y 04_04 simplifican deliberadamente el modelo final de la lección 3: `timeoutMs` es mutable y, en la figura 04_02, `Estado.servicio` es sólo el nombre como cadena. En el `revisor` ensamblado, `Servicio` conserva sus propiedades de configuración como sólo lectura y cada `Estado` conserva el `Servicio` completo; aquí la forma reducida permite concentrarse en la operación de cada colección.

También evita usar `forEach` por reflejo. `forEach` es útil para ejecutar un efecto por elemento, como imprimir una línea, pero no construye un resultado y no permite salir temprano de manera sencilla. `map` transforma todos los elementos en otro arreglo; `filter` conserva sólo los que cumplen una condición; `find` obtiene el primero o `undefined`. Elegir el método por el valor que produces hace más evidente qué pretende la función.

### `Map` y `Set`: consultas por llave y pertenencia sin duplicados

Un `Map<K, V>` asocia una llave de tipo `K` con un valor de tipo `V`. A diferencia de un objeto ordinario usado como diccionario, un `Map` expresa que su propósito es almacenar asociaciones dinámicas, ofrece métodos claros como `set`, `get`, `has` y `delete`, y puede usar llaves que no son cadenas. Para el `revisor`, la llave natural será el nombre del servicio y el valor será su estado.

`Map#get` devuelve `V | undefined`, aun cuando el tipo del valor no admita `undefined`. La razón es correcta: la llave puede no existir. No ignores esa unión. Un estado ausente significa algo distinto a un estado disponible, y el compilador te obliga a resolver la diferencia antes de usar propiedades del resultado.

```ts
// fig04_02.ts
type Estado = {
  readonly servicio: string;
  readonly tipo: "disponible" | "falla";
};

const estados = new Map<string, Estado>();
estados.set("catálogo", { servicio: "catálogo", tipo: "disponible" });
estados.set("pagos", { servicio: "pagos", tipo: "falla" });

const nombres = new Set<string>(["catálogo", "pagos", "catálogo"]);

console.log(`estados: ${estados.size}`);
console.log(`catálogo existe: ${estados.has("catálogo")}`);
console.log(`inventario: ${estados.get("inventario") ?? "sin resultado"}`);
console.log(`nombres únicos: ${[...nombres].join(", ")}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_02.ts
$ node fig04_02.js
estados: 2
catálogo existe: true
inventario: sin resultado
nombres únicos: catálogo, pagos
```

El operador `??` significa “usa el valor de la derecha sólo si el de la izquierda es `null` o `undefined`”. Aquí no pregunta si el estado es verdadero o falso; pregunta si no existe. Es mejor que `||` cuando un valor válido puede ser `0`, `false` o una cadena vacía. Aunque los estados del ejemplo son objetos y por ello siempre son valores verdaderos, conviene aprender la distinción desde ahora.

Un `Set<T>` guarda valores sin repetirlos. Al agregar por segunda vez una cadena igual, el conjunto conserva una sola entrada. Esto no ordena los elementos alfabéticamente ni convierte mayúsculas en minúsculas: `"Pagos"` y `"pagos"` son cadenas distintas. Si el dominio considera iguales esos nombres, debes normalizarlos deliberadamente antes de agregarlos. La estructura no puede adivinar las reglas del negocio.

Dentro del `revisor`, un `Set<string>` es útil para validar que la configuración no repite nombres. El arreglo conserva la lista original y un `Set` se usa como apoyo durante la revisión. Si cada nombre se agrega y el tamaño del conjunto no aumenta, encontraste un duplicado. Un `Map<string, Estado>` será útil después de producir el reporte si quieres obtener un estado por nombre sin recorrer toda la lista.

No uses un `Map` como sustituto universal de un arreglo. El orden de inserción de `Map` está definido, pero eso no significa que deba controlar la presentación de un reporte. Tampoco uses un objeto con firmas como `{ [nombre: string]: Estado }` sólo para evitar aprender `Map`. Un objeto simple es excelente cuando conoces sus propiedades de antemano; un `Map` es más claro cuando las llaves aparecen dinámicamente durante la operación.

### Genéricos: conservar información de tipo al reutilizar una función

Una función genérica usa un parámetro de tipo, por convención `T`, para expresar una relación entre partes de su firma. No es un valor disponible mientras Node ejecuta el programa; igual que todos los tipos de TypeScript, se borra al compilar. Su trabajo consiste en permitir que el compilador siga la pista del tipo concreto que llega a una función y lo conserve en el resultado.

Sin un genérico, una función que obtiene el primer elemento de una lista podría recibir `unknown[]` y devolver `unknown`. Eso obliga a quien la llama a inspeccionar el resultado otra vez, aunque el compilador ya sabía que la lista contenía `Servicio`. Si escribes la función para recibir `Servicio[]`, pierdes la posibilidad de reutilizarla con `Estado[]` u otra lista. El genérico une ambas necesidades: funciona con varios tipos y conserva cuál fue el tipo elegido en cada llamada.

```ts
// fig04_03.ts
function primero<T>(valores: readonly T[]): T | undefined {
  return valores[0];
}

const puertos = [443, 8080];
const servicios = ["catálogo", "pagos"];

const primerPuerto = primero(puertos);
const primerServicio = primero(servicios);

console.log(`puerto: ${primerPuerto ?? "ninguno"}`);
console.log(`servicio: ${primerServicio ?? "ninguno"}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_03.ts
$ node fig04_03.js
puerto: 443
servicio: catálogo
```

`T` no significa “cualquier cosa sin reglas”. Significa “un tipo todavía no decidido, pero consistente dentro de esta llamada”. En la primera llamada, TypeScript infiere `T` como `number`; por ello `primerPuerto` es `number | undefined`. En la segunda, infiere `string`; por ello `primerServicio` es `string | undefined`. El `undefined` permanece porque un arreglo vacío no tiene primer elemento, sin importar el tipo de sus elementos.

Los genéricos también pueden tener restricciones. Si una función necesita acceder a `nombre`, no basta escribir `<T>`, porque no todos los valores tienen esa propiedad. Puedes escribir `T extends { nombre: string }` para declarar la capacidad mínima requerida. La restricción no obliga a los valores a ser exactamente ese objeto; permite objetos que tengan al menos esa propiedad. Esto aprovecha el tipado estructural que viste en la lección 3.

Dentro del `revisor`, una función genérica será útil para no duplicar infraestructura. Por ejemplo, el reporte podrá agrupar estados, buscar el primer elemento de una lista o encapsular un resultado exitoso sin perder el tipo del valor. No conviertas una función en genérica sólo porque puedes hacerlo. Si la operación está diseñada exclusivamente para `Servicio`, usar `Servicio` en la firma comunica mejor el dominio. El genérico vale cuando la lógica de verdad funciona igual para varios tipos y la relación de tipos importa para quien recibe el resultado.

En Go, una función genérica también declara parámetros de tipo, aunque la sintaxis y algunas reglas son distintas. La idea útil en ambos lenguajes es la misma: no escribes una función genérica para evitar pensar en sus contratos, sino para expresar que un contrato se repite sin degradar todos sus valores a una forma demasiado amplia.

### Tipos utilitarios: derivar contratos del modelo

Un tipo utilitario toma un tipo existente y produce otro tipo durante la compilación. No cambia objetos en tiempo de ejecución. `Pick`, `Omit`, `Readonly` y `Record` son herramientas incluidas por TypeScript para expresar relaciones frecuentes sin copiar manualmente todas las propiedades de un modelo.

Copiar tipos parece inofensivo cuando un `Servicio` tiene tres propiedades. El problema llega al cambiar el modelo. Si agregas `reintentos` a `Servicio` y existen tres copias parciales escritas a mano, esas copias pueden quedar desactualizadas de maneras diferentes. Derivar el contrato deja claro que depende del original y permite que el compilador señale cambios que ahora requieren una decisión.

```ts
// fig04_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type ServicioPublico = Omit<Servicio, "url">;
type CambioTimeout = Pick<Servicio, "timeoutMs">;
type ServiciosPorNombre = Record<string, ServicioPublico>;

const cambio: CambioTimeout = { timeoutMs: 2500 };
const visibles: ServiciosPorNombre = {
  catálogo: { nombre: "catálogo", timeoutMs: cambio.timeoutMs },
  pagos: { nombre: "pagos", timeoutMs: 3000 },
};

console.log(visibles.catálogo.nombre);
console.log(visibles.pagos.timeoutMs);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_04.ts
$ node fig04_04.js
catálogo
3000
```

`Pick<Servicio, "timeoutMs">` conserva sólo las propiedades seleccionadas. Es adecuado para un cambio que debe traer exclusivamente el dato que puede modificarse. `Omit<Servicio, "url">` crea una vista sin URL, útil si el panel necesita mostrar servicios pero no debe recibir esa propiedad. Esto no es una medida de seguridad por sí sola: el objeto de tiempo de ejecución todavía puede contener una URL si lo envías sin transformarlo. El tipo evita que el código TypeScript la use dentro de ese contrato; la capa que construye la respuesta debe decidir qué datos serializa.

`Readonly<T>` vuelve de sólo lectura las propiedades de primer nivel de `T`. Úsalo cuando una función recibe una configuración que no debe cambiar. No es profundo: si una propiedad contiene otro objeto, las propiedades internas siguen siendo modificables salvo que las declares también como `readonly` o uses un tipo diseñado para ello. Tampoco llama `Object.freeze`; no cambia el comportamiento de JavaScript.

`Record<K, V>` describe un objeto cuyas claves son `K` y cuyos valores son `V`. Es especialmente útil para representar una estructura serializable que ya tiene llaves conocidas por tipo, o una tabla que enviarás como JSON. Para una colección dinámica que administrarás con métodos como `has` y `delete`, `Map` suele comunicar mejor la intención. La diferencia no es de rendimiento automático sino de operaciones y significado.

Dentro del `revisor`, `Omit<Servicio, "url">` puede definir la vista segura que llegará al panel, `Pick` puede representar una actualización limitada de timeout y `Record<string, Estado>` puede servir como una forma de reporte indexada por nombre cuando el contrato HTTP realmente necesite un objeto JSON. El modelo central sigue siendo `Servicio`; los tipos utilitarios son vistas derivadas para casos concretos, no sustitutos anónimos que oculten el dominio.

### Errores: excepción para interrumpir, resultado para continuar

Una excepción cambia el flujo normal. Cuando una función ejecuta `throw`, JavaScript busca el `catch` más cercano que pueda manejarla. Si no encuentra uno, el programa termina con un error. Este mecanismo es útil para errores que no pueden resolverse localmente o para APIs que ya informan fallas mediante excepciones.

El problema aparece cuando la falla es una alternativa esperada de la operación. El `revisor` necesita informar que pagos falló; no necesita abandonar el reporte entero. Si `revisarServicio` lanza una excepción por cada servicio inaccesible y nadie la transforma, el primer problema puede impedir que conozcas el estado de los demás. Para resultados esperados, una unión discriminada mantiene la decisión en el flujo normal del programa.

```ts
// fig04_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function dividir(dividendo: number, divisor: number): Resultado<number> {
  if (divisor === 0) {
    return { ok: false, detalle: "el divisor no puede ser cero" };
  }

  return { ok: true, valor: dividendo / divisor };
}

function mostrar(resultado: Resultado<number>): string {
  if (resultado.ok) {
    return `resultado: ${resultado.valor}`;
  }

  return `falla: ${resultado.detalle}`;
}

console.log(mostrar(dividir(12, 3)));
console.log(mostrar(dividir(12, 0)));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_05.ts
$ node fig04_05.js
resultado: 4
falla: el divisor no puede ser cero
```

La propiedad `ok` es el discriminante. Cuando TypeScript ve `if (resultado.ok)`, sabe que dentro de esa rama existe `valor`; en la otra rama sabe que existe `detalle`. No necesitas escribir propiedades opcionales como `valor?: T` y `detalle?: string`, porque esas propiedades opcionales permitirían estados ambiguos: ambos datos presentes o ambos ausentes.

En el `revisor`, `Resultado<Estado>` puede representar el resultado interno de una consulta antes de integrarlo al reporte. Si una biblioteca lanza una excepción de red, una capa cercana a la operación puede atraparla, convertirla en `{ ok: false, detalle }` y permitir que la corrida siga. La lección 5 añadirá promesas y operaciones concurrentes; la idea importante ya está lista: una falla por servicio debe ser información del reporte, no necesariamente el final del proceso.

No conviertas todos los errores en resultados ni todas las alternativas en excepciones. Una configuración inválida al arrancar puede ser una razón correcta para detener el programa, porque no hay una corrida confiable que continuar. La falta de respuesta de uno entre diez servicios, en cambio, es exactamente una de las cosas que el reporte debe mostrar. La pregunta no es “¿qué mecanismo se ve más moderno?”, sino “¿quién puede recuperarse y qué información debe recibir?”.

### `unknown` en `catch`: inspeccionar antes de confiar

JavaScript permite lanzar cualquier valor. Aunque la convención sana es lanzar instancias de `Error`, código ajeno puede hacer `throw "sin red"`, `throw 503` o `throw { mensaje: "falló" }`. Por eso, con `strict`, TypeScript trata la variable de `catch` como `unknown`: todavía no tienes evidencia de que sea un `Error` ni de que tenga una propiedad `message`.

La solución no es cambiar el tipo a `any`. `any` desactiva las comprobaciones justo donde los datos son menos confiables. La solución es reducir `unknown` con una comprobación que se ejecuta de verdad. `error instanceof Error` comprueba que el valor pertenece a la jerarquía de `Error`; después de esa condición, TypeScript permite leer `message`.

```ts
// fig04_06.ts
function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "falla sin detalle legible";
}

try {
  throw new Error("tiempo límite agotado");
} catch (error) {
  console.log(textoError(error));
}

try {
  throw "servicio no alcanzable";
} catch (error) {
  console.log(textoError(error));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_06.ts
$ node fig04_06.js
tiempo límite agotado
servicio no alcanzable
```

La función `textoError` concentra una política pequeña pero importante: qué texto se mostrará cuando una capa inferior lance algo. El caso final no intenta serializar arbitrariamente un objeto ni revela detalles potencialmente sensibles. En una aplicación real quizá guardarías más contexto en una bitácora interna, pero el mensaje que llega al reporte o al panel debe ser deliberado.

Dentro del `revisor`, las consultas de red de la siguiente lección usarán esta conversión cerca del `try/catch`. El resultado hacia el resto del programa será un `EstadoFalla` con un detalle seguro. Esto reduce el número de lugares que necesitan entender excepciones y evita que React, la API y la lógica de reporte implementen tres versiones distintas de la misma inspección.

## El error que vas a ver

Con TypeScript 7.0.2 y `strict`, acceder a `message` sin comprobar el valor capturado produce TS18046. El error no dice que las excepciones sean inválidas. Dice que el compilador no puede probar que el valor capturado tenga una propiedad `message`, porque JavaScript permite lanzar cualquier valor.

```ts
// fig04_07.ts
function mensaje(error: unknown): string {
  return error.message;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig04_07.ts
fig04_07.ts(3,10): error TS18046: 'error' is of type 'unknown'.
```

La corrección no es una aserción como `error as Error`. Una aserción sólo obliga al compilador a confiar; no comprueba nada mientras el programa corre. Si alguien lanzó una cadena, el acceso posterior puede producir `undefined` o fallar de otra manera. Usa una comprobación como `error instanceof Error` antes de leer `message`, tal como en la figura 04_06.

También es normal encontrar TS2322 al intentar guardar un valor de tipo incorrecto en un arreglo o `Map` tipado. Por ejemplo, si un `Map<string, Estado>` espera un `Estado` cuya propiedad `tipo` sólo puede ser `"disponible" | "falla"`, la cadena `"correcto"` no es compatible aunque parezca expresar una idea parecida. El diagnóstico significa que el vocabulario del programa está definido en un tipo literal y la nueva cadena no pertenece a él. Corrige el valor para usar el literal acordado o, si el dominio realmente ganó un estado nuevo, modifica la unión y atiende el nuevo caso en todas las funciones que la usan.

Cuando un `Map#get` devuelve un valor que puede ser `undefined`, el diagnóstico habitual no es una molestia del compilador sino una señal de diseño. Una llave ausente es un caso posible. Decide qué debe pasar: devolver un resultado de falla, usar un valor predeterminado explícito, detener una operación o comprobar `has` antes de leer. No uses `!` para borrar el `undefined` salvo que puedas demostrar localmente que la llave existe y la prueba esté junto al acceso.

Si activaste `noUncheckedIndexedAccess` en el proyecto, el compilador aplica la misma precaución a un acceso por índice. Esta opción no pertenece a `strict`: agrégala explícitamente al `tsconfig.json` cuando el proyecto indexa arreglos o tablas con índices que no puede demostrar válidos. El resultado es una comprobación adicional que evita tratar como existente un elemento que JavaScript puede devolver como `undefined`.

```ts
// fig04_08.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

const servicios: Servicio[] = [];
const nombre = servicios[10].nombre;

console.log(nombre);
```

```bash
$ npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts
fig04_08.ts(9,16): error TS2532: Object is possibly 'undefined'.
```

Con el mismo archivo y sólo `strict`, TypeScript acepta el acceso porque el índice conserva el tipo `Servicio`; al sumar `noUncheckedIndexedAccess`, exige atender `undefined`. No uses esta opción como reemplazo de validar datos externos: sólo mejora el contrato estático de accesos a colecciones que ya existen en memoria.

## Lo que se hace mal

Usar `any[]` para “hacer que la lista acepte todo” elimina el contrato justo cuando la colección mezcla datos de distintos lugares. Una lista de servicios no debe aceptar números, cadenas ni objetos parcialmente formados. Si hay un punto donde todavía no conoces los elementos, usa `unknown[]` y valida cada uno en la frontera; si el programa ya conoce el contrato, usa `Servicio[]`.

Copiar la definición de `Servicio` para crear una vista del panel parece más rápido que usar `Pick` u `Omit`, pero crea contratos que se separan con el tiempo. El problema no es sólo el texto repetido: el modelo central puede cambiar y las copias pueden conservar una versión vieja sin que el compilador relacione ambas cosas. Deriva una vista cuando su relación con el modelo sea real y usa un tipo nuevo con nombre cuando represente un concepto diferente.

Usar un `Set` para construir el reporte es otro error frecuente. Un conjunto responde si algo pertenece o no pertenece; no conserva el estado asociado a cada servicio. Si necesitas consultar “¿qué estado tuvo pagos?”, necesitas un `Map` o un arreglo de estados con una búsqueda. Si necesitas conservar el orden de visualización, conserva también una lista ordenada.

Lanzar excepciones para el resultado esperado de cada servicio hace que el control de flujo sea difícil de seguir. Quien llama necesita adivinar qué operaciones pueden lanzar, qué errores capturar y cuáles dejar pasar. Para una falla que debe aparecer en el reporte, devuelve una alternativa de resultado o conviértela a `EstadoFalla` cerca de la operación que falló.

Capturar una excepción y escribir `catch (error) { return error.message; }` supone una garantía que JavaScript no ofrece. Es especialmente peligroso porque el código de recuperación puede fallar y esconder la causa original. Trata el valor como `unknown`, comprueba su forma y conserva un mensaje de respaldo para valores no reconocidos.

Finalmente, no uses `as` ni el operador `!` para silenciar un tipo que no te gusta. `map.get(nombre)!` afirma que el resultado existe, pero no crea una entrada en el mapa. `valor as Estado` afirma que un valor cumple el modelo, pero no valida JSON ni una respuesta HTTP. Estas herramientas tienen usos puntuales cuando ya existe evidencia que el compilador no puede inferir; no sustituyen una comprobación ni una decisión de diseño.

## Ejercicios

### Ejercicio 1 — Detectar nombres repetidos

Escribe una función `nombresDuplicados(servicios: readonly Servicio[]): string[]`. Debe recorrer la lista, detectar nombres que aparezcan más de una vez y devolver cada nombre duplicado una sola vez. Usa un `Set` para los nombres vistos y otro para los duplicados. Prueba la función con catálogo, pagos, catálogo e inventario; la salida debe contener solamente `catálogo`.

### Ejercicio 2 — Encontrar un servicio por nombre

Escribe `buscarServicio(servicios: readonly Servicio[], nombre: string): Servicio | undefined`. Debe devolver el servicio cuyo nombre coincida exactamente o `undefined` si no existe. Después escribe una línea que muestre la URL encontrada o el texto `servicio no configurado`. No uses una aserción de tipo para eliminar el caso `undefined`.

### Ejercicio 3 — Convertir un arreglo en un índice

Escribe una función genérica `porClave<T extends { nombre: string }>(valores: readonly T[]): Map<string, T>`. Debe crear un `Map` cuya llave sea `nombre` y cuyo valor sea el objeto original. Pruébala tanto con un arreglo de `Servicio` como con un arreglo de objetos que tengan `nombre` y otra propiedad distinta.

### Ejercicio 4 — Convertir una excepción en un resultado

Define `Resultado<T>` con las alternativas `ok: true` y `ok: false`. Escribe `ejecutar<T>(operacion: () => T): Resultado<T>` para ejecutar una operación síncrona. Si la operación devuelve un valor, debe producir éxito; si lanza cualquier valor, debe devolver una falla con un detalle obtenido de una función que reciba `unknown`. Prueba una operación que devuelva `200` y otra que lance `new Error("sin conexión")`.

## Soluciones

### Solución 1

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function nombresDuplicados(servicios: readonly Servicio[]): string[] {
  const vistos = new Set<string>();
  const duplicados = new Set<string>();

  for (const servicio of servicios) {
    if (vistos.has(servicio.nombre)) {
      duplicados.add(servicio.nombre);
    }

    vistos.add(servicio.nombre);
  }

  return [...duplicados];
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "inventario", url: "https://inventario.example", timeoutMs: 2000 },
];

console.log(nombresDuplicados(servicios).join(", "));
```

La función separa dos preguntas. `vistos` responde si el nombre ya apareció; `duplicados` evita agregarlo varias veces al resultado. Si hubiera tres entradas llamadas catálogo, el resultado seguiría siendo una sola cadena.

### Solución 2

```ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

function buscarServicio(
  servicios: readonly Servicio[],
  nombre: string,
): Servicio | undefined {
  return servicios.find((servicio) => servicio.nombre === nombre);
}

const servicios: Servicio[] = [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
];

const encontrado = buscarServicio(servicios, "pagos");
console.log(encontrado?.url ?? "servicio no configurado");
```

`find` expresa exactamente el contrato: puede encontrar un elemento o no encontrar ninguno. El encadenamiento opcional `?.` evita leer `url` cuando `encontrado` es `undefined`; `??` proporciona el texto de respaldo.

### Solución 3

```ts
function porClave<T extends { nombre: string }>(
  valores: readonly T[],
): Map<string, T> {
  const indice = new Map<string, T>();

  for (const valor of valores) {
    indice.set(valor.nombre, valor);
  }

  return indice;
}

const servicios = porClave([
  { nombre: "catálogo", timeoutMs: 1500 },
  { nombre: "pagos", timeoutMs: 3000 },
]);

const equipos = porClave([
  { nombre: "operación", turno: "mañana" },
  { nombre: "soporte", turno: "tarde" },
]);

console.log(servicios.get("pagos")?.timeoutMs);
console.log(equipos.get("soporte")?.turno);
```

La restricción exige la propiedad necesaria para formar la llave, pero conserva todas las demás propiedades. Por ello, el primer `Map` conserva `timeoutMs` y el segundo conserva `turno`.

### Solución 4

```ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function textoError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "falla sin detalle legible";
}

function ejecutar<T>(operacion: () => T): Resultado<T> {
  try {
    return { ok: true, valor: operacion() };
  } catch (error) {
    return { ok: false, detalle: textoError(error) };
  }
}

console.log(ejecutar(() => 200));
console.log(ejecutar(() => {
  throw new Error("sin conexión");
}));
```

La función genérica conserva el tipo que devuelve la operación. Si la operación produce un número, el resultado exitoso contiene un número; si produjera un `Estado`, contendría un `Estado`. La excepción no sale de `ejecutar`: se transforma en una alternativa explícita que quien llama puede mostrar o combinar con otros resultados.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Al ejecutar `npx tsc --strict --target ES2022 --module nodenext fig04_01.ts` y `node fig04_01.js`, aparece una cantidad de tres servicios y los nombres en el orden catálogo, pagos e inventario.
- [ ] Al ejecutar `npx tsc --strict --target ES2022 --module nodenext fig04_02.ts` y `node fig04_02.js`, el conjunto imprime dos nombres únicos aunque se intentó agregar catálogo dos veces.
- [ ] Al ejecutar `npx tsc --strict --target ES2022 --module nodenext fig04_05.ts` y `node fig04_05.js`, aparecen tanto `resultado: 4` como `falla: el divisor no puede ser cero`.
- [ ] Al ejecutar `npx tsc --strict --target ES2022 --module nodenext fig04_07.ts`, aparece TS18046 en la línea que intenta leer `message` desde `unknown`.
- [ ] Al ejecutar `npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts`, aparece TS2532 al leer una propiedad del elemento indexado sin comprobar `undefined`.

## Para leer más

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — documentación oficial sobre parámetros de tipo, inferencia y restricciones; consultado el 2 de octubre de 2026.
- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — documentación oficial de `Pick`, `Omit`, `Readonly`, `Record` y otros tipos utilitarios; consultado el 2 de octubre de 2026.
- [TSConfig: useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) — documentación oficial sobre el uso de `unknown` en variables de `catch`; consultado el 2 de octubre de 2026.
- [TSConfig: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) — documentación oficial de la comprobación adicional para accesos indexados; consultado el 2 de octubre de 2026.
