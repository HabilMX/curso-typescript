# Lección 2 — Tipos, funciones e inferencia

**Tiempo:** 90 min (o 2 × 45)

**Qué construyes:** las funciones base del `revisor`

**Qué aprendes:** primitivos, inferencia, uniones y literales, *narrowing*, `null`/`undefined` con `strictNullChecks`

## Al terminar vas a poder

- Declarar valores `string`, `number` y `boolean`, y explicar cuándo TypeScript puede inferir su tipo.
- Escribir funciones con parámetros y retornos tipados para separar reglas del `revisor`.
- Modelar valores que pueden tener más de una forma mediante uniones y literales.
- Reducir una unión con `typeof`, comparaciones y comprobaciones explícitas antes de usar un valor.
- Diferenciar `null` de `undefined` y manejar ambos sin desactivar `strictNullChecks`.
- Leer y corregir los diagnósticos TS2345, TS2322, TS18048 y TS2339.
- Compilar y ejecutar funciones deterministas del `revisor` con `strict`.

## El porqué antes del cómo

El `revisor` terminará consultando varios servicios, reuniendo resultados y mostrándolos en una API y en un panel web. Antes de llegar a HTTP, promesas o React, necesita una capa pequeña pero importante: funciones que transformen datos simples en decisiones legibles. Recibirán un nombre, una duración, un código HTTP o un detalle de falla, y devolverán una clasificación o una línea de reporte.

En JavaScript podrías escribir esas funciones sin describir ningún tipo. El programa ejecutaría una llamada como `clasificarDuracion("rápido")` hasta que intentara comparar el texto con un número. El error aparecería durante la ejecución, quizá lejos de la línea donde se pasó el argumento incorrecto. Si la rama que contiene el problema no se ejecuta durante una prueba manual, el error puede quedarse oculto hasta que un dato real lo active.

TypeScript cambia el momento en que recibes esa información. Una función puede declarar que espera un número de milisegundos y devuelve una cadena. El compilador entonces revisa cada llamada conocida: si alguien le pasa texto, marca la contradicción antes de emitir el JavaScript. El tipo no hace que la regla de negocio sea automáticamente correcta; todavía tienes que decidir si 500 ms es rápido o lento. Lo que hace es asegurar que la regla reciba la clase de dato para la que fue escrita.

Esta diferencia parece pequeña cuando hay una sola función y dos valores. Se vuelve decisiva cuando el programa crece. Una función con un nombre claro y una firma precisa es una frontera: quien la llama sabe qué debe entregar, quien la mantiene sabe qué puede asumir dentro, y el compilador revisa que ambas partes coincidan. En Go, los parámetros y retornos también forman parte de la firma. TypeScript conserva esa disciplina, aunque sus tipos se borren antes de que Node ejecute el archivo.

La lección anterior dejó el entorno listo y mostró que TypeScript emite JavaScript. Esta lección empieza a usar esa comprobación de manera útil. No vas a anotar un tipo en cada carácter ni a convertir el código en una pared de sintaxis. Vas a dejar que el compilador infiera lo obvio y a escribir contratos donde la intención necesita quedar visible: límites de una función, alternativas posibles y ausencias que el programa debe atender.

El primer riesgo del `revisor` no es una red lenta; es perder significado. Un texto como `"200"` puede parecer un código HTTP, pero sigue siendo texto. Un valor `undefined` puede significar que nadie proporcionó un detalle, que una propiedad no existe o que una función no devolvió nada. Un valor `"disponible"` parece una cadena ordinaria hasta que lo conviertes en parte de un conjunto cerrado de estados. Los tipos sirven para conservar esos significados mientras los valores pasan de una función a otra.

No necesitas aprender cada tipo de TypeScript hoy. De hecho, intentar memorizar todos antes de escribir funciones produce una idea equivocada: que programar con tipos consiste en llenar formularios sintácticos. El orden útil es otro. Primero identificas qué valores tiene el problema. Después defines qué entra y qué sale de una operación. Por último, haces explícitas las dudas que todavía no se pueden resolver con un solo tipo.

