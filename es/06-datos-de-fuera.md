# Lección 6 — Datos que llegan de fuera

**Tiempo:** 2 × 45 min

**Qué construyes:** validación de configuración y respuestas

**Qué aprendes:** el tipo no valida en ejecución: validar en la frontera; tipos derivados del esquema

## Al terminar vas a poder

- Distinguir datos confiables dentro del programa de valores que llegan desde JSON, una variable de entorno o una respuesta HTTP.
- Recibir datos externos como `unknown` y convertirlos a un contrato interno sólo después de validarlos.
- Escribir guardas de tipo y funciones de validación que den errores útiles sin usar `any` ni aserciones para ocultar problemas.
- Leer y validar una lista de servicios desde un archivo JSON antes de iniciar consultas concurrentes.
- Convertir variables de entorno, que siempre llegan como texto o ausencia, a configuraciones numéricas válidas.
- Derivar el tipo interno de un esquema de validación para evitar mantener dos contratos que se contradicen.

## El porqué antes del cómo

Hasta la lección anterior, el `revisor` ya tiene una lista de `Servicio`, puede consultar sus destinos de forma concurrente y convierte las fallas esperadas en valores `Estado`. Todo eso funciona muy bien mientras cada objeto se construye directamente en archivos TypeScript. Si escribes `{ nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 }`, el compilador puede comprobar que el objeto contiene las tres propiedades y que cada una tiene el tipo prometido.

Un programa real no vive sólo de objetos escritos por quien programa. La lista de servicios puede venir de un archivo JSON que modificó alguien de operación. El puerto de la API puede venir de una variable de entorno configurada al arrancar un contenedor. La respuesta de un servicio remoto puede traer JSON producido por otra aplicación, con otra versión, otra política de errores o un defecto temporal. En los tres casos, el programa recibe valores de JavaScript que no pasaron por el compilador de este proyecto.

Ésta es una frontera importante. Dentro del `revisor`, después de validar, puedes trabajar con `Servicio`, `Estado` y `Reporte` como contratos conocidos. En la frontera, antes de validar, sólo sabes que llegó algo. Puede ser un objeto, un arreglo, `null`, texto, un número o un objeto que parece correcto excepto por una propiedad. La decisión sana es hacer explícita esa incertidumbre: recibir `unknown`, inspeccionar el valor durante la ejecución y producir un dato confiable o un error que indique qué se debe corregir.

Es frecuente pensar que una anotación de TypeScript resuelve este problema. Si escribes `const servicio = JSON.parse(texto) as Servicio`, el editor deja de mostrar advertencias y el código siguiente puede leer `servicio.timeoutMs`. Pero no ocurrió ninguna comprobación. `as Servicio` le pide al compilador que confíe en tu palabra; no examina el JSON, no convierte una cadena en número y no agrega una propiedad ausente. Cuando Node ejecute el JavaScript emitido, el alias `Servicio` ya no existirá.

La diferencia se parece a la que existe en Go entre deserializar JSON y validar un `struct`. Go puede llenar campos conocidos de una estructura, pero aún debes decidir si los valores recibidos son aceptables: una URL vacía, un puerto cero o un límite negativo pueden caber en sus tipos y seguir siendo configuraciones inválidas. TypeScript tiene una responsabilidad adicional: antes de siquiera afirmar que un valor tiene forma de objeto, debe comprobarlo. El tipo estático protege las relaciones de tu código; la validación protege la entrada del mundo exterior.

La frontera no es un lugar para repetir validaciones por toda la aplicación. Si diez funciones preguntan si `timeoutMs` es número, terminas con diez versiones de la misma regla y diez mensajes distintos. Si validas una vez al cargar la configuración, el resto recibe `readonly Servicio[]` y se concentra en consultar, coordinar y presentar resultados. La validación no hace que los demás servicios remotos sean confiables; establece dónde el `revisor` decide qué datos puede aceptar como propios.

También importa distinguir estructura de regla de negocio. Confirmar que `timeoutMs` es un número elimina una clase de errores, pero todavía admite `-50`, `NaN` o `3.14`. Para este proyecto, el límite es una cantidad entera de milisegundos y debe ser positiva. Confirmar que `url` es una cadena tampoco prueba que el destino responda ni que pertenezca a la red correcta; sólo comprueba que la configuración contiene un texto no vacío que el siguiente paso puede interpretar como URL. Cada capa responde una pregunta distinta y ninguna sustituye a las demás.

