# Curso de TypeScript — de cero a un programa que se sostiene

[![Verificar programas](https://github.com/HabilMX/curso-typescript/actions/workflows/verificar.yml/badge.svg)](https://github.com/HabilMX/curso-typescript/actions/workflows/verificar.yml)

**Por Dorian Chávez, fundador de Hábil y arquitecto de integración.**

**Cada programa de este curso se compila con `tsc` en modo estricto y se ejecuta automáticamente en cada cambio; el sello verde lo comprueba y cualquiera puede ver la corrida.**
Haz clic en el sello para abrir la última corrida y ver, paso por paso, qué se ejecutó y qué salió.

> El curso está en cinco idiomas: español (el original), inglés, francés, portugués de Brasil y búlgaro.

## Dónde está el contenido

- **[Español — el curso completo](es/README.md)** ← empieza aquí
- **[English — the full course](en/README.md)**
- **[Français — le cours complet](fr/README.md)**
- **[Português (Brasil) — o curso completo](pt/README.md)**
- **[Български — пълният курс](bg/README.md)**
- **[`programas/`](programas/)** — todos los programas del curso, listos para ejecutar

## Para quién es

Quien ya llevó el curso de Go de esta casa, o quien programa en JavaScript y quiere dejar de descubrir los errores en producción. No se supone experiencia previa con tipos.

## El proyecto que crece

El **`revisor`**, el mismo del curso de Go, ahora en TypeScript y completo: una **API** que consulta una lista de servicios **a la vez** y un **panel web** que muestra el reporte, con los tipos compartidos entre los dos.

Se repite el proyecto y no se inventa otro porque quien hizo Go ve el mismo problema resuelto en otro lenguaje, y de esa comparación se aprende más que de empezar de nuevo. Lo que cambia es el lenguaje, no el problema.

## Las lecciones

Numeración única y continua: «Lección N», de la 0 a la 9.

| # | Lección | Qué construyes | Qué aprendes |
|---|---|---|---|
| 0 | Qué es TypeScript y qué NO es | nada todavía (lectura) | JS vs TS; los tipos se borran al ejecutar; qué protege y qué no; por qué `strict` |
| 1 | Instalar TypeScript en tu Linux Mint | el entorno y tu primer programa | Node LTS, gestor de paquetes, `tsc`, editor, `tsconfig` estricto, ejecutar y depurar |
| 2 | Tipos, funciones e inferencia | las funciones base del `revisor` | primitivos, inferencia, uniones y literales, *narrowing*, `null`/`undefined` con `strictNullChecks` |
| 3 | Objetos y el modelo de datos | el modelo `Servicio` / `Estado` | `type` vs `interface`, tipado estructural, `readonly`, uniones discriminadas para estados |
| 4 | Colecciones, genéricos y errores | la lista de servicios y el reporte | arreglos, `Map`/`Set`, genéricos, tipos utilitarios; errores: excepciones vs resultado, `unknown` en `catch` |
| 5 | Asincronía: que revise todo a la vez | el `revisor` concurrente | *event loop*, promesas, `async/await`, `Promise.all` vs `allSettled`, `AbortController` y tiempos límite |
| 6 | Datos que llegan de fuera | validación de configuración y respuestas | el tipo no valida en ejecución: validar en la frontera (JSON, variables de entorno); tipos derivados del esquema |
| 7 | Módulos, pruebas y calidad | el proyecto de verdad, con pruebas | módulos ESM, organización por responsabilidad, pruebas con tabla de casos, lint y formato |
| 8 | El servidor | la API HTTP del `revisor` | servidor HTTP, rutas tipadas, JSON, configuración, bitácora, cierre ordenado |
| 9 | La pantalla y el programa terminado | el panel web y el paquete final | React con TypeScript y hooks, tipos compartidos front–back, seguridad básica (no inyectar HTML sin sanitizar: XSS), compilar y publicar |

Lo que la tabla promete por lección es lo que la lección trae.

## La plantilla de cada lección

Igual en todas:

1. **Encabezado:** «Lección N — título», tiempo (90 min o 2 × 45) y «Al terminar vas a poder…» (3 a 7 objetivos).
2. **El porqué antes del cómo:** qué problema resuelve el concepto, con un ejemplo del `revisor`.
3. **Los conceptos**, uno por sección: explicación, ejemplo mínimo ejecutable y ejemplo en el `revisor`.
4. **El error que vas a ver:** el mensaje real del compilador o de Node, qué significa y cómo se arregla.
5. **Lo que se hace mal** (antipatrones), con el porqué.
6. **Ejercicios** (2 a 4), de menor a mayor, con sus **soluciones** aparte.
7. **Cómo sé que lo logré:** medible; compila con `strict`, tal comando da tal salida.
8. **Para leer más:** 2 a 4 fuentes, documentación oficial primero.

## Cómo ver que los programas funcionan

Sin instalar nada: abre el sello de arriba. Cada corrida muestra los pasos que se ejecutaron y su resultado.

En tu computadora, con [Node.js](https://nodejs.org/en/download) (la versión LTS) instalado:

```bash
cd programas
npm install --no-save typescript@7.0.2 @types/node@24 react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@29.1.1 @types/jsdom@28.0.3
cd 03-objetos-modelo-datos
../node_modules/.bin/tsc --strict --target ES2022 --module nodenext --types node fig03_01.ts
node fig03_01.js                        # compara lo que imprime con fig03_01.salida.txt
```

Cada programa es un archivo `figNN_NN.ts` (o `.tsx`) dentro de la carpeta de su lección, con su salida esperada al lado (`figNN_NN.salida.txt`). Los programas que a propósito no compilan traen `figNN_NN.error-esperado.txt`, con el error que la lección enseña a leer. Los programas de varios archivos traen los demás en la carpeta `figNN_NN/`. Los proyectos completos (`fig07_04`, `fig08_05`, `fig09_05`) son carpetas con su propio `package.json`: entra en la carpeta, ejecuta `npm install` y usa sus scripts (`npm run probar`, `npm run lint`…).

**Las lecciones son la fuente; `programas/` es una copia que se genera de ellas.** Se extraen de los bloques de código de `es/*.md` con `herramientas/generar-programas.sh`, y en cada cambio la verificación comprueba que la copia es idéntica a lo que dicen las lecciones. Así lo que lees y lo que ejecutas no pueden diferir.

## Qué hay en el repositorio

| | |
|---|---|
| `es/` | el curso en español, una lección por archivo |
| `en/`, `fr/`, `pt/`, `bg/` | las traducciones (inglés, francés, portugués de Brasil y búlgaro), una lección por archivo |
| `programas/` | los programas de las lecciones (uno por archivo, con su salida esperada) |
| `herramientas/` | los guiones que verifican el curso (ver abajo) y la versión fijada de TypeScript |
| `.github/workflows/verificar.yml` | la verificación automática que muestra el sello |
| `verificar-publicable.sh` | revisa que el material no contenga rutas internas ni claves antes de publicarlo |
| `LICENSE.md` | CC BY-SA 4.0 |

Dentro de `herramientas/`:

| | |
|---|---|
| `verificar-programas.sh` | compila con `tsc` estricto y ejecuta cada programa de las lecciones, y compara su salida real contra la documentada |
| `generar-programas.sh` | arma `programas/` desde las lecciones; con `--comprobar` verifica que esté al día |
| `verificar-plantilla.sh` | comprueba que cada lección tenga las partes de la plantilla, objetivos, ejercicios y fuentes en el número pedido |
| `medir-profundidad.sh` | mide las palabras de explicación por lección |
| `package.json`, `package-lock.json` | TypeScript, los tipos de Node, React, esbuild y jsdom con versión exacta |

## La profundidad se mide

Cada lección tiene entre 3,000 y 5,000 palabras de explicación, como las del curso de Go. `herramientas/medir-profundidad.sh` cuenta las **palabras de explicación** (lo que está fuera de los bloques de código) y exige dos varas absolutas: **piso de 3,000 palabras por lección y mediana del curso de 4,000**. Sale con código 1 si no cumple, así que la verificación automática se pone roja.

Se cuentan palabras y no líneas porque las líneas se inflan: una frase por línea suma muchas líneas sin explicar más. Y las varas son absolutas y no «la mitad de la mediana del curso» porque ese criterio se muerde la cola: unas lecciones flacas bajan la mediana y entonces pasan. Un criterio relativo garantiza uniformidad, no profundidad. Las varas se calibraron con el curso de Go medido con este mismo guion: lecciones de 3,269 a 5,097 palabras, mediana 4,321.

## Qué es un programa y qué es un fragmento

**No todo bloque de código de este curso es un programa completo.** Un **programa** corre solo, de principio a fin: su bloque empieza con un comentario `// figNN_NN.ts` y trae, justo después, la corrida real (`$ tsc ...`, `$ node ...` y la salida). Cada uno se compila y se ejecuta en cada cambio, y su salida documentada se compara contra la real. Un **fragmento** es una ilustración que no pretende correr por sí sola, y por eso no se verifica; se reconoce porque su bloque no empieza con ese comentario.

Las lecciones usan módulos ESM (`"type": "module"`): los `import` relativos llevan extensión `.js` y los módulos de Node, el prefijo `node:`. Con TypeScript 6 o superior, `tsc` no carga solo los tipos de Node: por eso los programas que usan módulos de Node se compilan con `--types node`.

## Reglas del repositorio

- **Licencia CC BY-SA 4.0** (ver `LICENSE.md`): el material es público y se puede reusar citando la fuente.
- **Multiidioma:** `es/` es el original; `en/`, `fr/`, `pt/` y `bg/` son traducciones, y `herramientas/verificar-traducciones.sh` avisa cuando alguna quedó vieja respecto al español.
- `./verificar-publicable.sh` antes de publicar. Falla cerrado (si no pudo buscar, sale en error, no en verde) y trae autoprueba: siembra un patrón y exige detectarlo.
- Sin emojis en los títulos de las lecciones.
