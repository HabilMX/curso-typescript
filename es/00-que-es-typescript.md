# Lección 0 — Qué es TypeScript y qué NO es

**Tiempo:** 90 min (o 2 × 45)

**Qué construyes:** nada todavía (lectura)

**Qué aprendes:** JS vs TS; los tipos se borran al ejecutar; qué protege y qué no; por qué `strict`

## Al terminar vas a poder

- Explicar la diferencia entre JavaScript y TypeScript sin decir que son dos lenguajes que compiten en el navegador.
- Compilar un archivo `.ts`, ejecutar el JavaScript generado y reconocer qué información de tipos desapareció.
- Identificar un error que TypeScript puede detener antes de ejecutar un programa.
- Identificar un caso donde un tipo escrito en TypeScript no basta para proteger datos que vienen de fuera.
- Explicar por qué el curso usa `strict` desde el principio.
- Leer y corregir errores TS2345 y TS18048 del compilador.

## El porqué antes del cómo

El `revisor` que construirás durante este curso consulta varios servicios, reúne sus respuestas y muestra un reporte. Aunque al principio parezca un programa pequeño, contiene un problema que se repite en casi cualquier sistema: hay datos con una forma esperada y hay datos que pueden llegar con una forma equivocada. Un servicio debe tener nombre, URL y estado; una respuesta debe incluir un código HTTP; el panel debe recibir el mismo reporte que produjo la API. Si alguien confunde una URL con un código numérico, escribe mal el nombre de una propiedad o trata como respuesta exitosa un objeto incompleto, el programa puede fallar tarde: quizá sólo cuando una persona abra el panel o cuando un servicio externo responda de una manera poco común.

JavaScript permite escribir programas útiles con muy pocas barreras. Puedes crear un objeto, agregarle una propiedad después, pasar una cadena donde otra función esperaba un número y ejecutar el archivo de inmediato. Esa flexibilidad es una de sus virtudes: JavaScript sirve para experimentar, automatizar tareas, construir interfaces y hacer cambios rápidos. El costo aparece cuando el programa crece, cuando varias personas tocan el mismo código o cuando una función deja de ser evidente por sí sola. El editor ya no puede saber con certeza qué datos recibe una función, y tú terminas guardando reglas importantes en la memoria, en comentarios o en la esperanza de que las pruebas cubran todos los caminos.

TypeScript añade una capa de verificación antes de ejecutar. Esa capa describe qué valores puede recibir una función, qué propiedades debe tener un objeto y qué resultados puede producir una operación. Con esa información, el compilador revisa si las piezas del programa encajan entre sí. No espera a que el usuario encuentre una pantalla rota ni a que una petición real llegue a producción: marca muchos errores mientras escribes o compilas.

La palabra importante es “muchos”, no “todos”. TypeScript no reemplaza las pruebas, no convierte datos externos en datos confiables y no impide por sí solo que una función tenga una regla de negocio equivocada. Si el `revisor` considera que una respuesta HTTP 500 significa “servicio disponible”, TypeScript puede verificar que el código es un número, pero no puede adivinar que tu criterio operacional es incorrecto. Los tipos describen estructura y relaciones entre valores; no conocen automáticamente el mundo que esos valores representan.

También conviene quitar una confusión común desde la primera lección: TypeScript no sustituye a JavaScript en tiempo de ejecución. Node, el navegador y React ejecutan JavaScript. El flujo normal del curso escribe TypeScript, lo revisa con `tsc` y transforma el resultado a JavaScript antes de ejecutarlo. Cuando el `revisor` esté corriendo, sus tipos `Servicio`, `Estado` y `Reporte` ya no estarán ahí como objetos que Node pueda consultar. Eso tiene consecuencias importantes: una anotación puede evitar un error dentro de tu código, pero no valida el JSON que llega por HTTP ni modifica un valor que ya es incorrecto.