El `revisor` usará objetos `Servicio` y `Estado` en la siguiente lección. Aquí todavía no conviene adelantar ese modelo completo. Trabajarás con sus componentes: el nombre de un servicio, una duración, un código y un detalle. Así puedes aprender qué significa una firma sin mezclarla con propiedades, interfaces o uniones discriminadas. Cuando aparezcan esos tipos compuestos, reconocerás que están hechos de las mismas piezas que practicas hoy.

## Los conceptos

### Primitivos, anotaciones e inferencia

Los valores más frecuentes del `revisor` empiezan como primitivos de JavaScript. Un nombre o una URL son `string`; un límite o duración son `number`; una decisión de sí o no es `boolean`. Escribe los nombres en minúsculas: `string`, `number` y `boolean`. `String`, `Number` y `Boolean` existen como constructores y tipos de objetos envolventes, pero no son la forma habitual de anotar valores comunes.

JavaScript no distingue entre entero y decimal como lo hace Go. En TypeScript, `443`, `1500` y `42.5` son `number`. Esa decisión viene del modelo numérico de JavaScript: un código HTTP, un puerto y una duración pueden compartir el tipo básico aunque tengan significados diferentes. Más adelante, nombres claros, objetos y validaciones ayudarán a conservar el contexto. Por ahora, no declares un supuesto `int`: no existe como tipo primitivo de TypeScript.

Una anotación va después del nombre: `const timeoutMs: number = 1500`. No es obligatorio escribirla cuando el valor inicial ya expresa el tipo. En `const timeoutMs = 1500`, TypeScript infiere que el valor es un número. La inferencia no es una adivinanza que ocurra sólo en el editor; forma parte de la revisión del programa. El compilador observa el inicializador y conserva la información suficiente para comprobar usos posteriores.

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

La anotación de `timeoutMs` es válida, pero la línea también habría compilado sin `: number`. No escribas anotaciones repetitivas sólo porque existen. Si el valor y el nombre dejan clara la intención, la inferencia reduce ruido sin perder seguridad. En cambio, una anotación es especialmente útil en una firma pública, en un retorno que quieres mantener estable o donde el valor inicial no comunica el contrato completo.

`const` y `let` se relacionan con si una variable puede reasignarse, no con si TypeScript revisa tipos. Usa `const` por omisión cuando el nombre seguirá apuntando al mismo valor. Usa `let` cuando la variable deba recibir otro valor más adelante. Evita `var`: tiene reglas de alcance antiguas y hace más difícil seguir dónde puede cambiar un valor.

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

En el `revisor`, las configuraciones que no cambian durante una corrida normalmente se expresarán con `const`. Una duración calculada, un código HTTP recibido o un contador local podrían usar `let` si la lógica necesita actualizarlos. La pregunta no es “¿cuál palabra uso más?”, sino “¿debe este nombre apuntar a otro valor?”. Elegir `const` cuando puedes reduce rutas de cambio posibles y hace más fácil leer una función.

La inferencia también tiene límites sanos. Si declaras `let estado = "pendiente"`, TypeScript suele inferir `string`, no sólo el literal `"pendiente"`, porque `let` permite reasignar. Si declaras `const estado = "pendiente"`, el valor no cambia y puede conservar una información más específica. Esta diferencia será útil al modelar literales. No fuerces la precisión en cada variable local; úsala cuando el conjunto de alternativas tenga significado para el dominio.

Dentro del `revisor`, no necesitas declarar una variable separada para cada dato si sólo se usa una vez. Una función puede recibir un valor y devolver otro de inmediato. Declara nombres cuando ayuden a leer la regla, no para simular que cada paso requiere almacenamiento. Un nombre como `limiteRapidoMs` explica una decisión; un nombre como `x` obliga a buscar su origen cada vez.

### Funciones: contratos que entran y salen

Una función recibe valores, ejecuta una regla y puede devolver un resultado. En JavaScript, esa estructura ya existe. TypeScript agrega la posibilidad de describir sus parámetros y su retorno. La firma `function clasificarDuracion(duracionMs: number): string` dice tres cosas: la función se llama `clasificarDuracion`, espera un número y produce una cadena.

