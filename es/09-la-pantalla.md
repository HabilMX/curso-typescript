# Lección 9 — La pantalla y el programa terminado

**Tiempo:** 2 × 45 min

**Qué construyes:** el panel web y el paquete final

**Qué aprendes:** React con TypeScript, hooks, tipos compartidos front–back, seguridad básica (XSS), compilar y publicar

## Al terminar vas a poder

- Escribir componentes de React en archivos `.tsx` con propiedades tipadas y una unión discriminada del `revisor`.
- Usar `useState` y `useEffect` para cargar datos de la API con estados de carga y de error, y cancelar la solicitud cuando el componente desaparece.
- Compartir entre el servidor y el navegador un mismo contrato, con su tipo y su validación en ejecución, sin arrastrar código de Node a la pantalla.
- Reconocer una inserción de HTML sin sanitizar, explicar por qué abre una vulnerabilidad XSS y bloquearla con el tipo, con ESLint y con una política de seguridad de contenido.
- Empaquetar el panel con esbuild y servirlo desde el mismo proceso que la API.
- Probar el panel en un DOM real y el paquete completo contra el servidor, y decir con honestidad qué comprobó cada prueba y qué sólo puede comprobar un navegador.
- Preparar el artefacto que se publica: qué lleva, qué no lleva y cómo se instala sin dependencias de desarrollo.

## El porqué antes del cómo

Hasta la lección anterior, el `revisor` ya hace el trabajo difícil: valida una configuración, consulta servicios reales de forma concurrente, representa las fallas como datos, expone una API HTTP, y se cierra con orden. Sin embargo, una respuesta JSON sigue siendo una interfaz pensada para otro programa. Una persona que necesita saber si `pagos` está fallando puede abrir la ruta, leer una estructura larga y buscar a ojo los campos importantes. Eso sirve para diagnosticar; no es una buena pantalla de operación.

El panel cambia la pregunta de «¿qué datos tiene el sistema?» por «¿qué necesita ver alguien para tomar una decisión?». Un reporte debe mostrar primero el nombre del servicio, si está disponible o en falla y el dato que explica esa conclusión: código HTTP y duración para una respuesta disponible, detalle para una falla. Debe decir cuándo todavía está cargando y qué pasó cuando la carga falló, porque una pantalla que se queda en blanco no distingue «no hay servicios» de «no pude preguntar». Y debe actualizarse sola, porque un reporte de disponibilidad que se queda viejo es peor que no tenerlo.

React ayuda a describir esa pantalla como componentes. Un **componente** es una función que recibe propiedades y devuelve una descripción de interfaz. React se encarga de convertir esa descripción en elementos del navegador y de actualizarlos cuando cambian los datos. Eso no reemplaza las reglas construidas en las lecciones anteriores: el panel debe consumir un contrato ya decidido, no inventar por su cuenta qué códigos son exitosos, qué significa un tiempo límite ni cómo se valida la configuración.

Ese contrato ya existe. La lección 8 separó el modelo interno del público: el servidor necesita un `Servicio` completo, con `nombre`, `url` y `timeoutMs`, para hacer consultas, y un `Estado` interno conserva ese servicio porque la lógica de revisión lo necesita. El navegador sólo necesita `ReportePublico`, que no lleva la URL ni el tiempo límite. Esta lección aprovecha lo que esa separación deja listo: `src/contrato.ts` no importa nada de Node, así que el mismo archivo, con su tipo y su validación, viaja al navegador junto con el panel. Compartir tipos no significa compartir todo; significa compartir lo que realmente cruza la frontera, y compartirlo una sola vez para que servidor y pantalla no puedan discrepar sin que el compilador lo note.

Esto reduce una clase de desacuerdos, pero no elimina la frontera de red. Los tipos de TypeScript se borran antes de ejecutar, como viste en la lección 0: el navegador recibe bytes de JSON, no una instancia viva de `ReportePublico`. Por eso el panel usa el mismo patrón de la lección 6: lo que llega por `fetch` es `unknown` hasta que `esReportePublico` demuestra lo contrario. El tipo compartido dice qué espera el panel; la validación comprueba que lo recibido lo cumple. Sin la primera, servidor y panel se desincronizan en silencio; sin la segunda, un proxy que devuelva una página de error con código 200 hace que la pantalla compile, arranque y falle después.

La pantalla también introduce un riesgo que no existe al imprimir en consola: el navegador interpreta HTML. El `detalle` de una falla puede contener texto que viene de un servicio remoto, de una configuración o de una persona. Si ese texto se inserta como HTML, puede cerrar una etiqueta, crear elementos nuevos o intentar ejecutar código en el contexto de quien abrió el panel. Esa familia de vulnerabilidades se llama **XSS**, por *cross-site scripting*. No es un problema de «texto raro»: es un problema de confundir datos con instrucciones para el navegador, y es una de las fallas más repetidas de la web.

En Go, la separación se parece a construir una estructura específica para una respuesta HTTP y entregarla a una plantilla con escape automático. La idea no depende del lenguaje: el modelo interno contiene lo que el programa necesita para operar; el modelo público contiene sólo lo necesario para comunicar el resultado; y el texto de fuera nunca se trata como código. TypeScript aporta una ventaja cuando servidor y pantalla viven en el mismo repositorio: el contrato puede nombrarse una vez y verificarse en ambos lados antes de ejecutar.

Por último, el producto terminado no es sólo el código que se ve bien en tu computadora. Incluye una forma repetible de construirlo, dependencias registradas, una salida que puede inspeccionarse y una configuración segura para arrancarla. Publicar no es copiar a ciegas todo el directorio ni subir secretos junto con el código: es generar un artefacto conocido, comprobar qué contiene, instalar únicamente lo necesario para ejecutar y desplegar con límites claros de red, origen y configuración. Al final de la lección el `revisor` queda completo: un solo proceso Node que revisa los servicios de `servicios.json`, responde `GET /api/estados` y sirve el panel que consume esa respuesta.

