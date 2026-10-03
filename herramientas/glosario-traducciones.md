# Glosario de traducciones — curso de TypeScript

Fuente única para los cuatro traductores (en · fr · pt-BR · bg). El español (`es/`) es la fuente; si un término está en la tabla, se usa tal cual. Un término nuevo se agrega aquí (con candado `mkdir /tmp/glosario-ts.lock`, y se avisa a los otros antes de usarlo).

Referencia general de la casa: `Habil/Proyectos/Página Pública habil.mx/glosario-traducciones.md` (del sitio comercial; **su registro «usted/vous/Вие» NO rige aquí**: este curso tutea).

Terminología: MDN y la documentación de TypeScript y de React **en cada idioma donde exista**. MDN existe en fr y pt-BR (no en bg); react.dev en fr (`fr.react.dev`) y pt-BR (`pt-br.react.dev`); la documentación de TypeScript y la de Node.js, solo en inglés. Donde no hay documentación oficial en el idioma, se traduce descriptivamente y, la primera vez que aparece en una lección, se pone el término inglés entre paréntesis: *tipo estrecho (narrowing)*.

## 1. Registro: el curso TUTEA, en masculino genérico

| Idioma | Forma | Ejemplo |
|---|---|---|
| en | «you» | You will compile your first program. |
| fr | «tu» (nunca «vous») | Tu vas compiler ton premier programme. |
| pt-BR | «você» (permitido aquí: es tuteo) | Você vai compilar o seu primeiro programa. |
| bg | «ти» (nunca «Вие») | Ще компилираш първата си програма. |

Masculino genérico donde el idioma marca género (fr «prêt», pt «pronto», bg «готов»). Comillas de cada idioma: en “ ”, fr « », pt “ ”, bg „ “. Sin emojis ni menciones a asistentes. Las horas, las cifras y los códigos de error (TS2345…) no cambian.

## 2. Qué NO se traduce

- **Todo bloque ``` va BYTE A BYTE idéntico al español**: código, comentarios, salidas de `node`, errores de `tsc` y los nombres de archivo (`fig05_03.ts`). Solo se traduce la prosa. Incluye los bloques `bash`, `json` y `text`.
- Todo lo que va en `código en línea` (identificadores, palabras clave, comandos, rutas, nombres de tipo) queda igual, incluidos `Servicio`, `Estado`, `revisor`.
- Los nombres propios de herramientas y marcas (TypeScript, JavaScript, Node.js, React, npm, ESLint, Prettier, Linux Mint, VS Code, MDN, OWASP).
- Las URL de ejemplo (`http://127.0.0.1:3100/`, `https://catalogo.example`).
- Los enlaces entre lecciones (`01-instalacion.md`) quedan con el mismo nombre de archivo.

## 3. Estructura fija de cada lección (el verificador de plantilla lee estos títulos)

| es | en | fr | pt-BR | bg |
|---|---|---|---|---|
| `# Lección N — título` | `# Lesson N — …` | `# Leçon N — …` | `# Lição N — …` | `# Урок N — …` |
| `**Tiempo:**` | `**Time:**` | `**Durée :**` | `**Tempo:**` | `**Време:**` |
| `**Qué construyes:**` | `**What you build:**` | `**Ce que tu construis :**` | `**O que você constrói:**` | `**Какво изграждаш:**` |
| `**Qué aprendes:**` | `**What you learn:**` | `**Ce que tu apprends :**` | `**O que você aprende:**` | `**Какво научаваш:**` |
| `## Al terminar vas a poder` | `## By the end you will be able to` | `## À la fin, tu seras capable de` | `## Ao terminar, você vai conseguir` | `## След урока ще можеш да` |
| `## El porqué antes del cómo` | `## The why before the how` | `## Le pourquoi avant le comment` | `## O porquê antes do como` | `## Защо, преди как` |
| `## Los conceptos` | `## The concepts` | `## Les concepts` | `## Os conceitos` | `## Понятията` |
| `## El error que vas a ver` | `## The error you will see` | `## L'erreur que tu vas voir` | `## O erro que você vai ver` | `## Грешката, която ще видиш` |
| `## Lo que se hace mal` | `## What gets done wrong` | `## Ce qui se fait de travers` | `## O que se faz errado` | `## Какво се прави погрешно` |
| `## Ejercicios` | `## Exercises` | `## Exercices` | `## Exercícios` | `## Упражнения` |
| `### Ejercicio N — …` | `### Exercise N — …` | `### Exercice N — …` | `### Exercício N — …` | `### Упражнение N — …` |
| `## Soluciones` | `## Solutions` | `## Solutions` | `## Soluções` | `## Решения` |
| `### Solución N` | `### Solution N` | `### Solution N` | `### Solução N` | `### Решение N` |
| `## Cómo sé que lo logré` | `## How I know I got it` | `## Comment savoir que j'ai réussi` | `## Como sei que consegui` | `## Как разбирам, че съм успял` |
| `## Para leer más` | `## Further reading` | `## Pour aller plus loin` | `## Para ler mais` | `## За допълнително четене` |
| `bitácora` | logbook | journal de bord | diário de bordo | дневник |