El objetivo de la lección no es construir una biblioteca enorme de validación. Es aprender un orden de trabajo que se mantiene cuando el proyecto crece: definir una regla ejecutable en la frontera, obtener de ella un valor interno confiable y conservar una explicación clara cuando la entrada no cumple. Ese orden preparará al `revisor` para la API de la lección 8 y para el panel de la lección 9, donde tanto servidor como navegador volverán a cruzar fronteras de datos.

## Los conceptos

### Los tipos se borran; `unknown` conserva la duda correcta

TypeScript analiza el código antes de emitir JavaScript. Los alias, interfaces, parámetros genéricos y anotaciones ayudan al compilador, pero no se convierten en verificaciones automáticas al ejecutar. Node recibe JavaScript ordinario: no puede preguntar si un objeto “es un `Servicio`” porque ese nombre no existe como valor durante la ejecución.

`JSON.parse` convierte texto JSON en un valor de JavaScript. El estándar permite que ese valor sea cualquiera de los tipos posibles de JSON: objeto, arreglo, cadena, número, booleano o `null`. Aunque sepas que el archivo debería contener servicios, esa expectativa no cambia lo que llegó. Por eso conviene guardar el resultado como `unknown` antes de inspeccionarlo.

```ts
// fig06_01.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const bruto: unknown = JSON.parse(
  '{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":"rápido"}',
);

const supuesto = bruto as Servicio;

console.log(typeof supuesto.timeoutMs);
console.log(supuesto.timeoutMs);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_01.ts
$ node fig06_01.js
string
rápido
```

La figura compila porque la aserción ordena al compilador tratar el valor como `Servicio`. Sin embargo, la ejecución muestra la realidad: `timeoutMs` sigue siendo una cadena. Si una función posterior hiciera aritmética con ese valor, JavaScript podría convertirlo de manera inesperada o producir `NaN`. El problema no empezó en la operación aritmética; empezó en el momento en que se afirmó un contrato sin evidencia.

`unknown` no significa que el valor sea inútil. Significa que todavía no puedes leer propiedades ni llamarlo como función. Esa restricción es útil porque obliga a hacer la comprobación en el lugar correcto. Después de probar que el valor es un objeto no nulo, puedes revisar sus llaves; después de probar que una llave contiene un número entero positivo, puedes usarla como límite.

No confundas `unknown` con `any`. `any` apaga la comprobación y permite acceder a cualquier propiedad como si fuera válida. Es cómodo durante unos segundos y caro después: un error externo puede viajar silenciosamente varias funciones hasta aparecer lejos de su origen. `unknown`, en cambio, mantiene la incertidumbre visible. Es el tipo adecuado para JSON, valores de `catch`, mensajes entre procesos y datos que llegan de una red.

Dentro del `revisor`, la lista configurada es una frontera. El archivo JSON no debe alimentar directamente a `revisarTodos`; primero debe pasar por una función que demuestre que hay una lista de servicios utilizables. Después de esa función, `revisarTodos` puede conservar el contrato de la lección 5: recibe una colección de `Servicio` y devuelve una promesa de estados. No necesita saber de JSON ni de propiedades mal escritas.

### Guardas de tipo: comprobar la forma que JavaScript realmente tiene

Una guarda de tipo es una función que hace una comprobación durante la ejecución y cuya firma comunica al compilador qué aprendiste si devuelve `true`. La forma más pequeña para empezar es comprobar si algo es un registro de propiedades. `typeof valor === "object"` no basta porque en JavaScript `typeof null` también es `"object"`, y porque los arreglos son objetos aunque no representan la configuración de un servicio.

Una guarda para registro no valida por sí misma un `Servicio`. Sólo abre la puerta para consultar propiedades de manera segura. A partir de ella puedes tomar `nombre`, `url` y `timeoutMs` como valores `unknown` y validar cada uno con sus reglas. Separar esos pasos evita dar un significado demasiado amplio a una comprobación pequeña.

La figura 06_01 usa una versión simplificada y mutable de `Servicio` para aislar el riesgo de una aserción. A partir de la figura 06_02 el modelo recupera sus tres propiedades `readonly`, porque la configuración ya fue aceptada y no debe cambiar durante una revisión.