Esta lección conserva, igual que la 8, la estructura del proyecto: entrada `src/main.ts`, `rootDir` `./src`, `outDir` `./dist`, y los scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` y `formato`, con un script nuevo, `empaquetar`. Lo que se instala de nuevo se explica en su momento: React, un empaquetador (esbuild) y un DOM de prueba (jsdom). Las figuras de un archivo se ejecutan en la carpeta `figuras/` de la lección 1; sólo necesitan que instales ahí las mismas dependencias que usa el proyecto.

```bash
cd ~/proyectos/figuras
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@29.1.1 @types/jsdom@28.0.3
```

## Los conceptos

### Componentes y JSX: una función que describe una parte de la pantalla

JSX parece HTML dentro de TypeScript, pero no es una cadena de HTML que el navegador recibe tal cual. Es una sintaxis que TypeScript transforma en llamadas a React. Por eso el archivo debe terminar en `.tsx` y la compilación debe habilitar `--jsx react-jsx`. Ese modo usa el *runtime* automático de React: no necesitas importar un identificador llamado `React` sólo para que JSX compile, aunque sí importas los valores concretos que uses, como los hooks.

Un componente de función recibe un objeto de propiedades, normalmente desestructurado en sus parámetros, y devuelve JSX. Las propiedades son un contrato igual que los parámetros de cualquier otra función. Si una fila necesita un estado, el tipo de la propiedad debe decirlo. No la declares como `unknown`, `any` o un objeto con propiedades opcionales sólo para «hacer que la pantalla pinte»: eso trasladaría a la pantalla una incertidumbre que el modelo ya resolvió.

El siguiente programa usa el mismo patrón de unión discriminada de la lección 3. La fila atiende `disponible` y `falla` por separado: en la primera rama puede leer `codigoHttp`; en la segunda, `detalle`. No hace falta preguntar si los campos existen ni llenar el modelo de propiedades opcionales ambiguas. En esta figura, `EstadoPublico` se simplifica respecto del contrato real del proyecto: no lleva `duracionMs`, para que el ejemplo sea corto.

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

`renderToStaticMarkup` convierte un componente en una cadena de HTML sin necesidad de un navegador. **Renderizar** es eso: convertir la descripción que devuelve el componente en HTML o en elementos visibles. Aquí sirve para ver qué produce el componente con datos controlados. No agrega interactividad: genera HTML estático, sin estado y sin efectos, y por eso no es lo que usa el panel final. Que un componente se pueda ejecutar así, como una función cualquiera, es justamente lo que lo vuelve fácil de probar.

Los componentes no necesitan ser clases. Una función con propiedades tipadas es una pieza ordinaria de TypeScript: se puede extraer, probar y leer sin aprender una jerarquía especial. React se encarga de interpretar el JSX devuelto. La comparación con Go no es literal, porque Go no tiene JSX, pero la separación sí es familiar: una función de presentación recibe una estructura ya válida y produce una representación para quien la consume.

Dentro del `revisor`, la división es pequeña. `Panel` pide los datos y decide qué pantalla toca según la carga; `Contenido` elige entre cargando, error y lista; `FilaEstado` recibe un `EstadoPublico` y lo dibuja. Ninguno decide qué ruta HTTP existe, ni lee variables de entorno, ni sabe qué códigos HTTP significan «disponible»: eso ya lo decidió el servidor y llega en el campo `tipo`.

### Hooks: estado y efectos

Un componente que sólo dibuja datos recibidos es el caso fácil. El panel necesita más: pedir datos a la API, esperar, mostrar «Cargando…», reemplazarlo con la lista cuando llegue, mostrar un error si la API falla, y repetirlo cada cierto tiempo. Para eso React ofrece los **hooks**, funciones cuyo nombre empieza con `use` que conectan un componente con capacidades de React. Hay dos que necesitas ahora.

`useState` le da memoria al componente. `const [total, establecerTotal] = useState<number | undefined>(undefined)` declara un valor, `total`, que React conserva entre dibujos, y una función, `establecerTotal`, que lo cambia. Llamar a esa función no modifica la variable en el momento: le pide a React que vuelva a ejecutar el componente con el valor nuevo. El tipo entre ángulos describe qué valores admite; con una unión discriminada, el tipo del estado dice exactamente qué pantallas existen.

`useEffect` ejecuta trabajo que no es dibujar. Dibujar debe ser una función pura de las propiedades y el estado; pedir datos a una red, programar un temporizador o suscribirse a algo es un **efecto**, y debe hacerse después de que React dibujó, no durante. `useEffect(() => { ... }, [])` recibe una función y una lista de dependencias. La función corre después del primer dibujo; si devuelve otra función, esa función de limpieza corre cuando el componente desaparece o cuando cambia alguna dependencia, antes de repetir el efecto. La lista de dependencias es la parte que más se equivoca: dice de qué valores depende el efecto, y React lo repite sólo cuando alguno cambia. Una lista vacía significa «sólo al montarse».

La figura siguiente es lo más pequeño que muestra el ciclo completo. Un componente pide, mediante un efecto, un número que tarda 10 ms en llegar; mientras tanto muestra «Cargando…»; al llegar, lo guarda en el estado y React lo vuelve a dibujar. Para ejecutarlo en Node, sin navegador, la figura crea un documento simulado con jsdom, una implementación de DOM escrita en JavaScript, y lo instala como `document` y `window` globales; React lo usa como si fuera el del navegador. `act` es la herramienta de React para pruebas: ejecuta el código que provoca cambios, espera a que React termine de aplicarlos y sólo entonces devuelve el control, de modo que lo que lees a continuación es lo que vería una persona.

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

Tres cosas se ven en esa salida. El primer dibujo muestra «Cargando…» porque el estado inicial es `undefined`. El efecto empezó después de ese dibujo, no antes. Y cuando la promesa se resolvió, `establecerTotal(2)` provocó un segundo dibujo con el valor nuevo. Observa también lo que no hace la figura: no usa `setTimeout` dentro del componente ni llama a `contarServicios()` en el cuerpo de la función. Si la llamaras en el cuerpo, se ejecutaría en cada dibujo, y como cada respuesta cambia el estado y provoca otro dibujo, tendrías un bucle de solicitudes.

Hay una trampa que conviene nombrar ahora. Un efecto que pide datos puede terminar después de que el componente ya no existe: la persona cambió de pantalla o, en las pruebas, desmontaste el árbol. Si la respuesta llega entonces y llama a `establecerTotal`, intentas actualizar un componente que no está. La defensa es la limpieza del efecto: el panel crea un `AbortController` en cada efecto, entrega su señal a `fetch` y la aborta en la función de limpieza, exactamente el mecanismo de cancelación que conoces de la lección 5, que ahora cumple una tarea nueva. Y cuando la solicitud se aborta, el `catch` lo reconoce con `control.signal.aborted` y no escribe ningún estado de error: ser cancelado no es una falla.

### Tipos compartidos: un contrato, dos lados

La lección 8 creó `src/contrato.ts` con tres piezas: el tipo `EstadoPublico`, el tipo `ReportePublico` y la guarda `esReportePublico`. El servidor las usa para construir su respuesta (`aReportePublico` devuelve un `ReportePublico`) y el panel las usa para recibirla. Esa es la forma concreta de «tipos compartidos front–back»: no un paquete publicado, ni una herramienta de generación de código, sino un archivo del mismo proyecto que ambos lados importan.

Dos reglas hacen que funcione. La primera: el archivo compartido sólo contiene lo que tiene sentido en ambos entornos. `contrato.ts` importa únicamente `esRegistro` de `configuracion.ts`, una función pura sin dependencias de Node. Si importara `node:fs` o `node:http`, el empaquetador intentaría llevarlo al navegador, que no tiene esos módulos, y el empaquetado fallaría o, peor, produciría un paquete roto. La palabra «compartido» no autoriza a compartir código que sólo sirve en Node, ni a que el navegador arrastre funciones que leen archivos o secretos. Comparte tipos y transformaciones puras; deja las fronteras de red, disco y entorno en sus capas.

La segunda regla: lo compartido es el contrato público, no el modelo interno. Si el panel importara `Estado`, con su `Servicio`, el servidor tendría que serializar la URL de cada servicio para que la respuesta cumpliera ese tipo, o el panel quedaría convencido de que recibe datos que la red en realidad no trae; en ambos casos el tipo interno estaría dictando lo que se publica. Si alguien cambia `duracionMs` por `duracion` en `contrato.ts`, TypeScript señalará tanto el conversor del servidor, `aEstadoPublico`, como la fila del panel que lee el campo anterior. Ese es el beneficio: el desacuerdo se detecta al compilar, no al ver una pantalla vacía en producción.

Aun así, un tipo no valida nada en ejecución. Cuando el navegador recibe el cuerpo de `GET /api/estados`, `await respuesta.json()` entrega un valor de una frontera externa, y la tentación es escribir esto:

```ts
const reporte = (await respuesta.json()) as ReportePublico;
```

La aserción no inspecciona la respuesta. Si una versión antigua de la API devuelve `codigo` en vez de `codigoHttp`, o si un proxy devuelve una página HTML con código 200, la pantalla compila y falla después. El panel conserva la práctica de la lección 6: recibe `unknown`, llama a `esReportePublico` y sólo entonces produce un `ReportePublico`. Antes de parsear, además, revisa el código HTTP: una respuesta `503` puede traer JSON válido y no ser el reporte que el panel esperaba. **Parsear** es transformar una representación serializada, como un texto JSON, en valores de JavaScript, que todavía debes validar. No conviertas una respuesta no exitosa en una lista vacía: eso haría que una falla de la API se vea como «todo está bien, pero no hay servicios».

Esa validación ocurre una vez, en `cargar.ts`, junto a la llamada HTTP. `Panel` no recibe `unknown` ni pregunta si `reporte.estados` es un arreglo. Un componente que hace validación de red, ordenamiento, formato y JSX a la vez termina siendo difícil de probar y de leer. La capa que obtiene datos responde «¿la respuesta cumple el contrato?»; el panel responde «¿cómo se muestra un contrato ya confiable?». Y esa separación abre una puerta que usarás en las pruebas: `Panel` no sabe de dónde vienen los datos; recibe una función `cargar`, de modo que una prueba le entrega una función controlada y el programa real le entrega `cargarReporte`.

### XSS: texto externo no debe convertirse en instrucciones

XSS ocurre cuando datos que otra parte controla terminan interpretados como HTML o JavaScript dentro de una página. Una falla parece un origen inocente: un servicio remoto devuelve un texto de error, el `revisor` lo conserva como `detalle` y el panel lo muestra. Pero ese texto lo escribe quien controla el servicio remoto, y podría ser `<img src=x onerror=alert(1)>`. Si el panel inserta esa cadena como HTML, el navegador crea un elemento `img`, la imagen no carga y el atributo `onerror` ejecuta código en la página, con los permisos de quien la tiene abierta.

La defensa principal es mantener el tipo semántico correcto. Un detalle es texto; por tanto, debe ser un hijo de JSX, como `{detalle}`. React lo trata como texto y escapa los caracteres que significan algo para HTML: `<` pasa a `&lt;`, `>` a `&gt;`, `&` a `&amp;`. La figura siguiente lo demuestra: aunque la entrada contiene una etiqueta, la salida contiene `&lt;` y `&gt;`, que el navegador muestra como caracteres visibles en vez de interpretar como una imagen.

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

Compara con la alternativa. React tiene una propiedad que se llama, a propósito, `dangerouslySetInnerHTML`: «establecer HTML de forma peligrosa». Su nombre existe para detenerte antes de usarla. React no puede saber si el HTML que le das lo generó una fuente confiable, lo limpió un sanitizador vigente o llegó de una red sin validar; así que deja de escapar y lo inserta tal cual. La misma figura, con esa propiedad, produce otra cosa:

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

Esa segunda salida es el defecto. La etiqueta `img` ya no está escrita como texto: es un elemento que el navegador va a crear. Lo mismo ocurre sin React: asignar a `elemento.innerHTML` un texto que viene de fuera tiene exactamente el mismo problema, y por eso tampoco debe aparecer en el panel. Cuando lo que necesitas es mostrar texto sin React, `elemento.textContent = texto` hace lo correcto, porque el navegador no interpreta lo que asignas por esa vía.

Un error común es escribir una función casera que reemplaza sólo `<script>` o elimina una palabra concreta. HTML tiene atributos de eventos, URL con esquema `javascript:`, entidades, SVG, estilos y variaciones de codificación; una lista incompleta de reemplazos crea una falsa sensación de seguridad. Si algún producto realmente necesita mostrar HTML ajeno, por ejemplo contenido editorial con negritas, la respuesta es un **sanitizador** mantenido y probado, que recorre el HTML y deja sólo un subconjunto permitido de etiquetas y atributos, aplicado antes del punto de dibujo y con pruebas con entradas hostiles. Para los detalles operativos del `revisor` no existe ese requisito, y el diseño correcto es no interpretar HTML en absoluto.

Como una regla que nadie vigila se olvida, el proyecto la convierte en una comprobación automática. El `eslint.config.js` de esta lección agrega la regla `no-restricted-syntax` con dos selectores: uno prohíbe el atributo `dangerouslySetInnerHTML` y otro la asignación a `innerHTML`. Si alguien escribe cualquiera de las dos cosas, `npm run lint` falla con el mensaje que tú escribiste. Esto es lo que imprime con un archivo de prueba, `src/panel/Mala.tsx`, que contiene las dos cosas (bórralo después):

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

Una regla de lint no es una defensa completa: no ve una asignación hecha por otra vía, y alguien puede desactivarla. Por eso el proyecto agrega una segunda capa que no depende de que nadie recuerde nada: una **política de seguridad de contenido**, o CSP (*Content Security Policy*). Es un encabezado de la respuesta que le dice al navegador qué recursos tiene permitido cargar o ejecutar en esa página. El servidor la envía con la página: `default-src 'none'` prohíbe todo por omisión, y después se permite únicamente lo que el panel necesita: `script-src 'self'` (sólo scripts servidos desde el mismo origen que la página, lo que bloquea un `<script>` o un `onerror` insertado en línea), `style-src 'self'`, y `connect-src 'self'` (el panel sólo puede hacer `fetch` a su propio origen). Además `frame-ancestors 'none'` impide que otra página meta la tuya en un marco, `base-uri 'none'` bloquea que se cambie la base de las rutas relativas y `form-action 'none'` evita que un formulario inyectado envíe datos a otro sitio. La CSP no cambia el hecho de que una inserción insegura sea un defecto; es la red debajo del trapecista, no un permiso para dejar de mirar.

Quedan dos recordatorios. Primero, si el panel algún día muestra una URL, no construyas atributos concatenando cadenas: pasa el valor como propiedad de JSX y valida el protocolo que tu producto permite, porque un `href` con `javascript:` ejecuta código aunque no contenga ninguna etiqueta. Los tipos describen texto; la política de seguridad decide qué texto es un destino permitido. Segundo, el contrato público ya hace su parte: la URL interna de cada servicio no llega al panel, lo que reduce tanto la exposición de infraestructura como la cantidad de texto externo que podría tocar la página. La seguridad no es una línea de código al final; empieza por decidir qué valores cruzan cada frontera.

### El panel por dentro

El panel son cuatro archivos pequeños en `src/panel/`, más una hoja de estilos. Conviene leerlos en el orden en que el navegador los usa.

`cargar.ts` es la frontera de red del panel. Define el tipo `Cargar`, una función que recibe una `AbortSignal` y devuelve una promesa con un `ReportePublico`, y la implementación real, `cargarReporte`. Esta pide `/api/estados` con la señal, revisa `respuesta.ok` y lanza «la API respondió 503» si no lo es, convierte el cuerpo con `respuesta.json()` a `unknown` (una anotación, sin aserción) y lo pasa por `esReportePublico`; si falla, lanza «la API no entregó un reporte válido». El segundo parámetro, `base`, vale `""` en el navegador, donde `/api/estados` se resuelve contra la página que lo cargó, y las pruebas lo usan para apuntar a un servidor local con su dirección completa. Los tres desenlaces (reporte, código inválido, contrato incumplido) tienen una prueba, `cargar.test.ts`, contra un servidor HTTP real que responde lo que cada caso necesita.

`useReporte.ts` es un hook propio, es decir, una función cuyo nombre empieza con `use` y que combina otros hooks. Declara el tipo `Carga` como una unión discriminada de tres alternativas: `cargando`, `listo` con el reporte y `error` con el detalle. Es el patrón de la lección 3 aplicado al estado de una pantalla, y tiene la misma ventaja: es imposible representar «listo» sin reporte, o «error» sin detalle. El hook guarda ese estado con `useState`, y un número `intento` que sólo sirve para pedirle al efecto que se repita. El efecto crea un `AbortController`, define `pedir`, que llama a `cargar(control.signal)` y guarda `listo` o `error`, la ejecuta una vez, programa `setInterval` para repetirla cada `cadaMs` milisegundos, y devuelve la limpieza que aborta la solicitud y detiene el temporizador. Devuelve el estado y `recargar`, que pone la carga en `cargando` y aumenta `intento`; como `intento` está en la lista de dependencias, el efecto se limpia y se repite.

La lista de dependencias, `[cargar, cadaMs, intento]`, merece una pausa porque es donde se esconden los errores sutiles. `cargar` está ahí porque el efecto la usa: si cambiara, el efecto debe repetirse con la nueva. Eso exige que quien llama pase una función estable: si `Panel` recibiera una función nueva en cada dibujo, el efecto se repetiría en cada dibujo y tendrías el bucle de solicitudes que ya conoces. `cliente.tsx` monta la aplicación una sola vez con `render(...)`, y no vuelve a ejecutarse: la función flecha que pasa como propiedad se crea esa única vez y es la misma durante toda la vida del panel. Si la creara un componente que se dibuja muchas veces, tendrías que fijarla con `useCallback` o declararla fuera de él. ESLint, en este proyecto, no revisa listas de dependencias; el paquete oficial que lo hace es `eslint-plugin-react-hooks`, y es una buena siguiente instalación para un proyecto de React más grande.

`Panel.tsx` es sólo presentación. `Contenido` recibe un `Carga` y elige qué dibujar con un `switch` cuyo `default` usa la guarda `never` de la lección 3: si mañana agregas la alternativa `vacio` a `Carga` y olvidas dibujarla, el compilador lo dice. Cada pantalla lleva un atributo `role` (`status` para «Cargando…» y `alert` para el error) que sirve a los lectores de pantalla para anunciarlos, y a las pruebas para encontrarlos sin depender del texto exacto. `FilaEstado` es la de la figura 1, ahora con `duracionMs` y una clase CSS por tipo. `Panel` junta el hook, el contenido y un botón «Actualizar» que llama a `recargar`. Cada fila lleva como `key` la posición junto con el nombre: `servicios.json` no obliga a que los nombres sean únicos, y dos filas con la misma clave confundirían a React; como la lista se reemplaza entera en cada carga y las filas no guardan estado, la posición no causa ningún problema.

`cliente.tsx` es el único archivo que toca el documento. Busca el elemento `#raiz`, falla de forma explícita si no existe y monta el panel con `createRoot(raiz).render(...)`. Es la frontera entre React y la página, y por eso es lo único que las pruebas de componentes no importan: las pruebas montan `Panel` por su cuenta, en un documento simulado.

