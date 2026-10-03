# Leçon 2 — Types, fonctions et inférence

**Durée :** 90 min (ou 2 × 45)

**Ce que tu construis :** les fonctions de base du `revisor`

**Ce que tu apprends :** primitifs, inférence, unions et littéraux, *narrowing* (affinage de type), `null`/`undefined` avec `strictNullChecks`

## À la fin, tu seras capable de

- Déclarer des valeurs `string`, `number` et `boolean`, et expliquer quand TypeScript peut inférer leur type.
- Écrire des fonctions avec des paramètres et des retours typés pour isoler des règles du `revisor`.
- Modéliser des valeurs qui peuvent avoir plus d'une forme au moyen d'unions et de littéraux.
- Réduire une union avec `typeof`, des comparaisons et des vérifications explicites avant d'utiliser une valeur.
- Différencier `null` de `undefined` et gérer les deux sans désactiver `strictNullChecks`.
- Lire et corriger les diagnostics TS2345, TS2322, TS18048 et TS2339.
- Compiler et exécuter avec `strict` des fonctions déterministes du `revisor`.

## Le pourquoi avant le comment

Le `revisor` finira par interroger plusieurs services, rassembler des résultats et les afficher dans une API et dans un panneau web. Avant d'arriver à HTTP, aux promesses ou à React, il lui faut une couche petite mais importante : des fonctions qui transforment des données simples en décisions lisibles. Elles recevront un nom, une durée, un code HTTP ou un détail d'échec, et renverront une classification ou une ligne de rapport.

En JavaScript, tu pourrais écrire ces fonctions sans décrire aucun type. Le programme exécuterait un appel comme `clasificarDuracion("rápido")` jusqu'à ce qu'il tente de comparer le texte avec un nombre. L'erreur apparaîtrait pendant l'exécution, peut-être loin de la ligne où l'argument incorrect a été passé. Si la branche qui contient le problème ne s'exécute pas pendant un test manuel, l'erreur peut rester cachée jusqu'à ce qu'une donnée réelle la déclenche.

TypeScript change le moment où tu reçois cette information. Une fonction peut déclarer qu'elle attend un nombre de millisecondes et renvoie une chaîne. Le compilateur vérifie alors chaque appel connu : si quelqu'un lui passe du texte, il signale la contradiction avant d'émettre le JavaScript. Le type ne rend pas la règle métier automatiquement correcte ; tu dois encore décider si 500 ms, c'est rapide ou lent. Ce qu'il fait, c'est s'assurer que la règle reçoit le genre de donnée pour lequel elle a été écrite.

Cette différence paraît petite quand il n'y a qu'une fonction et deux valeurs. Elle devient décisive quand le programme grandit. Une fonction au nom clair et à la signature précise est une frontière : celui qui l'appelle sait ce qu'il doit fournir, celui qui la maintient sait ce qu'il peut supposer à l'intérieur, et le compilateur vérifie que les deux parties coïncident. En Go, les paramètres et les retours font aussi partie de la signature. TypeScript conserve cette discipline, même si ses types sont effacés avant que Node exécute le fichier.

La leçon précédente a mis l'environnement en place et montré que TypeScript émet du JavaScript. Cette leçon commence à utiliser cette vérification de façon utile. Tu ne vas pas annoter un type à chaque caractère ni transformer le code en mur de syntaxe. Tu vas laisser le compilateur inférer l'évident et écrire des contrats là où l'intention doit rester visible : les limites d'une fonction, les alternatives possibles et les absences que le programme doit traiter.

Le premier risque du `revisor` n'est pas un réseau lent ; c'est de perdre du sens. Un texte comme `"200"` peut ressembler à un code HTTP, mais reste du texte. Une valeur `undefined` peut signifier que personne n'a fourni de détail, qu'une propriété n'existe pas ou qu'une fonction n'a rien renvoyé. Une valeur `"disponible"` ressemble à une chaîne ordinaire jusqu'à ce que tu la fasses entrer dans un ensemble fermé d'états. Les types servent à préserver ces significations pendant que les valeurs passent d'une fonction à l'autre.