```ts
// fig06_02.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
  }

  const { nombre, url, timeoutMs } = valor;

  if (typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, detalle: "nombre debe ser texto no vacío" };
  }

  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  if (
    typeof timeoutMs !== "number" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return { ok: false, detalle: "timeoutMs debe ser un entero positivo" };
  }

  return { ok: true, valor: { nombre, url, timeoutMs } };
}

for (const entrada of [
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: "1500" },
]) {
  const resultado = leerServicio(entrada);

  if (resultado.ok) {
    console.log(`${resultado.valor.nombre}: ${resultado.valor.timeoutMs} ms`);
  } else {
    console.log(`inválido: ${resultado.detalle}`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_02.ts
$ node fig06_02.js
catálogo: 1500 ms
inválido: timeoutMs debe ser un entero positivo
```

La función devuelve `Resultado<Servicio>` y no lanza una excepción para una mala configuración esperada. Eso permite decidir en quien llama si se debe detener el arranque, mostrar todos los errores o continuar con una configuración predeterminada. Para una lista de destinos que define qué se va a revisar, detener el arranque con una explicación suele ser mejor que iniciar sólo una parte sin avisar.

La regla de entero usa `Number.isSafeInteger`, no sólo `typeof timeoutMs === "number"`. En JavaScript, `NaN`, `Infinity` y `2.5` también tienen tipo `number`, pero ninguno representa correctamente una cantidad de milisegundos entera. La parte `timeoutMs <= 0` expresa una decisión de este proyecto: cero no significa “sin límite”; es una configuración inválida. Si el producto necesitara representar “sin límite”, debería tener una alternativa deliberada, no aprovechar un número ambiguo.

Dentro del `revisor`, esta misma función convierte un objeto externo en un `Servicio` interno. El tipo `readonly` recupera su utilidad después de la frontera: una vez aceptada la configuración, nadie debería cambiar el nombre, la URL ni el límite de una revisión ya iniciada. La guarda no valida que la URL responda. Esa comprobación pertenece a la consulta asíncrona, que puede producir un `EstadoFalla` aun cuando la configuración haya sido perfectamente válida.

### JSON de configuración: validar el documento completo antes de trabajar

Un archivo JSON válido puede contener datos incorrectos para tu aplicación. `JSON.parse` sólo responde si el texto sigue la gramática de JSON; no sabe que esperas un arreglo de servicios ni que sus nombres deben ser distintos. Por ejemplo, `{"timeoutMs":"mil"}` es JSON válido, pero no es una configuración utilizable.

Conviene separar tres fallas que suelen mezclarse. La primera es no poder leer el archivo: quizá no existe o el proceso no tiene permiso. La segunda es que el texto no sea JSON válido. La tercera es que el JSON sea sintácticamente correcto, pero no cumpla el contrato del `revisor`. Cada una requiere una explicación distinta para corregirla, aunque todas impidan iniciar la revisión.

El siguiente programa carga un archivo junto al módulo. Usa `node:fs/promises`, el prefijo requerido para módulos nativos de Node, y una URL relativa a `import.meta.url` para no depender del directorio desde el que se invocó Node. El JSON se recibe como `unknown`; el arreglo se valida elemento por elemento antes de devolverse.

Esta figura usa `await` en el nivel superior del archivo. Guárdala dentro de la carpeta `figuras/` creada en la lección 1, cuyo `package.json` contiene `{"type":"module"}`; así TypeScript y Node la tratan como módulo ESM. Sin esa configuración, `await` sólo sería válido dentro de una función `async`.

```json fig06_03.servicios.json
[
  {
    "nombre": "catálogo",
    "url": "https://catalogo.example",
    "timeoutMs": 1500
  },
  {
    "nombre": "pagos",
    "url": "https://pagos.example",
    "timeoutMs": 3000
  }
]
```

```ts
// fig06_03.ts
import { readFile } from "node:fs/promises";

type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerServicio(valor: unknown): Resultado<Servicio> {
  if (!esRegistro(valor)) {
    return { ok: false, detalle: "debe ser un objeto" };
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

function leerServicios(valor: unknown): Resultado<readonly Servicio[]> {
  if (!Array.isArray(valor)) {
    return { ok: false, detalle: "la configuración debe ser un arreglo" };
  }

  const servicios: Servicio[] = [];

  for (const [indice, entrada] of valor.entries()) {
    const resultado = leerServicio(entrada);

    if (!resultado.ok) {
      return {
        ok: false,
        detalle: `servicio ${indice + 1}: ${resultado.detalle}`,
      };
    }

    servicios.push(resultado.valor);
  }

  return { ok: true, valor: servicios };
}

const archivo = new URL("./fig06_03.servicios.json", import.meta.url);
const texto = await readFile(archivo, "utf8");
const resultado = leerServicios(JSON.parse(texto) as unknown);

if (resultado.ok) {
  console.log(`configuración: ${resultado.valor.length} servicios`);
} else {
  console.log(`configuración inválida: ${resultado.detalle}`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig06_03.ts
$ node fig06_03.js
configuración: 2 servicios
```