Los tipos de parámetros son contratos con las llamadas. Dentro de la función, `duracionMs` se puede usar como número. Fuera de ella, una llamada debe proporcionar un número. El tipo de retorno es un contrato en la otra dirección: quien llama puede tratar el resultado como una cadena. Esta información permite al editor ofrecer operaciones adecuadas y al compilador encontrar incompatibilidades antes de ejecutar.

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

El retorno `: number` en este ejemplo podría inferirse porque `valor * 2` produce un número. Aun así, es razonable escribir el retorno en funciones que representan reglas del programa. La firma se vuelve una lectura rápida de la intención y evita que una edición posterior cambie accidentalmente lo que la función promete devolver. No es una obligación absoluta: en funciones locales muy cortas, dejar que TypeScript infiera el retorno puede ser más claro.

Una función que sólo realiza un efecto, por ejemplo imprimir una línea, puede declarar retorno `void`. `void` no significa exactamente que no exista un valor de JavaScript; significa que la persona que llama no debe depender de un resultado útil. En el `revisor`, conviene separar las funciones que calculan texto de las que lo imprimen. La primera se puede probar con entradas y salidas precisas; la segunda se limita a presentar ese resultado.

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

La decisión de que 500 ms sea el límite no viene del tipo. Es una regla de este ejemplo. TypeScript verifica que la comparación recibe un número y que los caminos devuelven cadenas; no puede decidir por ti qué umbral representa un servicio aceptable. Esta frontera es importante: los tipos protegen la forma de una decisión, mientras que pruebas, observación y requisitos definen si la decisión es la correcta.

Una firma con varios parámetros puede ser apropiada mientras los valores sean pocos y tengan significados distintos. `formatearLinea(nombre, duracionMs)` es fácil de leer. Cuando los parámetros empiezan a ser numerosos, opcionales o fáciles de intercambiar, un objeto con nombres de propiedades será mejor. Esa transición llega en la siguiente lección con `Servicio`. No te adelantes creando objetos anónimos para una función que sólo necesita un número y un texto.

Las funciones también ayudan a evitar duplicación. Si cada parte del programa decide por su cuenta qué duración es rápida, tarde o temprano aparecerán límites distintos. Centralizar la regla en `clasificarDuracion` no hace al programa mágico, pero deja una sola decisión que revisar cuando cambie el criterio. El panel, la API y las pruebas podrán usar la misma función o una regla equivalente bien definida.

En Go, la firma de una función exige tipos explícitos para parámetros y retornos. TypeScript es más flexible porque puede inferir parte de esa información, pero no pierdes nada al usar tipos en los límites importantes. La diferencia útil es que TypeScript trabaja sobre los valores de JavaScript y permite uniones muy expresivas; la disciplina sigue siendo la misma: una función pequeña debe decir qué necesita y qué garantiza.

### Uniones y literales: representar alternativas reales

Una unión expresa que un valor puede pertenecer a una de varias alternativas. Se escribe con `|`: `string | number` significa “una cadena o un número”. No significa “ambos a la vez”, ni significa que puedas usar libremente todas las operaciones de ambos tipos. Significa que, antes de usar una operación exclusiva de una alternativa, tendrás que saber cuál tienes.

Los literales permiten ser más preciso que un tipo amplio. `"disponible"` es una cadena concreta; `"disponible" | "falla"` es un conjunto cerrado de dos cadenas concretas. Esta precisión es útil cuando un texto no es un mensaje cualquiera, sino una categoría del dominio. El estado de una revisión no debería aceptar `"tal vez"` por accidente si el programa sólo entiende disponible o falla.

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

El nombre `Prioridad` no crea un valor durante la ejecución; es un alias de tipo. JavaScript emitido sólo conserva la función, las comparaciones y las cadenas. Aun así, durante la compilación evita una llamada como `etiquetaPrioridad("crítica")` hasta que decidas explícitamente incorporar esa alternativa al contrato.