La hoja `panel.css` es CSS ordinario y no toca TypeScript, con una decisión deliberada: no hay atributos `style` en el JSX. Un atributo `style` en línea violaría la política `style-src 'self'` que el servidor envía, porque el navegador trata el estilo en línea como código que no viene del origen. Todo el aspecto vive en la hoja, que el navegador carga desde el mismo origen.

### Del código al navegador: empaquetar con esbuild

Hasta ahora todo lo que compilaste corre en Node. El panel corre en un navegador, y un navegador no sabe ejecutar `.tsx`, ni resolver `import { createRoot } from "react-dom/client"`, que es el nombre de un paquete y no la ruta de un archivo. Hay que producir un único archivo de JavaScript que el navegador pueda cargar con una etiqueta `<script>`. Esa tarea se llama **empaquetar**, y la hace un **empaquetador**: parte de un archivo de entrada, sigue todos los `import`, junta lo que encuentra y escribe el resultado.

El proyecto usa esbuild, un empaquetador de código abierto, muy rápido, cuya documentación oficial está en `esbuild.github.io`. El script `empaquetar` es una sola línea:

```text
esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Cada opción tiene un motivo. Los dos primeros argumentos son los archivos de entrada: el programa del panel y la hoja de estilos. `--bundle` es lo que hace que esbuild siga los `import`, incluidos los de `react` y `react-dom`, y los incluya en la salida; sin esa opción, sólo traduciría el archivo y dejaría el `import` de un paquete que el navegador no podría resolver. `--minify` quita espacios y acorta nombres para que el archivo pese menos, y tiene un efecto que importa: cuando se usa, esbuild define `process.env.NODE_ENV` como `"production"`, y React incluye entonces su versión de producción, sin las comprobaciones y avisos de desarrollo. `--format=iife` escribe el resultado como una función que se ejecuta de inmediato; funciona con un `<script>` común, sin depender de módulos del navegador. `--log-level=warning` calla los mensajes informativos y deja sólo avisos y errores. `--outdir=dist/publico` pone el resultado en `dist/publico/`, que es lo que el servidor lee: `cliente.js` y `panel.css`.

Hay una consecuencia que desconcierta si no se dice. esbuild convierte TypeScript a JavaScript borrando los tipos, pero no los verifica. Quien comprueba los tipos sigue siendo `tsc`: por eso `npm run verificar` existe y por eso `npm run empaquetar` puede empaquetar un archivo con errores de tipo sin quejarse. Los dos comandos hacen trabajos distintos: uno responde si el programa es correcto, el otro produce lo que se entrega. Un pipeline que sólo empaquetara no habría comprobado nada.

Otra consecuencia: el mismo `tsconfig.json` ahora compila a la vez el servidor y el panel. Por eso incluye `"jsx": "react-jsx"` y `"lib": ["ES2022", "DOM"]`, que declara los tipos del navegador (`document`, `window`, `HTMLElement`). Es una simplificación con un costo: el código del servidor también «ve» `document`, y un descuido que lo use compilaría y fallaría al ejecutar. En un proyecto más grande se separan en dos configuraciones, una para el servidor y otra para el panel, que comparten el archivo `contrato.ts`; aquí una sola mantiene la lección enfocada.

Fíjate, por último, en dónde quedan React y React DOM. Como el empaquetador los copia dentro de `cliente.js`, el servidor que corre en producción no los importa: se instalan con `--save-dev`, porque sólo se necesitan para construir y para probar. Es una diferencia contraintuitiva frente a una aplicación que dibuja en el servidor, y tiene una consecuencia práctica que verás en «Compilar y publicar»: el artefacto de producción no necesita ninguna dependencia.

### El servidor sirve el panel

En la lección 8, `crearServidor` recibía dos cosas: una función que obtiene el reporte y una bitácora. Ahora recibe una tercera, `leerActivo`, la función que entrega el contenido de los dos archivos que el empaquetador produce. Un **activo** es un archivo estático que el servidor entrega tal cual, como un script o una hoja de estilos. El tipo `Activo` es la unión `"cliente.js" | "panel.css"`: no hay manera de pedir un archivo que no esté en esa lista. Esa es la defensa contra una vulnerabilidad clásica, el **recorrido de rutas** (*path traversal*): un servidor que arma la ruta de un archivo con lo que llega en la URL, como `/../../etc/passwd`, termina entregando archivos que nunca quiso publicar. Aquí la URL sólo se compara con dos rutas conocidas y el nombre del archivo lo decide el programa, no el cliente; cualquier otra ruta es un `404` de la misma `Ruta` de la lección 8. `main.ts` entrega la implementación real, `readFile` sobre `dist/publico/<activo>`, resuelta con `import.meta.url` para que funcione sin importar desde qué carpeta arranques el proceso.

La unión `Ruta` crece con dos alternativas, `pagina` para `GET /` y `activo` para los dos archivos, y el `switch` con `never` hace que el compilador te obligue a atender cada una. La página, `pagina.ts`, es un documento HTML mínimo guardado como constante de texto: un `<div id="raiz">`, el enlace a `/panel.css` y el `<script src="/cliente.js" defer>`. El atributo `defer` hace que el navegador ejecute el script cuando termina de leer el documento, de modo que `#raiz` ya existe.