Desde TypeScript 6, `@types/node` ya no se carga automáticamente al compilar un archivo aislado. Como esta figura importa `node:fs/promises`, `--types node` incluye de forma explícita las declaraciones de Node instaladas y permite que TypeScript reconozca ese módulo nativo. La bandera sólo aporta tipos para la compilación; Node sigue proporcionando el módulo cuando se ejecuta el programa.

El `as unknown` al final de `JSON.parse` no afirma que el documento sea válido. Hace lo contrario: evita confiar en el tipo amplio que expone la biblioteca y fuerza a `leerServicios` a tratarlo como entrada sin verificar. La evidencia llega de las comprobaciones concretas de `Array.isArray`, `esRegistro`, `typeof` y `Number.isSafeInteger`.

Este ejemplo detiene la validación en el primer servicio inválido para mantener la función corta. Otra política válida es acumular todos los problemas en un arreglo de errores, especialmente si una persona editará un archivo grande y conviene corregir todo en una sola vuelta. La regla importante no cambia: el reporte no debe iniciar hasta decidir si la configuración completa es aceptable. Silenciar una entrada inválida y continuar puede dejar servicios sin revisar sin que nadie lo note.

También falta una regla útil para producción: nombres duplicados. La lección 4 ya mostró cómo detectarlos con `Set`. Esa regla debe ejecutarse después de validar la forma de cada servicio, porque sólo entonces sabes que `nombre` es una cadena. Primero conviertes cada entrada externa a un contrato confiable; después aplicas las reglas que relacionan varios servicios entre sí.

### Variables de entorno: texto, ausencia y conversión explícita

Las variables de entorno también cruzan una frontera. En Node, `process.env.PUERTO` tiene tipo `string | undefined`, incluso si la persona que prepara el despliegue cree haber escrito un número. El sistema operativo transporta texto; no existe una variable de entorno numérica. Si el valor es `"8080"`, debes convertirlo. Si es `"ocho-mil-ochenta"`, la conversión debe fallar de forma legible.

No uses `Number(valor)` sin una decisión adicional. `Number("")` produce `0`, `Number(" ")` también produce `0`, y `Number("3.5")` produce un número aunque no sea un puerto entero. Tampoco uses `parseInt` como validación completa: `parseInt("3000ms", 10)` entrega `3000`, aceptando silenciosamente texto que probablemente era un error. Una comprobación del formato antes de convertir conserva el contrato claro.