Los literales no son una decoración para cada texto. Si una variable guarda un mensaje libre escrito por una persona, normalmente debe ser `string`. Si guarda un valor de control que modifica la lógica, un literal o una unión de literales hace visibles las opciones permitidas. La pregunta útil es: “¿acepto cualquier texto, o sólo categorías conocidas?”.

Dentro del `revisor`, una clasificación inicial puede ser una unión de literales antes de convertirse en el modelo más completo de `Estado`. La función siguiente recibe un código HTTP y produce una categoría limitada. No pretende reemplazar todas las reglas HTTP; sólo deja claro que el reporte inicial distingue dos resultados observables.

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

El rango elegido es una simplificación deliberada para esta etapa. Más adelante el `revisor` necesitará distinguir fallas de red, tiempos agotados, códigos no exitosos y respuestas válidas. La ganancia actual es aprender a expresar que una función no devuelve una cadena arbitraria. Sus posibles salidas están nombradas y son finitas.

No confundas una unión con una lista de valores que el programa debe recorrer. `string | number` describe una posibilidad de tipo; no crea un arreglo. Tampoco es una invitación a convertir todo en uniones. Si una función siempre recibe un número, declarar `number | string` sólo para aceptar más casos la vuelve más difícil de usar. Amplía un contrato cuando la realidad del dominio exige alternativas, no para evitar decidir qué dato debe llegar.

### *Narrowing*: usar una alternativa sólo después de comprobarla

Cuando una función recibe una unión, TypeScript debe ser conservador. Si recibe `string | number`, puede aplicar operaciones que ambas alternativas compartan, pero no `toUpperCase`, porque los números no tienen ese método. La solución no es una aserción ni `any`: es comprobar el valor con una condición que también sería necesaria en JavaScript.

La reducción de tipo, o *narrowing*, ocurre cuando TypeScript entiende que una rama elimina alternativas. `typeof valor === "string"` reduce `string | number` a `string` dentro de esa rama. Fuera de ella, o en la rama contraria, el tipo se ajusta de acuerdo con la condición. El programa se vuelve seguro porque la comprobación de ejecución y el conocimiento estático expresan la misma decisión.

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

En este ejemplo ambas alternativas terminan interpoladas como texto, por lo que el código podría parecer innecesario. Su propósito es mostrar dónde queda disponible cada forma. Si tuvieras que aplicar `puerto.padStart(4, "0")`, sólo podrías hacerlo dentro de la rama de cadena. Si necesitaras compararlo numéricamente con un límite, tendría sentido atender la rama numérica o convertir y validar el texto de manera explícita.

La igualdad contra un literal también reduce tipos. Si `resultado` es `"disponible" | "falla"`, la condición `resultado === "disponible"` permite que TypeScript trate el valor como el literal `"disponible"` dentro de la rama. Esto puede parecer redundante porque ambas alternativas son cadenas, pero se vuelve esencial cuando cada alternativa trae datos distintos en una unión discriminada. Esa construcción llegará en la lección 3.

Dentro del `revisor`, una función puede aceptar una duración que todavía no está disponible. Si existe, clasifica la duración; si no, devuelve un texto que explique la ausencia. La comprobación no sólo calma al compilador: define qué debe ver una persona cuando el programa no tiene una medición.

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

No inventes una duración como `0` para evitar atender `undefined`. Cero puede ser una medición real, una duración imposible o un valor de marcador, según el sistema. Cambiar “no hay dato” por un número mezcla dos significados distintos y deja que una condición posterior saque una conclusión equivocada. Una unión obliga a nombrar la ausencia y decidir qué hacer con ella.

También evita una condición basada en la verdad de un número cuando lo que necesitas comprobar es ausencia. `if (!duracionMs)` trata `0`, `NaN`, `null` y `undefined` como falsos. Si la pregunta es “¿la duración está ausente?”, escribe `duracionMs === undefined` o la comprobación exacta que represente tu regla. Las condiciones de verdad son útiles, pero no sustituyen una decisión precisa sobre valores válidos.