Tu n'as pas besoin d'apprendre chaque type de TypeScript aujourd'hui. En fait, essayer de tous les mémoriser avant d'écrire des fonctions donne une idée fausse : que programmer avec des types consiste à remplir des formulaires syntaxiques. L'ordre utile est autre. D'abord, tu identifies quelles valeurs comporte le problème. Ensuite, tu définis ce qui entre et ce qui sort d'une opération. Enfin, tu rends explicites les doutes qui ne peuvent pas encore se résoudre avec un seul type.

Le `revisor` utilisera des objets `Servicio` et `Estado` dans la leçon suivante. Ici, il n'est pas encore opportun d'anticiper ce modèle complet. Tu travailleras avec ses composants : le nom d'un service, une durée, un code et un détail. Ainsi, tu peux apprendre ce que signifie une signature sans la mêler aux propriétés, aux interfaces ou aux unions discriminées. Quand ces types composés apparaîtront, tu reconnaîtras qu'ils sont faits des mêmes pièces que celles que tu pratiques aujourd'hui.

## Les concepts

### Primitifs, annotations et inférence

Les valeurs les plus fréquentes du `revisor` commencent comme des primitifs de JavaScript. Un nom ou une URL sont des `string` ; une limite ou une durée sont des `number` ; une décision oui ou non est un `boolean`. Écris les noms en minuscules : `string`, `number` et `boolean`. `String`, `Number` et `Boolean` existent comme constructeurs et comme types d'objets enveloppes, mais ce n'est pas la manière habituelle d'annoter des valeurs courantes.

JavaScript ne distingue pas l'entier du décimal comme le fait Go. En TypeScript, `443`, `1500` et `42.5` sont des `number`. Cette décision vient du modèle numérique de JavaScript : un code HTTP, un port et une durée peuvent partager le type de base même s'ils ont des significations différentes. Plus tard, des noms clairs, des objets et des validations aideront à conserver le contexte. Pour l'instant, ne déclare pas un prétendu `int` : il n'existe pas comme type primitif de TypeScript.

Une annotation se place après le nom : `const timeoutMs: number = 1500`. Il n'est pas obligatoire de l'écrire quand la valeur initiale exprime déjà le type. Dans `const timeoutMs = 1500`, TypeScript infère que la valeur est un nombre. L'inférence n'est pas une devinette qui n'aurait lieu que dans l'éditeur ; elle fait partie de la vérification du programme. Le compilateur observe l'initialiseur et conserve assez d'information pour vérifier les usages ultérieurs.

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

L'annotation de `timeoutMs` est valide, mais la ligne aurait aussi compilé sans `: number`. N'écris pas des annotations répétitives simplement parce qu'elles existent. Si la valeur et le nom rendent l'intention claire, l'inférence réduit le bruit sans perdre en sécurité. En revanche, une annotation est particulièrement utile dans une signature publique, dans un retour que tu veux garder stable ou là où la valeur initiale ne communique pas le contrat complet.

`const` et `let` concernent la possibilité de réassigner une variable, pas le fait que TypeScript vérifie les types. Utilise `const` par défaut quand le nom continuera de pointer vers la même valeur. Utilise `let` quand la variable doit recevoir une autre valeur plus tard. Évite `var` : il a d'anciennes règles de portée et rend plus difficile de suivre où une valeur peut changer.

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

Dans le `revisor`, les configurations qui ne changent pas pendant une exécution normale s'exprimeront généralement avec `const`. Une durée calculée, un code HTTP reçu ou un compteur local pourraient utiliser `let` si la logique a besoin de les mettre à jour. La question n'est pas « quel mot est-ce que j'utilise le plus ? », mais « ce nom doit-il pointer vers une autre valeur ? ». Choisir `const` quand tu le peux réduit les chemins de changement possibles et rend une fonction plus facile à lire.