Node 24 LTS también puede ejecutar directamente un guion `.ts` cuya sintaxis sea borrable. En ese caso reemplaza los tipos por espacios y ejecuta el JavaScript restante: no verifica tipos, no lee `tsconfig.json` y no admite sintaxis que genere código, como `enum`. Úsalo, si te conviene, para un guion aislado; el `revisor` tendrá varios archivos y se compilará con `tsc` para ejecutar `dist/*.js`. La página de Node sobre TypeScript documenta este *type stripping*, o borrado de tipos, y sus límites.

En Go, el compilador también verifica tipos antes de crear el ejecutable. La diferencia práctica es que un programa de Go se transforma en un binario nativo, mientras que TypeScript produce JavaScript para una plataforma que ya existe: Node o el navegador. La comparación útil no es decidir cuál “es más estricto”, sino reconocer una disciplina compartida: declarar contratos para que los errores de integración aparezcan antes. En Go esos contratos se escriben con tipos del lenguaje; en TypeScript se escriben sobre JavaScript y se eliminan antes de ejecutar.

Por eso el curso empieza con una lección de lectura. Antes de aprender sintaxis, necesitas saber qué promesa hace la herramienta y cuál no hace. Si esperas que TypeScript valide automáticamente un archivo de configuración, llegarás a una falsa sensación de seguridad. Si crees que sólo agrega anotaciones molestas, probablemente desactivarás las comprobaciones justo cuando más pueden ayudarte. El objetivo es usarlo como lo que es: un verificador estático que hace visibles los contratos de tu programa y que te obliga a atender las zonas donde esos contratos todavía no bastan.

## Los conceptos

### JavaScript sigue siendo el programa que se ejecuta

JavaScript es un lenguaje dinámico. Eso significa que sus valores se inspeccionan mientras el programa corre. Una variable puede contener una cadena ahora y, si la reasignas, contener un número después. Una función puede recibir cualquier valor salvo que tú mismo escribas comprobaciones en tiempo de ejecución. JavaScript no exige declarar todos los tipos porque su modelo está diseñado para decidir muchas cosas al momento de ejecutar.

Esto no quiere decir que JavaScript sea descuidado ni que un programa JavaScript esté condenado a fallar. Puedes escribir JavaScript muy claro, probarlo bien y validar cada entrada. El problema es de escala y de retroalimentación. Si `mostrarEstado` debe recibir uno de dos estados posibles, JavaScript no te avisa al escribir `"disponble"` con una letra faltante. El programa puede seguir corriendo y mostrar una etiqueta incorrecta, o recorrer una rama que nadie esperaba. El error queda escondido hasta que algún camino concreto lo revela.

TypeScript toma el mismo código JavaScript y permite describir sus límites. Un tipo literal como `"disponible" | "falla"` expresa que no sirve cualquier cadena: sólo sirven esas dos. Cuando una función acepta ese tipo, TypeScript compara cada llamada con el contrato antes de emitir el JavaScript. No está calculando el estado real de un servicio; está comprobando que las partes de tu programa usan el mismo vocabulario.

```ts
// fig00_01.ts
type Estado = "disponible" | "falla";

function describir(estado: Estado): string {
  return estado === "disponible" ? "Servicio disponible" : "Servicio con falla";
}

console.log(describir("disponible"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_01.ts
$ node fig00_01.js
Servicio disponible
```

El programa se ve casi igual que JavaScript. Las partes específicas de TypeScript son `type Estado`, la unión de literales y las anotaciones `: Estado` y `: string`. El resto —la función, el operador ternario y `console.log`— es JavaScript ordinario. Esta continuidad es una ventaja para quien ya programa en JavaScript: no empiezas de cero ni aprendes una máquina de ejecución distinta; agregas información que el compilador y el editor pueden revisar.

El valor de esa información aumenta cuando el tipo se reutiliza. Si cada función del `revisor` inventara sus propias cadenas para describir el estado, pronto tendrías `"ok"`, `"OK"`, `"disponible"` y `"funcionando"` para una misma idea. Todas son cadenas válidas para JavaScript, pero no todas son válidas para el reporte que quieres construir. Un tipo compartido fija un pequeño idioma para el proyecto. Más adelante ese idioma incluirá estados con detalle, duración y código HTTP.