Las respuestas ganan encabezados de seguridad. Todas llevan `x-content-type-options: nosniff`, que le prohíbe al navegador adivinar un tipo de contenido distinto del declarado (sin él, un navegador podría tratar un texto como script). La página lleva además la política CSP de la sección anterior. Las respuestas JSON llevan `cache-control: no-store`, porque el estado de los servicios cambia y nadie debería ver un reporte guardado en la memoria de un intermediario. Y si leer un activo falla, por ejemplo porque olvidaste correr `npm run empaquetar`, el error se registra en la bitácora con su causa y el cliente recibe un `500` genérico, como en la lección 8.

Una decisión que conviene dejar dicha: el panel y la API comparten origen, es decir, la misma combinación de esquema, servidor y puerto. Por eso el `fetch("/api/estados")` del panel no necesita **CORS**, la política del navegador que decide si una página de un origen puede leer respuestas de otro, y que se configura con encabezados como `Access-Control-Allow-Origin`. Mientras panel y API salgan del mismo proceso, no hay nada que configurar; si algún día las separas, ese será el primer problema que encuentres, y la respuesta correcta es declarar de forma explícita los orígenes permitidos, no responder `*` por comodidad.

### El `revisor` terminado: ensamblado y pruebas

Ahora están todas las piezas. El proyecto completo es el siguiente. Cada archivo aparece una vez; los que no cambiaron desde la lección 8 llevan la misma explicación de allá y están al final.