L'inférence a aussi des limites saines. Si tu déclares `let estado = "pendiente"`, TypeScript infère en général `string`, et pas seulement le littéral `"pendiente"`, parce que `let` permet la réassignation. Si tu déclares `const estado = "pendiente"`, la valeur ne change pas et peut conserver une information plus précise. Cette différence sera utile pour modéliser des littéraux. Ne force pas la précision sur chaque variable locale ; utilise-la quand l'ensemble des alternatives a une signification pour le domaine.

Dans le `revisor`, tu n'as pas besoin de déclarer une variable séparée pour chaque donnée si elle n'est utilisée qu'une fois. Une fonction peut recevoir une valeur et en renvoyer une autre immédiatement. Déclare des noms quand ils aident à lire la règle, pas pour faire croire que chaque étape demande un stockage. Un nom comme `limiteRapidoMs` explique une décision ; un nom comme `x` oblige à chercher son origine à chaque fois.

### Fonctions : des contrats qui entrent et qui sortent

Une fonction reçoit des valeurs, exécute une règle et peut renvoyer un résultat. En JavaScript, cette structure existe déjà. TypeScript ajoute la possibilité de décrire ses paramètres et son retour. La signature `function clasificarDuracion(duracionMs: number): string` dit trois choses : la fonction s'appelle `clasificarDuracion`, elle attend un nombre et elle produit une chaîne.

Les types des paramètres sont des contrats avec les appels. À l'intérieur de la fonction, `duracionMs` peut s'utiliser comme un nombre. À l'extérieur, un appel doit fournir un nombre. Le type de retour est un contrat dans l'autre sens : celui qui appelle peut traiter le résultat comme une chaîne. Cette information permet à l'éditeur de proposer les opérations adéquates et au compilateur de trouver les incompatibilités avant l'exécution.

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

Le retour `: number` de cet exemple pourrait être inféré, car `valor * 2` produit un nombre. Il reste raisonnable d'écrire le retour dans les fonctions qui représentent des règles du programme. La signature devient une lecture rapide de l'intention et évite qu'une modification ultérieure change accidentellement ce que la fonction promet de renvoyer. Ce n'est pas une obligation absolue : dans de très courtes fonctions locales, laisser TypeScript inférer le retour peut être plus clair.

Une fonction qui ne réalise qu'un effet, par exemple afficher une ligne, peut déclarer un retour `void`. `void` ne signifie pas exactement qu'aucune valeur JavaScript n'existe ; cela signifie que la personne qui appelle ne doit pas dépendre d'un résultat utile. Dans le `revisor`, il convient de séparer les fonctions qui calculent du texte de celles qui l'affichent. La première peut se tester avec des entrées et des sorties précises ; la seconde se limite à présenter ce résultat.

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

La décision que 500 ms soit la limite ne vient pas du type. C'est une règle de cet exemple. TypeScript vérifie que la comparaison reçoit un nombre et que les chemins renvoient des chaînes ; il ne peut pas décider à ta place quel seuil représente un service acceptable. Cette frontière est importante : les types protègent la forme d'une décision, tandis que les tests, l'observation et les exigences définissent si la décision est la bonne.

Une signature à plusieurs paramètres peut convenir tant que les valeurs sont peu nombreuses et ont des significations distinctes. `formatearLinea(nombre, duracionMs)` est facile à lire. Quand les paramètres deviennent nombreux, facultatifs ou faciles à intervertir, un objet avec des noms de propriétés sera préférable. Cette transition arrive dans la leçon suivante avec `Servicio`. Ne prends pas les devants en créant des objets anonymes pour une fonction qui n'a besoin que d'un nombre et d'un texte.

Les fonctions aident aussi à éviter la duplication. Si chaque partie du programme décide de son côté quelle durée est rapide, tôt ou tard des limites différentes apparaîtront. Centraliser la règle dans `clasificarDuracion` ne rend pas le programme magique, mais laisse une seule décision à revoir quand le critère change. Le panneau, l'API et les tests pourront utiliser la même fonction ou une règle équivalente bien définie.