Dentro del `revisor`, la misma idea aparece desde el modelo más pequeño posible. No se trata todavía de consultar una URL ni de abrir un servidor: se trata de evitar que las funciones que procesan resultados hablen dialectos distintos. Si `Estado` dice que los resultados pueden ser `"disponible"` o `"falla"`, una función que recibe un servicio puede apoyarse en esa decisión y una pantalla puede mostrar las dos alternativas que de verdad existen.

```ts
// fig00_02.ts
type Estado = "disponible" | "falla";

type Servicio = {
  nombre: string;
  estado: Estado;
};

function resumen(servicio: Servicio): string {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_02.ts
$ node fig00_02.js
[disponible] catálogo
```

Aquí TypeScript comprueba varias relaciones a la vez. `catalogo` debe tener `nombre` y `estado`; `nombre` debe ser una cadena; `estado` debe ser uno de los dos literales permitidos; y `resumen` sólo acepta un objeto con esa forma. El compilador no necesita ejecutar una petición de red para descubrir una contradicción: la ve al comparar el valor escrito con el contrato `Servicio`.

No necesitas anotar cada variable. TypeScript puede inferir muchos tipos a partir de los valores. Por ejemplo, si escribes `const nombre = "catálogo"`, el compilador sabe que se trata de texto. Las anotaciones son más valiosas en los bordes de una función, en datos que se comparten entre módulos y en decisiones que quieres convertir en contrato. Escribir `const nombre: string = "catálogo"` no añade información útil; escribir `function resumen(servicio: Servicio): string` sí comunica qué entra y qué sale.

La inferencia tampoco elimina la necesidad de pensar. El compilador infiere a partir del código disponible, no a partir de la intención que olvidaste expresar. Si una lista puede contener servicios disponibles y fallidos, necesitarás modelar esa diferencia de forma explícita. Si un valor puede faltar, tendrás que admitirlo en el tipo y manejarlo. TypeScript reduce el trabajo mecánico de repetir tipos obvios para que concentres atención en los contratos que cambian el comportamiento del programa.

### Los tipos se borran antes de ejecutar

Una anotación de tipo no es una instrucción para Node. Cuando compilas `fig00_02.ts`, el archivo generado conserva la función, el objeto y la llamada a `console.log`, pero elimina `type Estado`, `type Servicio`, `: Estado`, `: Servicio` y `: string`. Node no necesita entenderlos porque nunca los recibe.

El JavaScript esencial que resulta de ese ejemplo se parece a esto:

```js
function resumen(servicio) {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

Este fragmento no contiene una definición de `Servicio`. Tampoco contiene una lista de valores válidos para `Estado`. La comprobación ocurrió durante la compilación, antes de que Node leyera el archivo. Por eso se dice que los tipos de TypeScript se borran: son información para verificar y desarrollar el programa, no datos que acompañen automáticamente al programa mientras corre.

Esta decisión tiene ventajas. El JavaScript emitido no necesita una biblioteca de reflexión sólo para conservar las anotaciones. El navegador no descarga una representación de cada tipo por el simple hecho de que el proyecto usa TypeScript. Node puede ejecutar el resultado como ejecuta cualquier otro módulo JavaScript. Además, puedes adoptar TypeScript de forma gradual: mucho código JavaScript válido puede convivir con archivos `.ts` mientras agregas contratos donde hacen falta.

También tiene una consecuencia que debes repetir hasta que sea intuitiva: escribir un tipo no convierte un valor. Si afirmas que una variable es `number`, el compilador revisa las operaciones dentro del código TypeScript, pero el JavaScript emitido no transforma `"404"` en `404`. Si declaras que una propiedad existe, Node no crea esa propiedad. Si un JSON recibido no trae `url`, ninguna anotación hará que aparezca. Las anotaciones describen una expectativa; no fabrican ni corrigen datos.

Esto distingue los tipos de la validación. La validación se ejecuta y decide qué hacer con un valor real: rechazarlo, corregirlo, convertirlo o devolver un error. Un tipo estático permite que el compilador razone sobre los valores que el programa ya considera confiables. Ambas cosas son necesarias, pero ocurren en lugares distintos. En este curso, los tipos del modelo aparecerán antes; la validación de JSON, variables de entorno y respuestas HTTP llegará en la lección 6, cuando ya tengas claro por qué no puede ser automática.

El `revisor` tendrá tipos compartidos entre la API y el panel. Eso permite que ambas partes estén de acuerdo sobre la forma de un reporte mientras se desarrollan. Sin embargo, cuando el navegador recibe JSON de la API, recibe JSON: texto convertido en objetos JavaScript, no una instancia mágica del tipo `Reporte`. La API debe construir una respuesta correcta y el panel debe tratar la frontera de red con cuidado. Compartir tipos evita muchas contradicciones dentro del repositorio; no elimina la necesidad de validar una frontera.

La eliminación también explica por qué no puedes preguntar algo como `if (servicio is Servicio)` usando un `type` de TypeScript. El nombre `Servicio` ya no existe cuando Node corre. Sí puedes comprobar propiedades concretas con JavaScript, por ejemplo verificar que un valor es un objeto, que tiene una propiedad `nombre` de tipo cadena y que su URL también es una cadena. Esa comprobación será parte de una función de validación, no parte de la definición de tipo.

La regla práctica es sencilla: usa tipos para expresar contratos entre el código que controlas; usa validación para decidir si aceptas datos que llegan desde fuera. En la vida real hay zonas grises, como datos de una biblioteca externa o archivos creados por otra parte del mismo sistema. Si no puedes demostrar que una entrada cumple el contrato, trátala como no confiable hasta validarla.

### TypeScript protege contratos internos, no la realidad externa

El compilador sólo ve el código que recibe y los tipos disponibles para analizarlo. Puede detectar que pasaste un número a una función que pide una cadena. Puede detectar que intentas usar una propiedad inexistente en un objeto cuyo tipo conoce. Puede detectar que una variable quizá sea `undefined`. No puede abrir una conexión HTTP, comprobar que un proveedor respetó su documentación o saber si la configuración que un usuario escribió ayer sigue teniendo el formato correcto hoy.

El caso más peligroso para principiantes es la aserción de tipo con `as`. Una expresión como `valor as Servicio` no valida el valor. Le dice al compilador: “de aquí en adelante, confía en que yo sé que esto es un `Servicio`”. A veces es razonable cuando ya hiciste una comprobación que TypeScript no pudo deducir. Usarla para silenciar una duda sobre datos externos, en cambio, equivale a quitar el cinturón de seguridad porque la alarma está sonando.

Para aislar esta frontera, el `Servicio` de la figura siguiente usa una forma reducida distinta del `Servicio` con `estado` de `fig00_02.ts`: ahora sólo conserva `nombre` y `url`. El modelo completo y estable del `revisor` llegará en la lección 3.

```ts
// fig00_03.ts
type Servicio = {
  nombre: string;
  url: string;
};

const servicio = JSON.parse(
  '{"nombre":"pagos","direccion":"https://pagos.example"}',
) as Servicio;