```ts
// fig06_04.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

function leerEnteroPositivo(
  nombre: string,
  valor: string | undefined,
  predeterminado: number,
): Resultado<number> {
  if (valor === undefined) {
    return { ok: true, valor: predeterminado };
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    return {
      ok: false,
      detalle: `${nombre} debe ser un entero positivo`,
    };
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    return {
      ok: false,
      detalle: `${nombre} está fuera del rango seguro`,
    };
  }

  return { ok: true, valor: numero };
}

const entorno: Record<string, string | undefined> = {
  PUERTO: "8080",
  REVISOR_MAX_SERVICIOS: "muchos",
};

const puerto = leerEnteroPositivo(
  "PUERTO",
  entorno.PUERTO,
  3000,
);
const maximo = leerEnteroPositivo(
  "REVISOR_MAX_SERVICIOS",
  entorno.REVISOR_MAX_SERVICIOS,
  20,
);

console.log(puerto.ok ? `puerto: ${puerto.valor}` : puerto.detalle);
console.log(maximo.ok ? `máximo: ${maximo.valor}` : `máximo inválido: ${maximo.detalle}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_04.ts
$ node fig06_04.js
puerto: 8080
máximo inválido: REVISOR_MAX_SERVICIOS debe ser un entero positivo
```

El objeto `entorno` vuelve determinista el ejemplo. En el programa real, el segundo argumento será `process.env.PUERTO`. La función no necesita cambiar: sigue recibiendo una cadena o `undefined`, y devuelve un número confiable o un detalle. El valor predeterminado se usa sólo cuando la variable falta; no debe ocultar una variable presente pero mal escrita. Una ausencia puede tener un valor seguro elegido por el proyecto; una configuración explícita e inválida debe pedir corrección.

Dentro del `revisor`, la configuración de puerto pertenece al servidor de la lección 8 y la configuración de límite de servicios puede proteger el arranque. No mezcles estas variables con la lista de `Servicio`: el puerto describe cómo escucha la API; la lista describe qué destinos consulta. Tener funciones pequeñas por categoría permite dar mensajes precisos y evita que una variable arbitraria termine como propiedad opcional de un servicio.

La validación de variables de entorno también es un límite de seguridad. Nunca imprimas el contenido de todas las variables para depurar una conversión fallida: un entorno puede contener secretos. Para un valor no sensible como un puerto, puedes nombrar la variable que falló. Para una credencial futura, informa que falta o es inválida sin reproducir el secreto ni parte de él en una bitácora o respuesta HTTP.

### Esquemas y tipos derivados: una sola regla para ejecución y compilación

A medida que aparecen más entradas, escribir un tipo por un lado y una validación independiente por otro puede duplicar decisiones. Podrías actualizar `Servicio` para agregar `equipo` y olvidar actualizar el validador; el compilador vigilaría las construcciones internas, pero una entrada externa podría llegar sin el nuevo campo. Un esquema busca reducir esa distancia: es un valor que sabe leer `unknown` durante la ejecución y que además permite derivar su tipo de salida.

Un esquema no es magia. Sigue necesitando reglas explícitas para texto, enteros, URL y objetos. La diferencia es que la función de validación tiene un contrato genérico: recibe `unknown` y entrega `Resultado<T>`. El parámetro `T` describe el valor que queda disponible después de validar. Un tipo condicional puede extraer ese `T` del esquema sin escribir una segunda definición manual.

### Tipos condicionales, `infer` y tipos mapeados, paso por paso

Un **tipo condicional** es una regla de tipos con la forma `A extends B ? X : Y`: si `A` es compatible con `B`, produce `X`; de otro modo, produce `Y`. `infer` es una palabra reservada que, dentro de esa comparación, captura una parte del tipo que TypeScript puede deducir. Un **tipo mapeado** recorre las llaves de otro tipo para construir una propiedad por cada una; la forma `[K in keyof T]` significa “para cada llave `K` de `T`”. Los tres existen sólo para el compilador: no generan instrucciones de JavaScript.

Este ejemplo pequeño muestra una pieza a la vez. `Salida` es condicional porque sólo extrae `T` cuando recibe un `Esquema<T>`; `infer T` nombra ese tipo extraído. `ValoresDe` es mapeado: conserva `nombre` y `timeoutMs` de `campos`, pero reemplaza cada esquema por su salida. La compilación confirma que `servicio` tiene ambas propiedades con el tipo correcto antes de que Node imprima el texto.

```ts
// fig06_07.ts
type Esquema<T> = { ejemplo: T };

type Salida<E> = E extends Esquema<infer T> ? T : never;

type ValoresDe<T extends Record<string, Esquema<unknown>>> = {
  [K in keyof T]: Salida<T[K]>;
};

const texto: Esquema<string> = { ejemplo: "catálogo" };
const entero: Esquema<number> = { ejemplo: 1500 };

const campos = { nombre: texto, timeoutMs: entero };

type ServicioDerivado = ValoresDe<typeof campos>;

const servicio: ServicioDerivado = {
  nombre: "catálogo",
  timeoutMs: 1500,
};

console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_07.ts
$ node fig06_07.js
catálogo: 1500 ms
```

`Salida<Esquema<string>>` se resuelve en `string`; `Salida<Esquema<number>>`, en `number`. Por eso el tipo mapeado termina como `{ nombre: string; timeoutMs: number }`. Si cambias `timeoutMs` por texto en el objeto final, la compilación falla: ésa es la comprobación estática que acompaña a la salida de la figura. Ahora puedes leer la forma más compacta de `Inferir` y de `{ [K in keyof T]: ... }` que usa el esquema completo.

La siguiente implementación es deliberadamente pequeña. Enseña la relación entre una regla ejecutable y el tipo derivado; no pretende reemplazar una biblioteca de esquemas madura en un sistema grande. Observa que la única aserción está dentro de `objeto`, después de que cada llave fue validada. Queda concentrada en la infraestructura genérica, no repartida por quienes consumen datos externos.

```ts
// fig06_05.ts
type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

type Esquema<T> = {
  leer(valor: unknown): Resultado<T>;
};

type Inferir<E extends Esquema<unknown>> =
  E extends Esquema<infer T> ? T : never;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