En Go, la signature d'une fonction exige des types explicites pour les paramètres et les retours. TypeScript est plus souple parce qu'il peut inférer une partie de cette information, mais tu ne perds rien à utiliser des types aux limites importantes. La différence utile est que TypeScript travaille sur les valeurs de JavaScript et permet des unions très expressives ; la discipline reste la même : une petite fonction doit dire ce dont elle a besoin et ce qu'elle garantit.

### Unions et littéraux : représenter des alternatives réelles

Une union exprime qu'une valeur peut appartenir à l'une de plusieurs alternatives. Elle s'écrit avec `|` : `string | number` signifie « une chaîne ou un nombre ». Cela ne signifie pas « les deux à la fois », ni que tu puisses utiliser librement toutes les opérations des deux types. Cela signifie qu'avant d'utiliser une opération exclusive à une alternative, tu devras savoir laquelle tu as.

Les littéraux permettent d'être plus précis qu'un type large. `"disponible"` est une chaîne concrète ; `"disponible" | "falla"` est un ensemble fermé de deux chaînes concrètes. Cette précision est utile quand un texte n'est pas un message quelconque mais une catégorie du domaine. L'état d'une vérification ne devrait pas accepter `"tal vez"` par accident si le programme ne comprend que disponible ou échec.

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

Le nom `Prioridad` ne crée pas de valeur pendant l'exécution ; c'est un alias de type. Le JavaScript émis ne conserve que la fonction, les comparaisons et les chaînes. Pourtant, pendant la compilation, il empêche un appel comme `etiquetaPrioridad("crítica")` jusqu'à ce que tu décides explicitement d'intégrer cette alternative au contrat.

Les littéraux ne sont pas une décoration pour chaque texte. Si une variable contient un message libre écrit par une personne, elle doit normalement être `string`. Si elle contient une valeur de contrôle qui modifie la logique, un littéral ou une union de littéraux rend visibles les options permises. La question utile est : « est-ce que j'accepte n'importe quel texte, ou seulement des catégories connues ? ».

Dans le `revisor`, une classification initiale peut être une union de littéraux avant de devenir le modèle plus complet d'`Estado`. La fonction suivante reçoit un code HTTP et produit une catégorie limitée. Elle ne prétend pas remplacer toutes les règles HTTP ; elle montre seulement que le rapport initial distingue deux résultats observables.

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

La plage choisie est une simplification délibérée pour cette étape. Plus tard, le `revisor` devra distinguer les pannes réseau, les délais dépassés, les codes non réussis et les réponses valides. Le gain actuel est d'apprendre à exprimer qu'une fonction ne renvoie pas une chaîne arbitraire. Ses sorties possibles sont nommées et finies.

Ne confonds pas une union avec une liste de valeurs que le programme devrait parcourir. `string | number` décrit une possibilité de type ; elle ne crée pas de tableau. Ce n'est pas non plus une invitation à tout transformer en unions. Si une fonction reçoit toujours un nombre, déclarer `number | string` uniquement pour accepter plus de cas la rend plus difficile à utiliser. Élargis un contrat quand la réalité du domaine exige des alternatives, pas pour éviter de décider quelle donnée doit arriver.

### *Narrowing* : n'utiliser une alternative qu'après l'avoir vérifiée

Quand une fonction reçoit une union, TypeScript doit être prudent. S'il reçoit `string | number`, il peut appliquer les opérations que les deux alternatives partagent, mais pas `toUpperCase`, car les nombres n'ont pas cette méthode. La solution n'est pas une assertion ni `any` : c'est de vérifier la valeur avec une condition qui serait aussi nécessaire en JavaScript.

La réduction de type, ou *narrowing* (affinage de type), se produit quand TypeScript comprend qu'une branche élimine des alternatives. `typeof valor === "string"` réduit `string | number` à `string` dans cette branche. En dehors de celle-ci, ou dans la branche contraire, le type s'ajuste selon la condition. Le programme devient sûr parce que la vérification à l'exécution et la connaissance statique expriment la même décision.

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