Se conservan **todas** las secciones `##` y `###` del español, en el mismo orden y en el mismo número.

## 4. Términos técnicos

Convención: el término queda en la columna; «= » significa que no se traduce. `(en)` = se deja el inglés porque es lo que usa la documentación de ese idioma.

| es | en | fr | pt-BR | bg |
|---|---|---|---|---|
| tipo | type | type | tipo | тип |
| sistema de tipos | type system | système de types | sistema de tipos | система от типове |
| anotación de tipo | type annotation | annotation de type | anotação de tipo | анотация на тип |
| inferencia (de tipos) | (type) inference | inférence (de types) | inferência (de tipos) | извеждане на типове |
| tipado estructural | structural typing | typage structurel | tipagem estrutural | структурно типизиране |
| unión (tipo unión) | union (union type) | union (type union) | união (tipo união) | обединение (тип обединение) |
| intersección | intersection | intersection | interseção | сечение |
| literal (tipo literal) | literal (literal type) | littéral (type littéral) | literal (tipo literal) | литерал (литерален тип) |
| unión discriminada | discriminated union | union discriminée | união discriminada | дискриминирано обединение |
| *narrowing* | narrowing | affinage de type (narrowing) | estreitamento de tipo (narrowing) | стесняване на типа (narrowing) |
| guarda de tipo | type guard | garde de type | guarda de tipo (type guard) | защита на типа (type guard) |
| genérico (tipo/función genérica) | generic | générique | genérico | генеричен (generic) |
| parámetro de tipo | type parameter | paramètre de type | parâmetro de tipo | параметър на типа |
| tipo utilitario | utility type | type utilitaire | tipo utilitário | помощен тип |
| tipo derivado / tipo mapeado | derived type / mapped type | type dérivé / type mappé | tipo derivado / tipo mapeado | производен тип / картографиран тип |
| tipo condicional | conditional type | type conditionnel | tipo condicional | условен тип |
| aserción de tipo | type assertion | assertion de type | asserção de tipo | твърдение за тип |
| `type` vs `interface` | = | = | = | = |
| objeto | object | objet | objeto | обект |
| propiedad | property | propriété | propriedade | свойство |
| solo lectura | read-only | en lecture seule | somente leitura | само за четене |
| arreglo | array | tableau | array | масив |
| tupla | tuple | tuple | tupla | кортеж |
| función | function | fonction | função | функция |
| firma (de una función) | signature | signature | assinatura | сигнатура |
| parámetro / argumento | parameter / argument | paramètre / argument | parâmetro / argumento | параметър / аргумент |
| valor de retorno | return value | valeur de retour | valor de retorno | върната стойност |
| clase | class | classe | classe | клас |
| enumeración | enum | énumération (enum) | enumeração (enum) | изброим тип (enum) |
| compilador | compiler | compilateur | compilador | компилатор |
| compilar | to compile | compiler | compilar | компилирам |
| transpilar | to transpile | transpiler | transpilar | транспилирам |
| borrado de tipos (*type stripping*) | type stripping | effacement des types (type stripping) | remoção de tipos (type stripping) | премахване на типовете (type stripping) |
| tiempo de ejecución / en ejecución | runtime / at runtime | exécution / à l'exécution | tempo de execução / em tempo de execução | време на изпълнение / по време на изпълнение |
| tiempo de compilación | compile time | compilation (à la compilation) | tempo de compilação | време на компилация |
| modo estricto (`strict`) | strict mode | mode strict | modo estrito | строг режим |
| `null` / `undefined` | = | = | = | = |
| error de compilación | compile error | erreur de compilation | erro de compilação | грешка при компилация |
| mensaje de error | error message | message d'erreur | mensagem de erro | съобщение за грешка |
| excepción | exception | exception | exceção | изключение |
| lanzar (una excepción) | to throw | lever (une exception) | lançar | хвърлям |
| capturar (una excepción) | to catch | attraper | capturar | прихващам |
| resultado (tipo `Resultado`) | result | résultat | resultado | резултат |
| asincronía | asynchrony | asynchronisme | assincronia | асинхронност |
| asíncrono | asynchronous | asynchrone | assíncrono | асинхронен |
| promesa | promise | promesse | promessa | обещание (promise) |
| `async`/`await` | = | = | = | = |
| bucle de eventos (*event loop*) | event loop | boucle d'événements | loop de eventos (event loop) | цикъл на събитията (event loop) |
| *callback* | callback | fonction de rappel (callback) | callback (função de retorno) | функция за обратно извикване (callback) |
| concurrencia | concurrency | concurrence | concorrência | съвместно изпълнение (concurrency) |
| tiempo límite (*timeout*) | timeout | délai d'attente (timeout) | tempo limite (timeout) | таймаут |
| cancelar (una operación) | to abort | annuler (abort) | cancelar (abortar) | прекъсвам |
| señal de cancelación | abort signal | signal d'annulation | sinal de cancelamento | сигнал за прекъсване |
| módulo | module | module | módulo | модул |
| módulos ESM | ES modules (ESM) | modules ES (ESM) | módulos ES (ESM) | ES модули (ESM) |
| importar / exportar | import / export | importer / exporter | importar / exportar | импортирам / експортирам |
| paquete | package | paquet | pacote | пакет |
| dependencia | dependency | dépendance | dependência | зависимост |
| gestor de paquetes | package manager | gestionnaire de paquets | gerenciador de pacotes | мениджър на пакети |
| prueba (automática) | test | test | teste | тест |
| prueba con tabla de casos | table-driven test | test piloté par table de cas | teste orientado a tabela de casos | тест с таблица от случаи |
| aserción | assertion | assertion | asserção | твърдение (assertion) |
| cobertura | coverage | couverture | cobertura | покритие |
| *lint* / linter | lint / linter | lint / linter | lint / linter | линтер (linter) |
| formateador | formatter | formateur | formatador | форматиращ инструмент |
| validar / validación | to validate / validation | valider / validation | validar / validação | валидирам / валидация |
| frontera (de validación) | boundary | frontière | fronteira | граница |
| esquema | schema | schéma | esquema | схема |
| variable de entorno | environment variable | variable d'environnement | variável de ambiente | променлива на средата |
| servidor | server | serveur | servidor | сървър |
| cliente | client | client | cliente | клиент |
| petición / respuesta | request / response | requête / réponse | requisição / resposta | заявка / отговор |
| ruta (HTTP) | route | route | rota | маршрут |
| encabezado (HTTP) | header | en-tête | cabeçalho | заглавна част (header) |
| código de estado (HTTP) | status code | code d'état | código de status | код на състоянието |
| cuerpo (de la petición) | body | corps | corpo | тяло |
| punto de entrada | entry point | point d'entrée | ponto de entrada | входна точка |
| API | = | = | = | = |
| bitácora (log del programa) | log | journal (de logs) / log | log | журнал (log) |
| cierre ordenado | graceful shutdown | arrêt propre (graceful shutdown) | encerramento ordenado (graceful shutdown) | коректно спиране (graceful shutdown) |
| *middleware* | middleware | middleware | middleware | middleware |
| componente (React) | component | composant | componente | компонент |
| *hook* (React) | Hook | Hook | Hook | Hook |
| estado (de un componente) | state | état (state) | estado (state) | състояние (state) |
| *props* | props | props | props | props |
| efecto (efecto de React) | effect | effet | efeito | ефект |
| renderizar / renderizado | to render / rendering | faire le rendu / rendu | renderizar / renderização | рендирам / рендиране |
| JSX/TSX | = | = | = | = |
| DOM | = | = | = | = |
| inyección de HTML (XSS) | HTML injection (XSS) | injection de HTML (XSS) | injeção de HTML (XSS) | инжектиране на HTML (XSS) |
| *cross-site scripting* | cross-site scripting | cross-site scripting | cross-site scripting | cross-site scripting |
| *path traversal* | path traversal | traversée de chemin (path traversal) | path traversal | path traversal |
| *Content Security Policy* | = | = | = | = |
| sanitizar | to sanitize | assainir | sanitizar | санитизирам |
| antipatrón | antipattern | anti-patron | antipadrão | антишаблон |
| ejercicio / solución | exercise / solution | exercice / solution | exercício / solução | упражнение / решение |
| depurar / depurador | to debug / debugger | déboguer / débogueur | depurar / depurador | дебъгвам / дебъгер |
| editor (de código) | editor | éditeur | editor | редактор |
| terminal | terminal | terminal | terminal | терминал |
| salida (de un programa) | output | sortie | saída | изход |
| *tsconfig* | = | = | = | = |

## 5. Términos nuevos (se agregan abajo, con candado y aviso previo)

| es | en | fr | pt-BR | bg | agregado por |
|---|---|---|---|---|---|
| cadena (de texto) | string | chaîne | string | — | trad-pt |
| guion (script) | script | script | script | — | trad-pt |
| bandera (de compilación) | flag | option | flag | — | trad-pt |
| etiqueta (texto) | label | libellé | rótulo | — | trad-pt |
| por omisión | by default | par défaut | por padrão | — | trad-pt |
| retroalimentación | feedback | retour | feedback | — | trad-pt |
| guarda de exhaustividad | exhaustiveness check | garde d'exhaustivité | guarda de exaustividade | — | trad-pt |
| operador de propagación (`...`) | spread operator | opérateur de décomposition | operador spread | — | trad-pt |
| alias de tipo |  |  |  | псевдоним на тип | trad-bg |
| guarda de exhaustividad |  |  |  | защита за изчерпателност (exhaustiveness check) | trad-bg |
| operador de propagación (`...`) |  |  |  | оператор за разпростиране (spread) | trad-bg |
| discriminante |  |  |  | дискриминант | trad-bg |
| propiedad opcional |  |  |  | незадължително свойство | trad-bg |