const textoNoVacio: Esquema<string> = {
  leer(valor) {
    if (typeof valor === "string" && valor.trim() !== "") {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser texto no vacío" };
  },
};

const enteroPositivo: Esquema<number> = {
  leer(valor) {
    if (
      typeof valor === "number" &&
      Number.isSafeInteger(valor) &&
      valor > 0
    ) {
      return { ok: true, valor };
    }

    return { ok: false, detalle: "debe ser entero positivo" };
  },
};

function objeto<T extends Record<string, Esquema<unknown>>>(
  campos: T,
): Esquema<{ [K in keyof T]: Inferir<T[K]> }> {
  return {
    leer(valor) {
      if (!esRegistro(valor)) {
        return { ok: false, detalle: "debe ser un objeto" };
      }

      const salida: Record<string, unknown> = {};

      for (const [clave, esquema] of Object.entries(campos)) {
        const resultado = esquema.leer(valor[clave]);

        if (!resultado.ok) {
          return { ok: false, detalle: `${clave}: ${resultado.detalle}` };
        }

        salida[clave] = resultado.valor;
      }

      return {
        ok: true,
        valor: salida as { [K in keyof T]: Inferir<T[K]> },
      };
    },
  };
}

const esquemaServicio = objeto({
  nombre: textoNoVacio,
  url: textoNoVacio,
  timeoutMs: enteroPositivo,
});

type Servicio = Inferir<typeof esquemaServicio>;

const resultado = esquemaServicio.leer({
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
});

if (resultado.ok) {
  const servicio: Servicio = resultado.valor;
  console.log(`${servicio.nombre}: ${servicio.timeoutMs} ms`);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_05.ts
$ node fig06_05.js
catálogo: 1500 ms
```

`Inferir<typeof esquemaServicio>` no crea una validación nueva. Toma el tipo de salida que ya describe el valor `esquemaServicio`. Si agregas `equipo: textoNoVacio` al objeto de campos, el tipo derivado ganará `equipo` y la validación lo exigirá al mismo tiempo. Esta relación reduce una fuente habitual de contradicciones entre definición estática y comprobación de ejecución.

Dentro del `revisor`, un esquema puede describir tanto la configuración de entrada como una respuesta HTTP que esperas de un servicio particular. La validación de configuración construye `Servicio`; la validación de respuesta puede construir un contrato específico de ese servicio antes de que el código de revisión extraiga información útil. No debes usar un esquema genérico para fingir que todos los servicios remotos responden igual. Cada frontera necesita el contrato que realmente promete y las reglas operativas que el proyecto decide aceptar.

## El error que vas a ver

Con TypeScript 7.0.2 y `strict`, intentar leer una propiedad directamente desde `unknown` produce TS18046. Es el diagnóstico que protege la frontera: el compilador sabe que todavía no hiciste una comprobación de ejecución.

```ts
// fig06_06.ts
function nombreDe(valor: unknown): string {
  return valor.nombre;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig06_06.ts
fig06_06.ts(3,10): error TS18046: 'valor' is of type 'unknown'.
```

TS18046 no se arregla con `valor as { nombre: string }`. Esa aserción sólo cambia la opinión del compilador y deja la ejecución igual de expuesta. Primero comprueba que el valor sea un registro, toma la propiedad como `unknown` y comprueba que sea una cadena. Una guarda como `esRegistro` de la figura 06_02 resuelve la primera parte; `typeof valor.nombre === "string"` resuelve la segunda.

Otro diagnóstico común aparece cuando intentas usar una variable de entorno como número sin convertirla. `process.env.PUERTO` puede faltar y, aun cuando exista, sigue siendo texto. Si una función necesita un `number`, TypeScript no debe aceptar `string | undefined` como sustituto. La corrección es elegir una política: usar un valor predeterminado para la ausencia, rechazar el arranque o convertir y validar el texto. Ninguna de esas decisiones se expresa con una aserción de tipo.

Los errores de JSON tienen otra forma porque ocurren durante la ejecución. `JSON.parse` lanza `SyntaxError` si el archivo contiene una coma extra, falta una comilla o no tiene sintaxis JSON válida. Captura ese error cerca de la lectura del archivo y conviértelo en un mensaje de configuración. No lo confundas con un objeto de forma incorrecta: un archivo puede pasar `JSON.parse` y todavía fallar después en `leerServicios`.

## Lo que se hace mal

- **Usar `as Servicio` sobre un JSON.** La aserción no inspecciona ningún valor. Puede silenciar al compilador y retrasar la falla hasta una operación remota o una parte del panel que ya no tiene contexto sobre el archivo original.

- **Declarar el resultado externo como `any`.** `any` permite que propiedades, llamadas y conversiones avancen sin evidencia. En una frontera, esa comodidad elimina justo la comprobación que el programa necesita. Recibe `unknown` y reduce el tipo con reglas observables.

- **Validar sólo con `typeof valor === "object"`.** `null` y los arreglos obligan a manejar casos distintos. Un objeto tampoco garantiza las propiedades requeridas ni sus tipos; es sólo el primer paso de una validación de estructura.

- **Aceptar números inválidos porque `typeof valor === "number"`.** `NaN`, infinito, fracciones y valores negativos son números para JavaScript. Las reglas de dominio deben decidir qué subconjunto representa un límite, un puerto o una duración válida.

- **Convertir con `parseInt` y aceptar el resultado sin revisar el texto completo.** `parseInt("3000ms", 10)` acepta un prefijo numérico y descarta el resto. Para configuración, es preferible rechazar el valor y pedir una corrección explícita.

- **Usar valores predeterminados para ocultar una variable presente pero mal escrita.** Si `PUERTO=abc`, arrancar silenciosamente en otro puerto crea una diferencia entre la intención y el proceso real. El predeterminado es para ausencia deliberada, no para sustituir errores.

- **Repetir la definición estática y el validador sin una relación clara.** Dos listas de campos pueden separarse cuando el contrato cambia. Un esquema que derive el tipo, o pruebas que comparen ambas reglas, mantiene visible la obligación de actualizarlas juntas.

- **Mostrar secretos en errores de configuración.** Indicar el nombre de una variable faltante puede ser útil; imprimir su contenido puede exponer credenciales en terminales, bitácoras o respuestas HTTP. Diseña los mensajes para corregir sin revelar información sensible.

## Ejercicios

### Ejercicio 1 — Un lector de URL

Escribe `leerUrl(valor: unknown): Resultado<string>`. Debe aceptar sólo texto no vacío que pueda convertirse en `new URL(valor)`. Si el texto no es una URL válida, debe devolver `ok: false` con un detalle legible. Pruébalo con `https://catalogo.example` y con `no-es-url`.

### Ejercicio 2 — Lista con nombres únicos

Parte de `leerServicios` de la figura 06_03. Después de validar cada entrada individual, usa un `Set<string>` para rechazar nombres duplicados. El error debe mencionar el nombre repetido. Prueba una lista con dos entradas llamadas `pagos` y confirma que no se entrega una lista parcial al código de revisión.

### Ejercicio 3 — Configuración de arranque

Define un tipo `ConfiguracionServidor` con `puerto` y `maxServicios`, ambos números enteros positivos. Escribe `leerConfiguracion(entorno: Record<string, string | undefined>): Resultado<ConfiguracionServidor>`. Usa `3000` como predeterminado para el puerto y `20` para el máximo de servicios. Una variable presente con contenido inválido debe producir un error, no activar el predeterminado.

### Ejercicio 4 — Esquema de respuesta disponible

Usa el patrón `Esquema<T>` e `Inferir` para crear un esquema de una respuesta con `codigoHttp` entero positivo y `duracionMs` entero no negativo. Deriva su tipo de salida y escribe una función que reciba ese tipo y produzca `HTTP 200 en 42 ms`. Explica por qué esa función no debe recibir directamente el resultado de `JSON.parse`.

## Soluciones

### Solución 1

La función primero confirma que recibió texto y después delega la sintaxis a `URL`. El constructor puede lanzar, por lo que se captura únicamente para convertir una entrada inválida en el resultado esperado de la validación.

```ts
function leerUrl(valor: unknown): Resultado<string> {
  if (typeof valor !== "string" || valor.trim() === "") {
    return { ok: false, detalle: "url debe ser texto no vacío" };
  }

  try {
    new URL(valor);
    return { ok: true, valor };
  } catch {
    return { ok: false, detalle: "url no tiene un formato válido" };
  }
}
```

No hace falta que esta función consulte la red. Una URL bien formada puede apuntar a un destino que no existe; ésa es una falla de la revisión asíncrona, no de la configuración.

### Solución 2

Los nombres se revisan después de que cada objeto individual produjo un `Servicio`. Así `servicio.nombre` ya es una cadena confiable y no necesitas mezclar validación de tipos con la regla de unicidad.

```ts
function sinDuplicados(
  servicios: readonly Servicio[],
): Resultado<readonly Servicio[]> {
  const nombres = new Set<string>();

  for (const servicio of servicios) {
    if (nombres.has(servicio.nombre)) {
      return {
        ok: false,
        detalle: `nombre duplicado: ${servicio.nombre}`,
      };
    }

    nombres.add(servicio.nombre);
  }

  return { ok: true, valor: servicios };
}
```

La carga completa puede llamar primero a `leerServicios` y, si tiene éxito, pasar `resultado.valor` a `sinDuplicados`. Si cualquiera falla, no se inicia ninguna consulta.

### Solución 3

La configuración reúne decisiones de arranque que no pertenecen a un servicio individual. Cada conversión conserva el nombre de la variable en el detalle para facilitar la corrección.

```ts
type ConfiguracionServidor = {
  puerto: number;
  maxServicios: number;
};

function leerConfiguracion(
  entorno: Record<string, string | undefined>,
): Resultado<ConfiguracionServidor> {
  const puerto = leerEnteroPositivo(
    "PUERTO",
    entorno.PUERTO,
    3000,
  );

  if (!puerto.ok) {
    return puerto;
  }

  const maxServicios = leerEnteroPositivo(
    "REVISOR_MAX_SERVICIOS",
    entorno.REVISOR_MAX_SERVICIOS,
    20,
  );

  if (!maxServicios.ok) {
    return maxServicios;
  }

  return {
    ok: true,
    valor: {
      puerto: puerto.valor,
      maxServicios: maxServicios.valor,
    },
  };
}
```

El valor predeterminado se aplica sólo en la rama `valor === undefined`. Una cadena vacía o un número negativo recorren la rama de error y obligan a corregir el entorno.

### Solución 4

El tipo derivado sólo existe después de validar el objeto. La función de presentación recibe una respuesta ya confiable y no tiene que repetir comprobaciones de `unknown`.

```ts
const respuestaDisponible = objeto({
  codigoHttp: enteroPositivo,
  duracionMs: {
    leer(valor: unknown): Resultado<number> {
      if (
        typeof valor === "number" &&
        Number.isSafeInteger(valor) &&
        valor >= 0
      ) {
        return { ok: true, valor };
      }

      return { ok: false, detalle: "debe ser entero no negativo" };
    },
  },
});

type RespuestaDisponible = Inferir<typeof respuestaDisponible>;

function lineaRespuesta(respuesta: RespuestaDisponible): string {
  return `HTTP ${respuesta.codigoHttp} en ${respuesta.duracionMs} ms`;
}
```

`JSON.parse` debe pasar primero por `respuestaDisponible.leer`. Sin esa validación, el tipo derivado sólo sería una promesa estática sobre un valor que puede tener otra forma durante la ejecución.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2`.
- [ ] Al compilar y ejecutar `fig06_01.ts`, aparecen `string` y `rápido`, demostrando que una aserción no transforma el JSON.
- [ ] Al compilar y ejecutar `fig06_02.ts`, aparece un servicio válido y después el detalle de que `timeoutMs` debe ser un entero positivo.
- [ ] Al compilar y ejecutar `fig06_03.ts`, aparece exactamente `configuración: 2 servicios`.
- [ ] Al compilar y ejecutar `fig06_04.ts`, aparece el puerto `8080` y un error para `REVISOR_MAX_SERVICIOS`.
- [ ] Al compilar y ejecutar `fig06_07.ts`, aparece `catálogo: 1500 ms`; cambiar `timeoutMs` por texto impide compilar, porque el tipo fue derivado de los esquemas.
- [ ] Al compilar `fig06_06.ts`, aparece TS18046 en la línea que intenta leer `nombre` desde `unknown`.
- [ ] En `fig06_03.ts`, con `figuras/package.json` configurado como módulo ESM, la compilación y la ejecución terminan con `configuración: 2 servicios`.

## Para leer más

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentación oficial sobre guardas de tipo y reducción de `unknown`; consultado el 2 de octubre de 2026.
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) — documentación oficial sobre tipos condicionales e inferencia con `infer`; consultado el 2 de octubre de 2026.
- [Node.js: `process.env`](https://nodejs.org/api/process.html#processenv) — documentación oficial sobre variables de entorno en Node; consultado el 2 de octubre de 2026.
- [MDN: `JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — referencia de JavaScript sobre análisis de texto JSON y sus errores de sintaxis; consultado el 2 de octubre de 2026.