Primero, la configuración del proyecto. `package.json` gana el script `empaquetar` y las dependencias de desarrollo nuevas, con versión exacta. Instálalas desde la raíz de `revisor/` con este comando; npm las agrega a `devDependencies`. El script `empaquetar` lo añades a mano, y las versiones de las dependencias de la lección 7 pueden aparecer con `^` en tu archivo: no importa, `package-lock.json` fija lo instalado, pero puedes dejar `package.json` igual al de abajo si quieres.

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
El contrato compartido y el panel. `contrato.ts` es el de la lección 8, sin cambios; se muestra aquí porque ahora lo importan los dos lados.

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
El servidor, su página y el punto de entrada.

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
Las pruebas son lo que sostiene la afirmación «el panel funciona» sin abrir un navegador. Conviene leer qué demuestra cada una, y qué no.

`Panel.test.tsx` monta el componente de verdad: instala un documento simulado de jsdom (`dom-de-prueba.ts`, como en la figura 2), monta `Panel` con `createRoot` dentro de `act` y comprueba cuatro cosas. Que se ve «Cargando…» mientras la promesa de `cargar` sigue pendiente y que, al resolverla, aparecen las dos filas con su texto. Que un `detalle` con HTML se muestra como texto: busca un elemento `img` y no encuentra ninguno, y comprueba que el HTML resultante contiene `&lt;img`. Que un error de la API se muestra con `role="alert"` y que pulsar «Actualizar» (un clic real sobre el botón, dentro de `act`) vuelve a pedir y recupera la lista. Y que al desmontar el árbol la señal que recibió `cargar` queda abortada. Son los hooks de verdad: el efecto corre, el estado cambia y React vuelve a dibujar; no hay ninguna función simulada de React.