### `null`, `undefined` y `strictNullChecks`

JavaScript tiene dos valores frecuentes para expresar ausencia: `undefined` y `null`. `undefined` aparece, por ejemplo, al leer una propiedad inexistente, omitir un argumento opcional o terminar una función sin `return`. `null` suele ser un valor asignado intencionalmente para decir que no hay resultado. El lenguaje no impone una diferencia universal; el proyecto debe elegir convenciones que comuniquen intención.

Con `strictNullChecks` activo, `null` y `undefined` no se pueden usar donde se espera un `string`, un `number` u otro tipo no anulable. Para admitirlos, debes escribirlo: `string | undefined`, `string | null` o `string | null | undefined`. Esta exigencia no es burocracia. Hace que el contrato revele que una función puede no tener una respuesta y obliga a manejar esa posibilidad antes de llamar métodos o leer propiedades.

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

No hay una regla general que diga que `null` siempre es mejor que `undefined`. Para un parámetro opcional de una función, `undefined` suele encajar con el comportamiento normal de JavaScript: si quien llama omite el argumento, el valor es `undefined`. Para un dato cuya fuente comunica explícitamente “no existe”, `null` puede ser una buena representación. Lo importante es no usar ambos como sinónimos sin motivo, porque obligas a cada consumidor a atender dos formas de la misma ausencia.

El `revisor` usará `undefined` cuando una función local no recibió una duración o no generó un detalle. Cuando una futura API reciba JSON, tendrá que validar si el campo está ausente, si vale `null` o si contiene otro tipo. Esas fronteras externas se estudian en la lección 6. Por ahora, los tipos sólo describen valores internos que ya decidiste representar de cierta forma.

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

`strictNullChecks` no te protege contra datos externos por sí solo. Un JSON puede afirmar cualquier cosa y una aserción como `as string` puede mentirle al compilador. La protección de esta opción empieza una vez que un valor tiene un tipo confiable dentro del programa: evita que olvides que puede faltar. La validación que convierte entradas desconocidas en datos confiables requiere comprobaciones de ejecución y llegará más adelante.

En Go, un valor cero puede ocultar una ausencia si no se modela con cuidado: una cadena vacía y el número cero pueden ser valores válidos o señales de que no hubo dato. TypeScript hace la ausencia visible con uniones. Eso no elimina la necesidad de diseñar una convención, pero hace más difícil ignorar una posibilidad que la firma ya declaró.

## El error que vas a ver

TS2345 aparece cuando un argumento no coincide con el tipo de un parámetro. Con TypeScript 7.0.2, `tsc` imprime el siguiente diagnóstico. La función espera un `number`, pero la llamada le entrega una cadena con comillas.