console.log(`${servicio.nombre}: ${servicio.url}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_03.ts
$ node fig00_03.js
pagos: undefined
```

El archivo compila sin error porque la aserción obligó al compilador a tratar el resultado como `Servicio`. Sin embargo, el JSON tiene `direccion`, no `url`. Al ejecutar, JavaScript busca una propiedad inexistente y produce `undefined`. No hay contradicción para el runtime: los objetos JavaScript pueden no tener una propiedad. La contradicción existe entre la promesa escrita con `as Servicio` y el dato real.

Este ejemplo no significa que `JSON.parse` sea malo ni que TypeScript sea inútil frente a JSON. Significa que el orden correcto importa. Primero recibes un valor cuya forma no conoces; después verificas sus propiedades; sólo entonces lo conviertes en un valor que el resto del programa puede usar como `Servicio`. TypeScript representa ese punto de partida con `unknown`, un tipo que obliga a inspeccionar antes de acceder a propiedades. Lo estudiarás con más detalle cuando el `revisor` lea su configuración y procese respuestas remotas.

Hay otros límites que también debes reconocer. TypeScript no sabe si una URL apunta a un servidor real. No sabe si un estado `"disponible"` describe correctamente la salud de un servicio. No sabe si dos peticiones que llegan al mismo tiempo alteran un recurso de forma incompatible. No sabe si una contraseña fue expuesta en una bitácora. Puede ayudarte a modelar datos para que esos problemas sean más fáciles de ver y probar, pero las decisiones de seguridad, concurrencia y negocio requieren diseño, validación y pruebas.

El tipo también puede estar mal diseñado. Si declaras que `codigoHttp` es `number`, aceptarás `-5`, `999` y `3.14` desde el punto de vista del tipo. Quizá el programa sólo necesita saber que es un número; quizá el dominio exige un entero entre 100 y 599. La segunda regla no surge sola de `number`. Más adelante decidirás dónde representar restricciones de dominio: con uniones de literales, validadores, funciones constructoras o una combinación de ellas.

Dentro del `revisor`, los datos que construyen tus propias funciones son una zona donde TypeScript protege mucho. Si `crearReporte` recibe servicios ya verificados y devuelve una estructura conocida, los tipos evitan que la API y el panel discrepen en nombres de propiedades. La respuesta que llega desde una URL configurada por una persona es otra zona: el tipo compartido no prueba que el servidor entregó el JSON prometido. Esa frontera se valida antes de convertir los datos en resultados internos.

Una forma sana de pensar el sistema es dibujar una línea. Del lado interno, deja que `strict` sea exigente y evita escapar con `any` o aserciones sin evidencia. En las fronteras, acepta que el valor todavía no merece confianza y valídalo. El tipo no desaparece como disciplina porque los datos externos sean inciertos; al contrario, te ayuda a señalar con precisión el momento en que pasan de ser inciertos a ser utilizables.

### `strict` convierte dudas frecuentes en trabajo explícito

TypeScript tiene opciones de compilación que determinan cuánto revisa. Desde TypeScript 6, `strict` vale `true` por omisión; TypeScript 7.0.2 ya parte de esas comprobaciones. Los comandos de esta lección escriben `--strict` para dejar explícita la decisión del curso, no porque el compilador la necesite para activarla. Quien usa `--strict false` apaga esas comprobaciones de forma deliberada. Esa flexibilidad sirve para una migración cuidadosamente acotada, pero no es el mejor punto de partida para un proyecto nuevo.

La opción `strict` activa un conjunto de comprobaciones estrictas. Entre las más visibles están `noImplicitAny`, que evita que valores sin tipo se conviertan silenciosamente en `any`, y `strictNullChecks`, que distingue entre un valor presente y uno que puede ser `null` o `undefined`. El conjunto puede crecer en versiones futuras de TypeScript; por eso es mejor activar la opción general que memorizar una lista de banderas aisladas.

En un curso desde cero, `strict` no es un castigo ni una forma de escribir más texto. Es una decisión para descubrir temprano los lugares donde tu programa no expresó algo importante. Si una función acepta un detalle que puede faltar, esa ausencia es parte de su contrato. Si un parámetro no tiene tipo, quizá olvidaste decidir qué clase de valores soporta. Si el compilador te obliga a resolverlo, está evitando que otra persona tenga que adivinarlo después.

```ts
// fig00_04.ts
function etiquetaDetalle(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
console.log(etiquetaDetalle("200 OK"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_04.ts
$ node fig00_04.js
sin detalle
200 OK
```

La función no finge que `detalle` siempre existe. Declara `string | undefined`, revisa el caso ausente y sólo llama `toUpperCase()` cuando TypeScript puede demostrar que quedó una cadena. Esa reducción de posibilidades se llama *narrowing*: después de la condición, el tipo es más específico. No necesitas memorizar el término hoy; sí necesitas adquirir el hábito de atender el caso que el contrato dice que puede ocurrir.

En el `revisor`, los detalles de una falla pueden faltar. Un servicio podría contestar con un código HTTP sin texto adicional; una conexión podría terminar antes de producir una respuesta; una configuración podría omitir una etiqueta opcional. Si modelas todo como `string`, el programa te deja usarlo como si siempre hubiera contenido. Con `strictNullChecks`, el tipo conserva la diferencia entre “hay un texto, aunque esté vacío” y “no se obtuvo ningún texto”. Esa diferencia mejora tanto los mensajes del panel como la lógica de diagnóstico.

`strict` no promete que nunca escribirás una aserción ni que todos los casos serán obvios. Habrá integraciones con bibliotecas, APIs del navegador o datos externos donde tendrás que hacer una comprobación concreta. La diferencia es que el escape será deliberado y localizado. Sin `strict`, las dudas se propagan: un `any` entra por una función, pasa por otras cinco y al final cualquier acceso a propiedades parece válido. Encontrar el origen entonces cuesta mucho más.

Hay quien activa las comprobaciones estrictas al final, cuando el proyecto ya tiene miles de líneas. Eso suele convertir la adopción en una limpieza pesada: aparecen muchas decisiones pendientes a la vez y la presión por entregar lleva a desactivar reglas o a llenar el código de `as any`. Empezar en modo estricto mantiene el costo pequeño. Cada nueva función resuelve sus contratos cuando nace, y cada tipo nuevo queda disponible para las funciones que vengan después.

Go enseña una lección parecida: el compilador no te deja ignorar muchas incompatibilidades que otros lenguajes descubren tarde. TypeScript conserva la flexibilidad de JavaScript porque puede adoptarse poco a poco, pero este curso elegirá la ruta más exigente para el código nuevo. La intención no es hacer que el compilador “gane” una discusión, sino convertir ambigüedades reales en decisiones visibles.

Cuando en la lección 1 crees `tsconfig.json`, `strict` será parte de la configuración base. A partir de ahí, un error de tipos no se arregla quitando la opción. Se arregla aclarando el contrato: anotando una entrada, comprobando un valor que puede faltar, separando estados distintos o validando un dato externo. Esa práctica será una de las bases del `revisor`.

## El error que vas a ver

El primer error aparece cuando una llamada contradice el tipo que una función declaró. El siguiente programa pide una URL como cadena, pero recibe un número. `tsc` 7.0.2 no necesita ejecutar el archivo para detectar el problema.

```ts
// fig00_05.ts
function consultarServicio(url: string): void {
  console.log(url);
}

consultarServicio(404);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_05.ts
fig00_05.ts(6,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

TS2345 significa que el valor de un argumento no se puede asignar al tipo del parámetro correspondiente. El número `404` puede ser un código HTTP, pero no es una URL. El arreglo no es convertir cualquier dato a cadena para callar el error. Primero decide qué representa la función: si consulta una dirección, recibe una cadena como `"https://pagos.example"`; si procesa un código HTTP, crea otra función cuyo parámetro sea un número. El error reveló que dos conceptos distintos se mezclaron.

El segundo error es una consecuencia directa de `strictNullChecks`. El tipo acepta una cadena o `undefined`, pero el programa intenta usarla como si siempre fuera una cadena.

```ts
// fig00_06.ts
function etiquetaDetalle(detalle: string | undefined): string {
  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_06.ts
fig00_06.ts(3,10): error TS18048: 'detalle' is possibly 'undefined'.
```

TS18048 significa que el compilador encontró un camino válido en el que `detalle` no tiene valor. Si se ejecutara ese JavaScript con `undefined`, intentar leer `toUpperCase` produciría un error de ejecución. La corrección es manejar la ausencia antes de usar la cadena, como hizo `fig00_04.ts`, o cambiar el contrato para que la función sólo reciba `string` cuando de verdad esa garantía exista.

Los mensajes de TypeScript son pistas, no instrucciones mecánicas. Un error puede resolverse con una condición, con un tipo mejor diseñado, con una validación o con una función distinta. La pregunta útil no es “¿cómo hago que desaparezca TS18048?”, sino “¿puede faltar este dato según las reglas del programa?”. Si la respuesta es sí, maneja el caso. Si la respuesta es no, encuentra dónde falta la validación que debería garantizarlo.

También recuerda que, por configuración, TypeScript puede emitir JavaScript incluso cuando informó un error. El compilador está pensado para que una migración gradual no detenga de inmediato un proyecto JavaScript existente. En el `revisor`, los errores de compilación se tratarán como fallas que deben corregirse antes de dar un cambio por terminado. La lección 1 configurará el proyecto para hacer esa política explícita.

## Lo que se hace mal

- Usar `any` para quitar un error. `any` desactiva muchas comprobaciones justo en el valor donde más información te hacía falta. A veces aparece al integrar código existente, pero no debe ser la salida automática. Prefiere `unknown` cuando el valor llega de fuera y ve reduciendo su tipo mediante validaciones.

- Escribir `as Servicio` sobre datos de JSON, HTTP o variables de entorno. Una aserción no inspecciona el valor; sólo cambia lo que TypeScript supone sobre él. Si no hay una validación previa, puedes producir el mismo `undefined` de `fig00_03.ts` con una apariencia engañosa de seguridad.

- Creer que TypeScript reemplaza las pruebas. Los tipos detectan incompatibilidades estructurales, pero no prueban que una petición llegue al servidor correcto, que un tiempo límite funcione o que un reporte ordene los servicios como pidió el usuario. Usa tipos para cerrar una clase de errores y pruebas para observar el comportamiento real.

- Desactivar `strict` cuando aparecen varios mensajes. Los errores normalmente revelan una decisión pendiente: un parámetro sin contrato, un dato opcional tratado como obligatorio o un límite externo sin validar. Desactivar la regla esconde el trabajo, pero no elimina la ambigüedad del programa.

- Anotar absolutamente todo. TypeScript infiere tipos simples con precisión. Repetir `const nombre: string = "pagos"` añade ruido sin reforzar un límite. Conserva las anotaciones para contratos públicos, parámetros, resultados relevantes y modelos compartidos como `Servicio`.

- Confundir un tipo con una regla de negocio. `codigoHttp: number` no garantiza que un número corresponda a una respuesta HTTP válida. Los tipos expresan una parte del dominio; las reglas restantes necesitan validación, pruebas y decisiones explícitas.

## Ejercicios

### Ejercicio 1 — Separar conceptos

Lee la llamada `consultarServicio(404)` de `fig00_05.ts`. Escribe dos frases: una que explique por qué TS2345 tiene razón y otra que proponga un valor correcto para una función que recibe una URL. Después escribe una segunda firma de función adecuada para procesar un código HTTP numérico.

### Ejercicio 2 — Detectar una promesa falsa

Parte del JSON de `fig00_03.ts`. Sin ejecutar el programa, identifica la propiedad que no coincide con `Servicio` y predice la salida exacta de `console.log`. Explica por qué `as Servicio` permitió compilar a pesar de que el objeto no tiene la forma esperada.

### Ejercicio 3 — Hacer explícita la ausencia

Modifica mentalmente `fig00_06.ts` para que devuelva `"sin detalle"` cuando reciba `undefined` y convierta a mayúsculas una cadena presente. Escribe cuál debe ser la salida para `undefined` y para `"tiempo agotado"`. Luego compárala con la solución.

### Ejercicio 4 — Del tipo al límite del sistema

El `revisor` lee una lista de servicios desde una fuente externa. Explica dónde pondrías cada responsabilidad: el tipo `Servicio`, la validación de que `nombre` y `url` son cadenas, y la comprobación de que la URL responde. Justifica por qué ninguna de las tres sustituye a las otras dos.

## Soluciones

### Solución 1

TS2345 tiene razón porque `404` es un número y la función declaró que necesita una cadena llamada `url`. Un valor correcto para esa función podría ser `"https://pagos.example"`. Si la intención era trabajar con el código, una firma adecuada sería `function describirCodigoHttp(codigo: number): string`. Separar las funciones evita que el mismo parámetro represente dos ideas distintas.

### Solución 2

La propiedad incorrecta es `direccion`; el tipo `Servicio` espera `url`. La salida es `pagos: undefined`. La aserción `as Servicio` no comparó el objeto con el tipo ni agregó la propiedad faltante; le indicó al compilador que confiara en una afirmación que el programa no comprobó. El runtime sólo ve un objeto JavaScript con `nombre` y `direccion`.

### Solución 3

La función debe revisar el caso ausente antes de llamar `toUpperCase()`. Para `undefined`, la salida debe ser `sin detalle`. Para `"tiempo agotado"`, la salida debe ser `TIEMPO AGOTADO`. La solución completa sigue el mismo patrón que `fig00_04.ts`: una condición resuelve la ausencia y, después de ella, TypeScript sabe que el valor restante es una cadena.

### Solución 4

El tipo `Servicio` pertenece al código interno compartido por las partes del `revisor`: expresa que un servicio utilizable tiene `nombre` y `url` de tipo cadena. La validación pertenece justo donde la lista entra al sistema: recibe un valor todavía incierto, comprueba sus propiedades y rechaza o reporta un dato inválido. La comprobación de que la URL responde pertenece a la operación de red, porque una cadena con forma de URL puede apuntar a un servidor inexistente, lento o con una respuesta fallida. El tipo ordena el código; la validación protege la frontera; la consulta observa el estado real del servicio.

## Cómo sé que lo logré

Puedes considerar terminada esta lección cuando cumplas estas comprobaciones:

- [ ] Puedes ejecutar `npx tsc --version` y obtener `Version 7.0.2`.

- [ ] Puedes ejecutar `node --version` y obtener una versión que empieza con `v24`.

- [ ] Al copiar `fig00_01.ts`, compilarlo con `npx tsc --strict --target ES2022 --module nodenext fig00_01.ts` y ejecutar `node fig00_01.js`, obtienes exactamente `Servicio disponible`.

- [ ] Al compilar `fig00_05.ts` con el mismo comando, obtienes TS2345 y no intentas ejecutarlo como si fuera un programa correcto.

- [ ] Puedes explicar por qué `fig00_03.ts` imprime `undefined` aunque compila sin errores.

- [ ] Puedes corregir `fig00_06.ts` sin quitar `strict` y sin cambiar el tipo para fingir que `undefined` nunca puede llegar.

- [ ] Puedes decir, sin consultar esta lección, que TypeScript verifica antes de ejecutar, emite JavaScript y no valida por sí solo datos externos.

## Para leer más

- [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) — documentación oficial de TypeScript; consultado el 2 de octubre de 2026.

- [TSConfig: strict](https://www.typescriptlang.org/tsconfig/strict.html) — documentación oficial de la opción `strict`; consultado el 2 de octubre de 2026.

- [Node.js: TypeScript](https://nodejs.org/api/typescript.html) — documentación oficial de Node sobre ejecución y soporte relacionado con TypeScript; consultado el 2 de octubre de 2026.

- [MDN: TypeScript](https://developer.mozilla.org/en-US/docs/Glossary/TypeScript) — definición y contexto de TypeScript en MDN; consultado el 2 de octubre de 2026.