`cargar.test.ts` comprueba la capa de red del panel contra un servidor HTTP local que responde lo que cada caso necesita: un reporte válido, un `503` y un JSON que no cumple el contrato.

`paquete.test.ts` es la prueba de humo del conjunto, y la más ambiciosa. Construye el panel con la API de esbuild, en memoria y con las mismas opciones que `npm run empaquetar`; levanta el servidor del `revisor` con esos archivos como activos y un reporte que contiene un `detalle` hostil (`<b>negrita</b>`); pide `/` y comprueba que llega la política CSP completa, idéntica al texto exacto y sin ningún `unsafe-` (relajarla por descuido pone la prueba en rojo); descarga `/cliente.js` tal como lo recibiría un navegador; abre la página en un documento simulado, ejecuta ese script, que hace `fetch` a la API de verdad, y espera a que aparezca la fila. Comprueba que su texto es literal, con las etiquetas visibles, y que no se creó ningún elemento `b`. Es el recorrido completo: servidor, página, paquete, API, validación, React y escape, con los mismos bytes que viajarían a un navegador. Una salvedad de la prueba: jsdom no trae `fetch`, así que la prueba le instala uno que resuelve las rutas relativas contra el servidor local, y ese reemplazo descarta el segundo argumento, incluida la señal de cancelación, porque la `AbortSignal` creada dentro de jsdom no es la de Node. La cancelación no se prueba aquí; la prueba de `Panel.test.tsx`, que sí recibe la señal de Node, es la que la comprueba.

Y lo que ninguna de estas pruebas demuestra: que un navegador real descargue y ejecute el paquete. jsdom implementa el DOM, pero no es un navegador: no aplica el CSS, no impone la política CSP, y no tiene un motor de dibujo. Por eso, tras construir, hay una comprobación manual que no se automatiza y que conviene hacer una vez, como se explica abajo.

Las pruebas que ya existían desde la lección 8 siguen ahí: la tabla de `leerPuerto`, la de `esReportePublico` y las del servidor. En el servidor sólo cambió su construcción, que ahora recibe `leerActivo`. El bloque siguiente muestra todos los archivos que no cambiaron o que cambiaron en un detalle pequeño.

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
Y los archivos de la lección 8 que quedan igual: la bitácora, la consulta con `fetch`, el lector del archivo de servicios, la configuración, el reporte, el modelo, el coordinador `revisarTodos`, `.prettierrc` y `servicios.json`.

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

Para ver el panel en un navegador de verdad, construye y arranca. `npm run empaquetar` deja el panel en `dist/publico/`:

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

Abre `http://127.0.0.1:3100/` en tu navegador. Debes ver el título «Revisor», un «Cargando…» que dura menos de un segundo y una lista con un servicio por línea, con borde verde para los disponibles y rojo para los que fallan; cada diez segundos la lista se actualiza sola y el botón «Actualizar» la recarga al momento. Abre las herramientas de desarrollo (F12), la pestaña de red, y confirma una solicitud `GET /api/estados` con estado 200 cada vez; en la pestaña de consola no debe haber errores, y en las cabeceras de la respuesta de `/` debe aparecer `content-security-policy`. Si algo falla ahí, la bitácora del servidor, en la primera terminal, tiene una línea por solicitud.

Con el servidor en marcha, así responde cada ruta de la página:

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

Esa última línea es la prueba del recorrido de rutas: pedir un archivo que el programa nunca prometió entregar da un `404`, no un archivo.

### Compilar y publicar: un artefacto conocido

«Publicar» significa cosas distintas en cada organización, así que no hay un comando universal honesto. Lo que sí es universal es el orden: construir un artefacto conocido, inspeccionarlo, instalar sólo lo necesario para ejecutarlo, configurar el entorno fuera del repositorio y arrancar lo que se construyó. Un **artefacto** es la salida identificable que se entrega para ejecutar. Esta lección prepara y comprueba ese artefacto; el despliegue en tu infraestructura queda fuera de lo que puede decirse de forma general.

El artefacto del `revisor` es una carpeta con cuatro cosas: `dist/` (el servidor compilado y `dist/publico/` con el panel), `package.json` (que Node necesita para saber que los `.js` de `dist/` son módulos ESM, por su campo `"type": "module"`), `package-lock.json` (la resolución exacta de dependencias) y `servicios.json` (la configuración). No lleva `src/` ni el `node_modules/` del desarrollo. `dist/` también contiene las pruebas compiladas, que nadie ejecuta en producción: no estorban, y si quieres un artefacto más estricto puedes excluirlas en una configuración de compilación aparte. Y como el panel está empaquetado dentro de `cliente.js` y el servidor sólo usa módulos de Node, el artefacto no necesita ninguna dependencia: lo que se instala en producción es nada.

Para comprobarlo, no te fíes de la lógica: constrúyelo y ejecútalo en una carpeta limpia, que es lo más parecido a un servidor nuevo. Desde la raíz de `revisor/`:

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

`npm ci` instala exactamente lo que dice `package-lock.json`, falla si el lock y `package.json` discrepan y borra `node_modules/` antes de empezar: es la instalación pensada para entregas, a diferencia de `npm install`, que puede resolver versiones nuevas. `--omit=dev` salta las dependencias de desarrollo. El resultado, «audited 1 package», es el propio proyecto: ninguna dependencia de producción. Si hubieras puesto `react` como dependencia normal, se habría instalado de balde; si el servidor importara algo que sólo está en `devDependencies`, este paso es donde fallaría, y mejor que falle aquí que en el servidor de producción.

Antes de entregar el artefacto, ejecuta las comprobaciones en este orden, desde una instalación limpia con `npm ci`: `npm run verificar`, `npm run lint`, `npm run formato`, `npm run probar`, `npm run empaquetar`. Revisa `package-lock.json` como parte del cambio, porque registra lo que se va a ejecutar. No publiques `node_modules/`, archivos `.env`, bitácoras ni ejemplos con direcciones, contraseñas o tokens reales; y nota que `servicios.json` se lee desde la carpeta donde arrancas el proceso, así que el servicio debe iniciarse con esa carpeta como directorio de trabajo.

Hay cuatro decisiones que el artefacto no toma por ti. La primera: el servidor escucha sólo en `127.0.0.1`, la interfaz local, y es deliberado, porque no debe exponerse a Internet directamente. Lo habitual es poner delante un **proxy inverso**, un proceso que recibe las conexiones públicas, termina el cifrado HTTPS, el **TLS**, y reenvía la solicitud al `revisor` por la interfaz local; ese proxy, y no el programa, es quien presenta el certificado. La segunda: un supervisor, que arranque el proceso, lo reinicie si cae y le envíe `SIGTERM` para detenerlo, que es el motivo por el que el cierre ordenado de la lección 8 importa. La tercera: acceso. Un panel público puede serlo si sólo muestra información pública; uno que revela qué sistemas tienes y cómo fallan probablemente requiere autenticación, y no se resuelve escondiendo la URL: una ruta no se vuelve privada porque no esté enlazada. Define el límite antes de publicar y prueba las respuestas sin una sesión válida. La cuarta: no uses nada que sea de desarrollo, como la recarga automática o mensajes detallados, como si fuera el paquete final.