Dans cet exemple, les deux alternatives finissent interpolées en texte, si bien que le code pourrait paraître inutile. Son but est de montrer où chaque forme devient disponible. Si tu devais appliquer `puerto.padStart(4, "0")`, tu ne pourrais le faire que dans la branche chaîne. Si tu avais besoin de le comparer numériquement à une limite, il serait logique de traiter la branche numérique ou de convertir et valider explicitement le texte.

L'égalité avec un littéral réduit aussi les types. Si `resultado` est `"disponible" | "falla"`, la condition `resultado === "disponible"` permet à TypeScript de traiter la valeur comme le littéral `"disponible"` dans la branche. Cela peut sembler redondant parce que les deux alternatives sont des chaînes, mais cela devient essentiel quand chaque alternative apporte des données différentes dans une union discriminée. Cette construction arrivera dans la leçon 3.

Dans le `revisor`, une fonction peut accepter une durée qui n'est pas encore disponible. Si elle existe, elle classe la durée ; sinon, elle renvoie un texte qui explique l'absence. La vérification ne sert pas seulement à calmer le compilateur : elle définit ce qu'une personne doit voir quand le programme n'a pas de mesure.

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

N'invente pas une durée comme `0` pour éviter de traiter `undefined`. Zéro peut être une mesure réelle, une durée impossible ou une valeur marqueur, selon le système. Remplacer « il n'y a pas de donnée » par un nombre mélange deux significations distinctes et laisse une condition ultérieure tirer une conclusion erronée. Une union oblige à nommer l'absence et à décider quoi en faire.

Évite aussi une condition fondée sur la valeur de vérité d'un nombre quand ce que tu dois vérifier est l'absence. `if (!duracionMs)` traite `0`, `NaN`, `null` et `undefined` comme faux. Si la question est « la durée est-elle absente ? », écris `duracionMs === undefined` ou la vérification exacte qui représente ta règle. Les conditions de vérité sont utiles, mais elles ne remplacent pas une décision précise sur les valeurs valides.

### `null`, `undefined` et `strictNullChecks`

JavaScript a deux valeurs fréquentes pour exprimer l'absence : `undefined` et `null`. `undefined` apparaît, par exemple, en lisant une propriété inexistante, en omettant un argument facultatif ou en terminant une fonction sans `return`. `null` est généralement une valeur affectée intentionnellement pour dire qu'il n'y a pas de résultat. Le langage n'impose pas de différence universelle ; le projet doit choisir des conventions qui communiquent l'intention.

Avec `strictNullChecks` actif, `null` et `undefined` ne peuvent pas être utilisés là où l'on attend un `string`, un `number` ou un autre type non nullable. Pour les admettre, tu dois l'écrire : `string | undefined`, `string | null` ou `string | null | undefined`. Cette exigence n'est pas de la bureaucratie. Elle fait que le contrat révèle qu'une fonction peut ne pas avoir de réponse et oblige à gérer cette possibilité avant d'appeler des méthodes ou de lire des propriétés.

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

Il n'existe pas de règle générale disant que `null` est toujours meilleur que `undefined`. Pour un paramètre facultatif d'une fonction, `undefined` s'accorde en général avec le comportement normal de JavaScript : si l'appelant omet l'argument, la valeur est `undefined`. Pour une donnée dont la source communique explicitement « n'existe pas », `null` peut être une bonne représentation. L'important est de ne pas utiliser les deux comme des synonymes sans raison, car tu obliges chaque consommateur à traiter deux formes de la même absence.

Le `revisor` utilisera `undefined` quand une fonction locale n'a pas reçu de durée ou n'a pas généré de détail. Quand une future API recevra du JSON, elle devra valider si le champ est absent, s'il vaut `null` ou s'il contient un autre type. Ces frontières externes sont étudiées dans la leçon 6. Pour l'instant, les types ne décrivent que des valeurs internes que tu as déjà décidé de représenter d'une certaine façon.

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