```ts
// fig02_11.ts

function etiquetaPuerto(puerto: number): string { return `puerto ${puerto}`; }

console.log(etiquetaPuerto("443"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_11.ts
fig02_11.ts(5,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

TS2345 no significa que TypeScript no pueda trabajar con el valor. Significa que esta llamada contradice el contrato de esta función. El arreglo depende de la intención. Si 443 es un puerto conocido escrito en el código, elimina las comillas: `etiquetaPuerto(443)`. Si el valor llegó como texto desde configuración, no lo conviertas con una aserción; valida y transforma el dato en la frontera antes de entregarlo a una función que exige un número.

TS2322 aparece cuando intentas asignar un tipo incompatible a una variable, propiedad o retorno tipado. Es el mismo problema de compatibilidad, pero visto en una asignación en vez de una llamada. Por ejemplo, `const timeoutMs: number = "1500"` produce TS2322 porque el lado izquierdo exige un número y el lado derecho ofrece una cadena. Lee ambos lados del diagnóstico antes de cambiar código: con frecuencia revela una decisión de dominio que todavía no está clara.

TS18048 aparece cuando usas un valor que puede ser `undefined` como si siempre existiera. El siguiente archivo no compila porque `toUpperCase` sólo se puede llamar sobre una cadena presente.

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

El arreglo no es desactivar `strictNullChecks` ni escribir `detalle!` para callar el diagnóstico. Primero debes decidir qué representa la ausencia. Si no hay detalle, quizá el reporte debe decir `"sin detalle"`. Si un detalle es obligatorio, entonces la firma debe ser `detalle: string` y quien llama debe proporcionar uno. Si la ausencia es válida, compruébala antes de usar el valor:

```ts
function detalleEnMayusculasSeguro(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "SIN DETALLE";
  }

  return detalle.toUpperCase();
}
```

TS2339 suele aparecer al intentar usar una operación que no existe en todos los miembros de una unión. Por ejemplo, `valor.toUpperCase()` no es válido si `valor` es `string | number`, porque un número no tiene ese método. Usa `typeof valor === "string"` antes de aplicar una operación exclusiva de cadenas. La comprobación no es un trámite para el compilador: es la rama de ejecución que impide que Node intente llamar un método inexistente.

Cuando aparezca uno de estos diagnósticos, evita buscar primero una conversión o una aserción. Haz tres preguntas: qué valor existe realmente en ese punto, qué valor espera la función o variable, y si la diferencia refleja un dato inválido o una alternativa válida que falta modelar. Esta secuencia suele encontrar el problema más cerca de su causa que una corrección rápida que sólo hace desaparecer el código TSxxxx.

## Lo que se hace mal

- **Anotar cada variable aunque el inicializador ya sea claro.** `const nombre: string = "catálogo"` no es incorrecto, pero repetir información en cada línea oculta las anotaciones que sí expresan una decisión. Deja que TypeScript infiera valores locales evidentes; anota firmas, contratos y puntos donde el tipo necesita quedar explícito.

- **Usar `any` para quitar un error de tipos.** `any` desactiva comprobaciones justo donde TypeScript podía detectar una integración incorrecta. Si un dato de fuera aún no tiene forma conocida, será `unknown` hasta que se valide. Si un dato interno tiene alternativas válidas, usa una unión y redúcela.

- **Aceptar `string | number` cuando el dominio necesita un número.** Una unión amplia puede parecer flexible, pero obliga a cada función a manejar dos casos. Si un puerto debe ser numérico dentro del `revisor`, conviértelo y valídalo una vez al entrar; después usa `number` en el resto del programa.

- **Usar `as` o `!` para esconder TS18048.** Una aserción no vuelve presente un valor ausente. `detalle!` puede compilar, pero Node seguirá fallando si el valor era `undefined`. Modela la ausencia, compruébala y define el resultado que debe producir cada caso.

- **Representar ausencia con `0`, `""` o `false` sin definirlo.** Esos valores pueden ser datos válidos. Si `0` significa “no hubo medición”, ya no podrás distinguirlo de una medición real de cero. Usa `undefined` o `null` cuando la ausencia sea parte del contrato y conserva los valores válidos para su significado propio.

- **Confundir una unión con permiso para ignorar alternativas.** Si una firma declara `string | undefined`, toda persona que la use debe decidir qué ocurre cuando no hay cadena. La unión no hace que el valor sea una cadena; hace visible que el programa tiene dos caminos.

- **Escribir reglas de clasificación repetidas.** Si una parte considera rápido un servicio de 500 ms y otra usa 300 ms, el reporte pierde consistencia. Nombra y centraliza la regla en una función pequeña. Cuando cambie el criterio, habrá una decisión explícita que actualizar y probar.

## Ejercicios

### Ejercicio 1 — Clasificar una duración

Escribe `clasificarDuracion(duracionMs: number): "rápido" | "lento"`. Define que una duración de 500 ms o menos es `"rápido"` y una mayor es `"lento"`. Invoca la función con 500 y 501, imprime ambas salidas y confirma que una llamada con `"500"` produce TS2345.

### Ejercicio 2 — Una línea base para el revisor

Escribe `lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string`. Debe usar `clasificarDuracion` y devolver una línea como `catálogo: HTTP 200, rápido`. Ejecuta la función con catálogo, código 200 y duración 320. Después intenta pasar `"200"` como código y explica por qué el compilador lo rechaza.

### Ejercicio 3 — Detalles que pueden faltar

Escribe `lineaDeFalla(nombre: string, detalle: string | undefined): string`. Si existe un detalle, debe producir `nombre: falla (detalle)`; si no existe, debe producir `nombre: falla sin detalle`. Prueba ambos casos sin usar `any`, `as` ni el operador `!`.

### Ejercicio 4 — Un literal obliga a decidir

Define `type ResultadoBasico = "disponible" | "falla"`. Escribe `resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico` para clasificar códigos de 200 a 399 como disponibles y los demás como falla. Después crea `etiquetaResultado(resultado: ResultadoBasico): string` que devuelva un texto distinto para cada alternativa. Intenta llamarla con `"pendiente"` y explica el diagnóstico.

## Soluciones

### Solución 1

El retorno es una unión de literales porque la función no debe producir cualquier cadena. La comparación incluye 500, por eso se usa `<=`.

```ts
type Clasificacion = "rápido" | "lento";