## El error que vas a ver

React no inventa una clase nueva de errores de tipo; los errores de un componente son los de cualquier llamada, con la forma de las propiedades. El primero aparece cuando pasas una propiedad que no pertenece a la unión del contrato, y el segundo cuando olvidas una propiedad obligatoria. Con TypeScript 7.0.2, `tsc` informa ambos en un mismo archivo. Ninguno de los dos es un problema de React: el estado `"pendiente"` no pertenece a la unión que el panel promete atender, y un `FilaEstado` sin su `estado` no tiene nada que dibujar.

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

TS2322 dice que un valor no se puede asignar al tipo que la propiedad espera: aquí, que `"pendiente"` no es ninguno de los dos valores de `tipo`. No lo arregles con `as EstadoPublico`: esa aserción callaría justamente el aviso que te evita pintar un estado que ningún componente sabe dibujar. Si «pendiente» es un estado real del dominio, agrégalo a la unión de `contrato.ts`, a la guarda `esEstadoPublico`, al conversor del servidor y a `FilaEstado`; el compilador te irá diciendo dónde falta cada pieza. TS2741 dice que una propiedad obligatoria falta; léelo como una pregunta: ¿esa fila debería existir sin un estado? Casi siempre la respuesta es que el componente se llamó mal.

Hay un error que no es del compilador y que te encontrarás: arrancar el servidor sin haber empaquetado el panel. El servidor responde la página, pero `GET /cliente.js` devuelve `500` y la bitácora dice qué falta:

```text
$ curl -i http://127.0.0.1:3101/cliente.js
HTTP/1.1 500 Internal Server Error
...
{"detalle":"error interno"}
```

Y en la terminal del servidor:

```text
{"momento":"2026-10-02T21:48:27.838Z","evento":"error","detalle":"ENOENT: no such file or directory, open '/home/tu-usuario/proyectos/revisor/dist/publico/cliente.js'"}
{"momento":"2026-10-02T21:48:27.839Z","evento":"solicitud","detalle":"GET /cliente.js 500 1 ms"}
```

`ENOENT` significa «no existe ese archivo». La solución no es crear un archivo vacío: es correr `npm run empaquetar`. La pantalla, mientras tanto, se queda en blanco, y las herramientas de desarrollo muestran el script de `/cliente.js` fallido en rojo. Es un buen ejemplo de por qué el error se registra en el servidor y no sólo se responde: sin la bitácora, el navegador sólo diría «falló la carga».

Y un tercer caso, éste del navegador: si en la consola ves `Refused to execute inline script because it violates the following Content Security Policy directive`, la política está haciendo su trabajo. Algo intentó ejecutar un script en línea o cargar un recurso de otro origen. No relajes la política con `'unsafe-inline'` para que el aviso desaparezca: averigua qué intentó ejecutar, que casi siempre es la señal de que algo no debería estar ahí.

## Lo que se hace mal

- **Insertar HTML de fuera sin sanitizar.** `dangerouslySetInnerHTML` o `elemento.innerHTML = texto` con un texto que no controlas convierten datos en instrucciones: es XSS. Muestra texto como hijo de JSX, y si de verdad necesitas HTML ajeno, pásalo por un sanitizador mantenido, antes de dibujar. El proyecto prohíbe ambas formas con ESLint y limita lo que puede ejecutarse con una política CSP.

- **Escribir una función casera para «limpiar» HTML.** Reemplazar `<script>` o una lista de palabras deja pasar atributos de eventos, URL `javascript:`, SVG y otras codificaciones. Una lista de lo prohibido siempre está incompleta; un sanitizador mantenido parte de una lista de lo permitido.

- **Tratar el JSON de la red como si fuera el tipo.** `(await respuesta.json()) as ReportePublico` compila y no comprueba nada. Recibe `unknown`, valida con la guarda compartida y revisa `respuesta.ok` antes de parsear.

- **Convertir un error de la API en una lista vacía.** Un panel que muestra «no hay servicios» cuando la API devolvió un `503` oculta la falla justo donde alguien está mirando. El estado de error existe para que la pantalla diga lo que pasó.

- **Pedir datos en el cuerpo del componente.** Un `fetch` fuera de `useEffect` se repite en cada dibujo, y como la respuesta cambia el estado, provoca otro dibujo: un bucle de solicitudes. Las solicitudes son efectos y van en `useEffect`.

- **Olvidar la limpieza del efecto.** Sin abortar la solicitud ni detener el temporizador al desmontar, las respuestas atrasadas intentan actualizar componentes que ya no existen y los intervalos siguen corriendo para siempre.

- **Compartir el modelo interno en lugar del contrato público.** Si el panel importa `Estado`, la URL de cada servicio viaja al navegador por comodidad. Comparte `contrato.ts`: lo que cruza la frontera, no lo que hay adentro.

- **Importar código de Node en un archivo compartido.** Un `import "node:fs"` en `contrato.ts` rompe el empaquetado del panel, o peor, lleva al navegador código que no debía salir del servidor. Lo compartido contiene sólo tipos y funciones puras.

- **Confundir empaquetar con comprobar.** `esbuild` borra los tipos sin verificarlos. Un flujo que sólo empaqueta puede entregar un programa con errores de tipo; `npm run verificar` sigue siendo obligatorio.

- **Servir archivos con la ruta que escribe el cliente.** Armar `readFile("dist/publico" + url)` permite pedir `/../../secreto`. Con una lista cerrada de activos conocidos, como `Activo`, ese ataque no tiene por dónde entrar.

- **Relajar la política CSP con `'unsafe-inline'` al primer aviso.** Es el equivalente de apagar una alarma porque suena: pierdes la defensa justo cuando estaba funcionando. Descubre qué intentó ejecutarse.

- **Publicar el directorio de trabajo.** `node_modules/`, `src/`, `.env` y bitácoras no son parte del artefacto. Construye, copia sólo lo necesario e instala con `npm ci --omit=dev`.

## Ejercicios

### Ejercicio 1 — Una tercera forma de ver el reporte

Agrega al panel un resumen sobre la lista: «2 de 3 servicios disponibles». Calcúlalo en una función pura `resumir(reporte: ReportePublico): string` en su propio archivo, pruébala con una tabla de casos (ninguno disponible, todos, mezcla, lista vacía) y úsala desde `Contenido`. Confirma con `npm run probar` que la prueba de `Panel` sigue pasando y agrega una aserción que compruebe el resumen en pantalla.

