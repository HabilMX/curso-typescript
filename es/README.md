# Curso de TypeScript — de cero a un programa que se sostiene

**Por Dorian Chávez, fundador de Hábil y arquitecto de integración.**

**Para quién es:** quien ya llevó el curso de Go de esta casa, o quien programa en JavaScript y quiere dejar de descubrir los errores en producción. No se supone experiencia previa con tipos: cada concepto se explica cuando aparece, y se explica por qué existe, no solo cómo se escribe.

**Qué vas a terminar sabiendo:** escribir un programa completo con tipos, entender lo que escribiste y poder explicárselo a alguien más.

**Lo que necesitas antes de empezar:** una computadora con Linux Mint y saber abrir una terminal. La [Lección 1](01-instalacion.md) instala todo desde cero.

## El proyecto que vas a construir

El **`revisor`**: una API que consulta una lista de servicios **a la vez** y un panel web que muestra el reporte, con los tipos compartidos entre los dos. Es el mismo problema del curso de Go, resuelto ahora en TypeScript.

## Las diez lecciones

| Lección | | Qué construyes | Qué aprendes |
|---|---|---|---|
| 0 | [Qué es TypeScript y qué NO es](00-que-es-typescript.md) | nada todavía (lectura) | JS vs TS; los tipos se borran al ejecutar; qué protege y qué no; por qué `strict` |
| 1 | [Instalar TypeScript en tu Linux Mint](01-instalacion.md) | el entorno y tu primer programa | Node LTS, `tsc`, editor, `tsconfig` estricto, ejecutar y depurar |
| 2 | [Tipos, funciones e inferencia](02-tipos-funciones-inferencia.md) | las funciones base del `revisor` | primitivos, inferencia, uniones y literales, *narrowing*, `null` y `undefined` |
| 3 | [Objetos y el modelo de datos](03-objetos-modelo-datos.md) | el modelo `Servicio` / `Estado` | `type` vs `interface`, tipado estructural, `readonly`, uniones discriminadas |
| 4 | [Colecciones, genéricos y errores](04-colecciones-genericos-errores.md) | la lista de servicios y el reporte | arreglos, `Map`/`Set`, genéricos, tipos utilitarios, errores |
| 5 | [Asincronía: que revise todo a la vez](05-asincronia.md) | el `revisor` concurrente | *event loop*, promesas, `async/await`, `Promise.all` vs `allSettled`, `AbortController` |
| 6 | [Datos que llegan de fuera](06-datos-de-fuera.md) | validación de configuración y respuestas | validar en la frontera; tipos derivados del esquema |
| 7 | [Módulos, pruebas y calidad](07-modulos-pruebas-calidad.md) | el proyecto de verdad, con pruebas | módulos ESM, pruebas con tabla de casos, lint y formato |
| 8 | [El servidor](08-el-servidor.md) | la API HTTP del `revisor` | servidor HTTP, rutas tipadas, JSON, configuración, cierre ordenado |
| 9 | [La pantalla y el programa terminado](09-la-pantalla.md) | el panel web y el paquete final | React con TypeScript y hooks, tipos compartidos, XSS, compilar y publicar |

Al final de cada lección hay ejercicios con sus soluciones. Y la [bitácora](bitacora.md) es tuya: anota ahí lo que te costó.