`strictNullChecks` ne te protège pas à lui seul contre les données externes. Un JSON peut affirmer n'importe quoi et une assertion comme `as string` peut mentir au compilateur. La protection de cette option commence une fois qu'une valeur a un type fiable à l'intérieur du programme : elle t'évite d'oublier qu'elle peut manquer. La validation qui transforme des entrées inconnues en données fiables demande des vérifications à l'exécution et viendra plus tard.

En Go, une valeur zéro peut masquer une absence si elle n'est pas modélisée avec soin : une chaîne vide et le nombre zéro peuvent être des valeurs valides ou des signes qu'il n'y avait pas de donnée. TypeScript rend l'absence visible avec des unions. Cela n'élimine pas la nécessité de concevoir une convention, mais rend plus difficile d'ignorer une possibilité que la signature a déjà déclarée.

## L'erreur que tu vas voir

TS2345 apparaît quand un argument ne correspond pas au type d'un paramètre. Avec TypeScript 7.0.2, `tsc` affiche le diagnostic suivant. La fonction attend un `number`, mais l'appel lui donne une chaîne entre guillemets.

```ts
// fig02_11.ts

function etiquetaPuerto(puerto: number): string { return `puerto ${puerto}`; }

console.log(etiquetaPuerto("443"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig02_11.ts
fig02_11.ts(5,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

TS2345 ne signifie pas que TypeScript ne peut pas travailler avec la valeur. Il signifie que cet appel contredit le contrat de cette fonction. La correction dépend de l'intention. Si 443 est un port connu écrit dans le code, retire les guillemets : `etiquetaPuerto(443)`. Si la valeur est arrivée sous forme de texte depuis la configuration, ne la convertis pas avec une assertion ; valide et transforme la donnée à la frontière avant de la remettre à une fonction qui exige un nombre.

TS2322 apparaît quand tu essaies d'affecter un type incompatible à une variable, une propriété ou un retour typé. C'est le même problème de compatibilité, mais vu dans une affectation plutôt que dans un appel. Par exemple, `const timeoutMs: number = "1500"` produit TS2322 parce que le côté gauche exige un nombre et que le côté droit offre une chaîne. Lis les deux côtés du diagnostic avant de changer le code : il révèle souvent une décision de domaine qui n'est pas encore claire.

TS18048 apparaît quand tu utilises une valeur qui peut être `undefined` comme si elle existait toujours. Le fichier suivant ne compile pas parce que `toUpperCase` ne peut être appelé que sur une chaîne présente.

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

La correction n'est pas de désactiver `strictNullChecks` ni d'écrire `detalle!` pour faire taire le diagnostic. Tu dois d'abord décider ce que représente l'absence. S'il n'y a pas de détail, le rapport doit peut-être dire `"sin detalle"`. Si un détail est obligatoire, alors la signature doit être `detalle: string` et l'appelant doit en fournir un. Si l'absence est valide, vérifie-la avant d'utiliser la valeur :

```ts
function detalleEnMayusculasSeguro(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "SIN DETALLE";
  }

  return detalle.toUpperCase();
}
```

TS2339 apparaît généralement quand on essaie d'utiliser une opération qui n'existe pas sur tous les membres d'une union. Par exemple, `valor.toUpperCase()` n'est pas valide si `valor` est `string | number`, car un nombre n'a pas cette méthode. Utilise `typeof valor === "string"` avant d'appliquer une opération exclusive aux chaînes. La vérification n'est pas une formalité pour le compilateur : c'est la branche d'exécution qui empêche Node d'essayer d'appeler une méthode inexistante.

Quand l'un de ces diagnostics apparaît, évite de chercher d'abord une conversion ou une assertion. Pose-toi trois questions : quelle valeur existe réellement à ce point, quelle valeur la fonction ou la variable attend, et si la différence reflète une donnée invalide ou une alternative valide qu'il reste à modéliser. Cette séquence trouve en général le problème plus près de sa cause qu'une correction rapide qui fait seulement disparaître le code TSxxxx.

## Ce qui se fait de travers

- **Annoter chaque variable alors que l'initialiseur est déjà clair.** `const nombre: string = "catálogo"` n'est pas incorrect, mais répéter l'information à chaque ligne cache les annotations qui expriment vraiment une décision. Laisse TypeScript inférer les valeurs locales évidentes ; annote les signatures, les contrats et les points où le type doit rester explicite.

- **Utiliser `any` pour supprimer une erreur de types.** `any` désactive les vérifications précisément là où TypeScript pouvait détecter une intégration incorrecte. Si une donnée venue de l'extérieur n'a pas encore de forme connue, elle sera `unknown` jusqu'à ce qu'on la valide. Si une donnée interne a des alternatives valides, utilise une union et réduis-la.

- **Accepter `string | number` quand le domaine a besoin d'un nombre.** Une union large peut paraître souple, mais elle oblige chaque fonction à gérer deux cas. Si un port doit être numérique dans le `revisor`, convertis-le et valide-le une seule fois à l'entrée ; ensuite, utilise `number` dans le reste du programme.

- **Utiliser `as` ou `!` pour cacher TS18048.** Une assertion ne rend pas présente une valeur absente. `detalle!` peut compiler, mais Node continuera d'échouer si la valeur était `undefined`. Modélise l'absence, vérifie-la et définis le résultat que doit produire chaque cas.

- **Représenter l'absence par `0`, `""` ou `false` sans le définir.** Ces valeurs peuvent être des données valides. Si `0` signifie « il n'y a pas eu de mesure », tu ne pourras plus le distinguer d'une vraie mesure de zéro. Utilise `undefined` ou `null` quand l'absence fait partie du contrat et garde les valeurs valides pour leur signification propre.

- **Confondre une union avec un permis d'ignorer des alternatives.** Si une signature déclare `string | undefined`, toute personne qui l'utilise doit décider ce qui se passe quand il n'y a pas de chaîne. L'union ne fait pas de la valeur une chaîne ; elle rend visible que le programme a deux chemins.

- **Écrire des règles de classification répétées.** Si une partie considère rapide un service de 500 ms et qu'une autre utilise 300 ms, le rapport perd en cohérence. Nomme et centralise la règle dans une petite fonction. Quand le critère changera, il y aura une décision explicite à mettre à jour et à tester.

## Exercices

### Exercice 1 — Classer une durée

Écris `clasificarDuracion(duracionMs: number): "rápido" | "lento"`. Définis qu'une durée de 500 ms ou moins est `"rápido"` et qu'une durée supérieure est `"lento"`. Invoque la fonction avec 500 et 501, affiche les deux sorties et confirme qu'un appel avec `"500"` produit TS2345.

### Exercice 2 — Une ligne de base pour le revisor

Écris `lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string`. Elle doit utiliser `clasificarDuracion` et renvoyer une ligne comme `catálogo: HTTP 200, rápido`. Exécute la fonction avec catálogo, le code 200 et la durée 320. Essaie ensuite de passer `"200"` comme code et explique pourquoi le compilateur le rejette.

### Exercice 3 — Des détails qui peuvent manquer

Écris `lineaDeFalla(nombre: string, detalle: string | undefined): string`. S'il y a un détail, elle doit produire `nombre: falla (detalle)` ; s'il n'y en a pas, elle doit produire `nombre: falla sin detalle`. Teste les deux cas sans utiliser `any`, `as` ni l'opérateur `!`.

### Exercice 4 — Un littéral oblige à décider

Définis `type ResultadoBasico = "disponible" | "falla"`. Écris `resultadoDesdeCodigo(codigoHttp: number): ResultadoBasico` pour classer les codes de 200 à 399 comme disponibles et les autres comme échec. Crée ensuite `etiquetaResultado(resultado: ResultadoBasico): string` qui renvoie un texte différent pour chaque alternative. Essaie de l'appeler avec `"pendiente"` et explique le diagnostic.

## Solutions

### Solution 1

Le retour est une union de littéraux parce que la fonction ne doit pas produire n'importe quelle chaîne. La comparaison inclut 500, c'est pourquoi on utilise `<=`.

```ts
type Clasificacion = "rápido" | "lento";