### Ejercicio 2 — Revisar qué cruza la API

Agrega a `Servicio` un campo `responsable: string` (por ejemplo, un correo de contacto) y a `servicios.json` el valor de cada servicio, sin tocar `contrato.ts`. Ejecuta `npm run verificar` y explica qué archivos tuviste que modificar para que compile. Después arranca el `revisor` y confirma con `curl http://127.0.0.1:3100/api/estados` que el responsable no aparece en la respuesta. Explica qué habría pasado si la API serializara el `Estado` directamente.

### Ejercicio 3 — Validar antes de pintar

Agrega al contrato un campo opcional `detalle` a los estados disponibles, por ejemplo para avisar de respuestas lentas, y actualiza `esEstadoPublico` para que lo acepte sólo si es texto. Escribe dos casos nuevos en la tabla de `contrato.test.ts`: uno válido y uno con un `detalle` numérico. Comprueba que el panel muestra el detalle de un estado disponible sin que `FilaEstado` use una aserción.

### Ejercicio 4 — Un panel que no se queda viejo en silencio

Si la API deja de responder, el panel muestra el error, pero pierde la lista que ya tenía. Modifica `useReporte` para que, cuando una actualización falle y ya había una lista, conserve la última lista junto con el aviso de error. Reflexiona qué alternativa de `Carga` necesitas agregar, añade una prueba en `Panel.test.tsx` que lo compruebe y confirma que el compilador te señala el `switch` de `Contenido` hasta que atiendes la alternativa nueva.

## Soluciones

### Solución 1

El cálculo es una función pura que no sabe de React: recibe el contrato y devuelve texto. Eso permite probarla con datos construidos en memoria, y es lo que `Contenido` usa, sin lógica adicional.

```ts
// src/panel/resumir.ts
import type { ReportePublico } from "../contrato.js";

export function resumir(reporte: ReportePublico): string {
  const disponibles = reporte.estados.filter((estado) => estado.tipo === "disponible").length;
  return `${disponibles} de ${reporte.estados.length} servicios disponibles`;
}
```

En `Contenido`, la rama `listo` dibuja `<p>{resumir(carga.reporte)}</p>` antes de la lista. En la prueba de componente, la aserción es `assert.equal(contenedor.querySelector("p")?.textContent, "1 de 2 servicios disponibles")` con el reporte de ejemplo, que tiene un servicio disponible y uno en falla. La lista vacía merece su caso: `0 de 0 servicios disponibles` es una frase correcta, pero decide si prefieres otro texto antes de que lo vea una persona.

### Solución 2

Agregar `responsable` a `Servicio` hace fallar la compilación en cada lugar que construye un `Servicio` sin él: `leerServicio` de `configuracion.ts`, que debe leer y validar el campo con las mismas guardas que el resto, y las pruebas y figuras que escriben servicios a mano. `contrato.ts`, `aReportePublico` y el panel no cambian, y ahí está el punto del ejercicio: como `aEstadoPublico` construye el objeto campo por campo, el nuevo campo no llega a la respuesta. Si la API serializara el `Estado` con `JSON.stringify`, `responsable` viajaría a cada navegador sin que nadie lo hubiera decidido; sería una fuga de datos personales causada por agregar una columna.

### Solución 3

El campo es opcional en el tipo y la guarda sólo lo exige cuando está presente: «opcional» significa que puede faltar, no que pueda tener cualquier valor.

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

En `FilaEstado`, la rama `disponible` agrega `{estado.detalle === undefined ? null : ` — ${estado.detalle}`}` después de la duración. Es un estrechamiento normal: dentro de la rama no-`undefined`, `estado.detalle` es `string`, sin ninguna aserción. Los dos casos de la tabla son un reporte con `detalle: "lento"` en un estado disponible, que debe ser válido, y otro con `detalle: 7`, que debe rechazarse.

### Solución 4

La alternativa que falta es una carga con lista y aviso a la vez: `{ tipo: "obsoleto"; reporte: ReportePublico; detalle: string }`. Es la única forma de representar «tengo datos viejos y el último intento falló» sin inventar dos variables que puedan contradecirse.

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

Dos detalles. Cuando la siguiente actualización sí funciona, `establecerCarga({ tipo: "listo", reporte })` descarta el aviso. Y como `Contenido` hace un `switch` con la guarda `never`, el compilador te señala (TS2322) esa función hasta que dibujas la rama `obsoleto`: la lista y un `<p role="alert">` con el aviso. Esa es la utilidad de modelar los estados de la pantalla como unión.

## Cómo sé que lo logré

- [ ] `npx tsc --version` imprime `Version 7.0.2` dentro de `~/proyectos/revisor`.
- [ ] En `figuras/`, `fig09_02.tsx` imprime `primer render: <p>Cargando…</p>` y después `tras el efecto: <p>2 servicios</p>`.
- [ ] `fig09_03.tsx` imprime la etiqueta escapada con `&lt;` y `&gt;`, y `fig09_04.tsx`, con `dangerouslySetInnerHTML`, la imprime sin escapar.
- [ ] En el proyecto, `npm run verificar`, `npm run lint` y `npm run formato` terminan sin avisos, y `npm run probar` reporta 27 pruebas aprobadas y 0 fallidas.
- [ ] Al agregar un archivo con `dangerouslySetInnerHTML`, `npm run lint` falla con el mensaje de la regla; al borrarlo, vuelve a pasar.
- [ ] `npm run empaquetar` termina sin salida y deja `cliente.js` y `panel.css` en `dist/publico/`.
- [ ] Con `PUERTO=3100 npm run arrancar`, abrir `http://127.0.0.1:3100/` en un navegador muestra la lista, «Actualizar» la recarga, y la pestaña de red muestra `GET /api/estados` con estado 200.
- [ ] `curl -i http://127.0.0.1:3100/` incluye el encabezado `content-security-policy`, y `curl http://127.0.0.1:3100/etc/passwd` responde 404.
- [ ] En una carpeta limpia con sólo `dist/`, `package.json`, `package-lock.json` y `servicios.json`, `npm ci --omit=dev` termina bien y `node dist/main.js` arranca el mismo servidor.

## Para leer más

- [React: Learn React](https://react.dev/learn) — documentación oficial de componentes, propiedades, estado y efectos, con una sección de TypeScript; consultado el 2 de octubre de 2026.

- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — documentación oficial de `useEffect`: cuándo usarlo, la lista de dependencias y la función de limpieza; consultado el 2 de octubre de 2026.

- [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — guía de OWASP para evitar XSS, con las reglas por contexto de salida; consultado el 2 de octubre de 2026.

- [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) — referencia sobre la política de seguridad de contenido y sus directivas; consultado el 2 de octubre de 2026.