function clasificarDuracion(duracionMs: number): Clasificacion {
  return duracionMs <= 500 ? "rápido" : "lento";
}
```

Una llamada como `clasificarDuracion("500")` produce TS2345. Las comillas hacen que el valor sea `string`, mientras que la función fue escrita para comparar números.

### Solución 2

La función recibe tres valores simples porque esta etapa todavía no introduce el objeto `Servicio`. La función de clasificación evita duplicar la regla de los 500 ms.

```ts
function lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string {
  const clasificacion = clasificarDuracion(duracionMs);
  return `${nombre}: HTTP ${codigoHttp}, ${clasificacion}`;
}
```

La llamada correcta es `lineaBase("catálogo", 200, 320)`. Usar `"200"` contradice el contrato: un código HTTP se manipula como número dentro de esta función.

### Solución 3

La comparación exacta con `undefined` reduce el tipo a `string` en el segundo retorno. Así, `detalle.toUpperCase()` o cualquier otra operación de cadena sería segura dentro de esa rama.

```ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}
```

La ausencia no se disfraza como una cadena vacía. El reporte conserva la diferencia entre recibir un mensaje y no recibirlo.

### Solución 4

La unión de literales restringe tanto lo que devuelve la función clasificadora como lo que acepta la función de presentación.

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

`etiquetaResultado("pendiente")` produce TS2345 porque `"pendiente"` no pertenece al conjunto declarado. Si el programa realmente necesita esa alternativa, debes agregarla al tipo y actualizar las funciones que la manejan.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Cada figura que compila en esta lección termina sin diagnósticos con `--strict --target ES2022 --module nodenext`.
- [ ] `fig02_04.ts` imprime exactamente `catálogo: rápido` y `pagos: lento`.
- [ ] `fig02_08.ts` imprime una clasificación para 320 ms y `sin duración registrada` para `undefined`.
- [ ] Al compilar `fig02_11.ts`, obtienes TS2345 y no ejecutas el archivo como si hubiera compilado.
- [ ] Al compilar `fig02_12.ts`, obtienes TS18048 y puedes corregirlo con una comprobación explícita de `undefined`.
- [ ] Puedes escribir una función que devuelva `"disponible" | "falla"` sin aceptar una tercera cadena por accidente.
- [ ] Puedes explicar por qué `strictNullChecks` obliga a atender una ausencia en vez de convertirla en `0`, `""` o `false`.

## Para leer más

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — documentación oficial sobre primitivos, anotaciones, inferencia, funciones, uniones y literales. consultado el 2 de octubre de 2026.

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentación oficial sobre firmas, parámetros, retornos, inferencia y funciones que no devuelven un valor útil. consultado el 2 de octubre de 2026.

- [TypeScript TSConfig: `strictNullChecks`](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) — documentación oficial sobre el tratamiento separado de `null` y `undefined` en modo estricto. consultado el 2 de octubre de 2026.

- [MDN: operador `null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null) — referencia sobre `null` en JavaScript y su diferencia práctica frente a otros valores ausentes. consultado el 2 de octubre de 2026.