function clasificarDuracion(duracionMs: number): Clasificacion {
  return duracionMs <= 500 ? "rápido" : "lento";
}
```

Un appel comme `clasificarDuracion("500")` produit TS2345. Les guillemets font de la valeur un `string`, alors que la fonction a été écrite pour comparer des nombres.

### Solution 2

La fonction reçoit trois valeurs simples parce que cette étape n'introduit pas encore l'objet `Servicio`. La fonction de classification évite de dupliquer la règle des 500 ms.

```ts
function lineaBase(nombre: string, codigoHttp: number, duracionMs: number): string {
  const clasificacion = clasificarDuracion(duracionMs);
  return `${nombre}: HTTP ${codigoHttp}, ${clasificacion}`;
}
```

L'appel correct est `lineaBase("catálogo", 200, 320)`. Utiliser `"200"` contredit le contrat : un code HTTP se manipule comme un nombre dans cette fonction.

### Solution 3

La comparaison exacte avec `undefined` réduit le type à `string` dans le second retour. Ainsi, `detalle.toUpperCase()` ou toute autre opération sur les chaînes serait sûre dans cette branche.

```ts
function lineaDeFalla(nombre: string, detalle: string | undefined): string {
  if (detalle === undefined) {
    return `${nombre}: falla sin detalle`;
  }

  return `${nombre}: falla (${detalle})`;
}
```

L'absence n'est pas déguisée en chaîne vide. Le rapport conserve la différence entre recevoir un message et ne pas en recevoir.

### Solution 4

L'union de littéraux restreint à la fois ce que renvoie la fonction de classification et ce qu'accepte la fonction de présentation.

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

`etiquetaResultado("pendiente")` produit TS2345 parce que `"pendiente"` n'appartient pas à l'ensemble déclaré. Si le programme a réellement besoin de cette alternative, tu dois l'ajouter au type et mettre à jour les fonctions qui la gèrent.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2`.
- [ ] Chaque figure qui compile dans cette leçon se termine sans diagnostics avec `--strict --target ES2022 --module nodenext`.
- [ ] `fig02_04.ts` affiche exactement `catálogo: rápido` et `pagos: lento`.
- [ ] `fig02_08.ts` affiche une classification pour 320 ms et `sin duración registrada` pour `undefined`.
- [ ] En compilant `fig02_11.ts`, tu obtiens TS2345 et tu n'exécutes pas le fichier comme s'il avait compilé.
- [ ] En compilant `fig02_12.ts`, tu obtiens TS18048 et tu peux le corriger par une vérification explicite de `undefined`.
- [ ] Tu peux écrire une fonction qui renvoie `"disponible" | "falla"` sans accepter une troisième chaîne par accident.
- [ ] Tu peux expliquer pourquoi `strictNullChecks` oblige à traiter une absence au lieu de la convertir en `0`, `""` ou `false`.

## Pour aller plus loin

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — documentation officielle sur les primitifs, les annotations, l'inférence, les fonctions, les unions et les littéraux. Consulté le 2 octobre 2026.

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentation officielle sur les signatures, les paramètres, les retours, l'inférence et les fonctions qui ne renvoient pas de valeur utile. Consulté le 2 octobre 2026.

- [TypeScript TSConfig: `strictNullChecks`](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) — documentation officielle sur le traitement séparé de `null` et `undefined` en mode strict. Consulté le 2 octobre 2026.

- [MDN : opérateur `null`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/null) — référence sur `null` en JavaScript et sa différence pratique avec les autres valeurs d'absence. Consulté le 2 octobre 2026.
