# Leçon 4 — Collections, génériques et erreurs

**Durée :** 2 × 45 min

**Ce que tu construis :** la liste de services et le rapport

**Ce que tu apprends :** tableaux, `Map`/`Set`, génériques, types utilitaires ; erreurs : exceptions vs résultat, `unknown` dans `catch`

## À la fin, tu seras capable de

- Construire et parcourir une liste typée de `Servicio` sans perdre le lien entre chaque service et sa configuration.
- Choisir entre un tableau, un `Map` et un `Set` selon la question à laquelle le `revisor` doit répondre.
- Écrire une fonction générique qui conserve la relation entre le type qu'elle reçoit et le type qu'elle renvoie.
- Utiliser `Pick`, `Omit`, `Readonly` et `Record` pour dériver des contrats sans dupliquer le modèle.
- Représenter une opération qui peut échouer avec une union discriminée de résultat.
- Corriger un accès non sûr à une valeur `unknown` dans un `catch` sans utiliser `any`.

## Le pourquoi avant le comment

Le modèle de la leçon précédente a défini ce qu'est un `Servicio` et quelles formes peut prendre un `Estado`. Cela a résolu une partie importante du problème : chaque valeur a désormais une forme explicite. Pourtant, un vrai vérificateur n'interroge pas un seul service. Il doit conserver une liste de cibles, vérifier chacune, rassembler leurs états et produire un rapport qui permette de répondre à des questions concrètes : combien de services ont été configurés, lesquels ont échoué, quel résultat correspond à catalogo et quels noms ont été répétés par accident.

En JavaScript, il est facile de commencer avec plusieurs valeurs isolées. Tu peux créer `catalogo`, `pagos` et `inventario` comme variables indépendantes, puis appeler une fonction pour chacune. Cette approche convient à une petite démonstration, mais le programme devient fragile dès que la configuration change. Ajouter un service oblige à chercher à plusieurs endroits ; ordonner le rapport exige de répéter de la logique ; et éviter les noms en double reste une règle que personne ne vérifie.

Les collections permettent d'exprimer que les données forment un ensemble avec une relation concrète. Un tableau répond à « quels sont les services et dans quel ordre veux-je les parcourir ? ». Un `Map` répond à « étant donné ce nom, quel est son état ? ». Un `Set` répond à « ai-je déjà vu ce nom ? ». Les trois structures peuvent contenir des données liées, mais elles ne font pas le même travail. Choisir une structure par habitude, plutôt que d'après la question à laquelle tu dois répondre, produit généralement du code plus long à lire et plus facile à casser.

Une difficulté apparaît aussi, que l'on ne voit pas avec un seul type. Le `revisor` traitera des tableaux de services, des tableaux d'états et peut-être des tableaux de messages pour le panneau. Tu pourrais écrire une fonction différente pour chaque tableau, mais tu finirais par copier la même logique. Une fonction générique permet de décrire la relation qui se conserve même quand le type des éléments change. Il ne s'agit pas de remplacer tous les types par une lettre mystérieuse : il s'agit de dire avec précision que le résultat reste du même type que l'entrée.

Enfin, cette leçon doit parler des échecs avant que la leçon 5 n'ajoute les opérations asynchrones et les vraies requêtes. Un programme peut échouer parce qu'un service n'a pas répondu, parce que la configuration contient des données incohérentes ou parce qu'une fonction a reçu quelque chose qu'elle n'attendait pas. JavaScript permet de lancer presque n'importe quelle valeur avec `throw` : une instance d'`Error`, une chaîne, un nombre ou même un objet incomplet. TypeScript strict part de cette réalité et traite la valeur de `catch` comme `unknown`. Cette décision peut sembler gênante au début, mais elle évite que le code de gestion d'erreurs lui-même échoue en essayant de lire une propriété qui n'existe peut-être pas.

En Go, une fonction renvoie en général une valeur et une `error`, et l'appelant décide s'il peut continuer. JavaScript et TypeScript ont eux aussi des exceptions : une opération peut interrompre le flux normal avec `throw`, et un autre bloc peut l'attraper avec `catch`. Aucun mécanisme n'est automatiquement meilleur. La différence utile est de décider quel genre d'échec chacun représente. Une exception convient à un problème exceptionnel qui traverse plusieurs couches ou pour interagir avec une bibliothèque qui lance déjà des erreurs. Un résultat typé convient quand l'échec est une possibilité normale du domaine et que l'appelant doit prendre une décision visible.

Le rapport du `revisor` ne doit pas dépendre d'une exception invisible qui interromprait toute l'exécution. Si pagos échoue et que catalogo répond, le rapport doit encore montrer ces deux faits. C'est pourquoi le résultat de la vérification de chaque service sera modélisé comme une union discriminée : un succès avec une valeur, ou un échec avec un détail. L'exception, si elle apparaît dans une couche inférieure, est convertie en ce résultat avant de continuer. Ainsi, le reste du programme travaille avec des données explicites et le panneau peut afficher un rapport complet.

Cette séparation évite aussi une fausse promesse. TypeScript peut vérifier qu'une fonction qui renvoie `Resultado<Estado>` fournit l'une des deux alternatives déclarées. Il ne peut pas garantir qu'une URL existe ni qu'une réponse HTTP décrit correctement la santé d'un service. La validation des données externes viendra dans la leçon 6. Ici, tu construiras les structures et les contrats internes qui permettront de recevoir, d'organiser et de rapporter ces données sans confondre une absence avec un succès.

## Les concepts

### Tableaux : une liste ordonnée et typée

Un tableau TypeScript utilise la même structure qu'un tableau JavaScript. Il conserve un ordre d'insertion, permet de parcourir ses éléments et possède une longueur accessible avec `length`. La différence est que TypeScript peut décrire quelle sorte d'éléments appartient à la liste. `Servicio[]` signifie « tableau dont les éléments sont des services » ; cela ne signifie pas « un objet qui a par hasard quelques propriétés semblables ».

L'ordre est une propriété importante. Si la configuration énumère catalogo, pagos et inventario dans cet ordre, le rapport peut respecter cet ordre pour que celui qui le lit trouve les résultats là où il les attend. Un tableau convient quand tu veux parcourir tous les éléments, conserver leur séquence ou transformer chacun avec des opérations comme `map`, `filter` et `find`.

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

L'annotation `Servicio[]` protège à la fois la création et les modifications ultérieures. Si tu essayais d'ajouter une chaîne, un objet sans URL ou une valeur dont `timeoutMs` est de type chaîne, le compilateur signalerait le problème avant l'exécution. C'est particulièrement utile parce que `push` modifie le tableau existant : tu ne crées pas une nouvelle liste que l'on pourrait vérifier uniquement sur son littéral initial.

Remarque le paramètre de `nombresDe` : c'est `readonly Servicio[]`, pas `Servicio[]`. La fonction n'a besoin que de lire la liste. Déclarer le paramètre en lecture seule communique cette intention et empêche que, par accident, la fonction fasse `push`, `pop` ou réaffecte une position. Cela ne fige pas le tableau à l'exécution ; comme `readonly` sur une propriété, c'est une protection statique. La personne qui possède la liste décide si elle peut la modifier ; une fonction qui ne fait que la consulter reçoit une vue avec moins de permissions.

Dans le `revisor`, le tableau de services est la source de travail. La configuration aura une liste ordonnée de `Servicio`, la leçon 5 la parcourra pour lancer des requêtes concurrentes et le rapport conservera une liste d'`Estado` pour que le panneau dispose d'une représentation facile à afficher. Ne transforme pas cette liste en `Map` simplement parce que chaque service a un nom : tu perdrais la séquence déclarée et tu obligerais le code de présentation à décider d'un ordre après coup.

JavaScript admet des positions inexistantes et permet de lire au-delà de la fin d'un tableau. `servicios[10]` produit `undefined` s'il n'y a que trois éléments. `strictNullChecks` fait de `null` et `undefined` des alternatives explicites quand un contrat les déclare déjà, comme c'est le cas avec `find`, mais `strict` seul ne change pas le type d'un accès par indice : pour TypeScript, `servicios[10]` reste `Servicio`. Si tu veux que chaque accès par indice soit traité comme potentiellement absent, active `noUncheckedIndexedAccess` ; le type devient alors `Servicio | undefined` et tu dois le vérifier avant de lire une propriété. La figure 04_08 montre le diagnostic que produit cette option. Avant d'indexer une liste venue de l'extérieur, tu dois vérifier sa longueur ou utiliser une opération qui communique l'absence, comme `find`.

Pour isoler les collections, les figures 04_01, 04_02 et 04_04 simplifient volontairement le modèle final de la leçon 3 : `timeoutMs` est modifiable et, dans la figure 04_02, `Estado.servicio` n'est que le nom sous forme de chaîne. Dans le `revisor` assemblé, `Servicio` conserve ses propriétés de configuration en lecture seule et chaque `Estado` conserve le `Servicio` complet ; ici, la forme réduite permet de se concentrer sur l'opération de chaque collection.

Évite aussi d'utiliser `forEach` par réflexe. `forEach` est utile pour exécuter un effet par élément, comme afficher une ligne, mais il ne construit aucun résultat et ne permet pas de sortir tôt de façon simple. `map` transforme tous les éléments en un autre tableau ; `filter` ne conserve que ceux qui remplissent une condition ; `find` obtient le premier ou `undefined`. Choisir la méthode d'après la valeur que tu produis rend plus évident ce que la fonction cherche à faire.

### `Map` et `Set` : consultations par clé et appartenance sans doublons

Un `Map<K, V>` associe une clé de type `K` à une valeur de type `V`. Contrairement à un objet ordinaire utilisé comme dictionnaire, un `Map` exprime que son but est de stocker des associations dynamiques, offre des méthodes claires comme `set`, `get`, `has` et `delete`, et peut utiliser des clés qui ne sont pas des chaînes. Pour le `revisor`, la clé naturelle sera le nom du service et la valeur sera son état.

`Map#get` renvoie `V | undefined`, même quand le type de la valeur n'admet pas `undefined`. La raison est juste : la clé peut ne pas exister. N'ignore pas cette union. Un état absent signifie autre chose qu'un état disponible, et le compilateur t'oblige à résoudre la différence avant d'utiliser les propriétés du résultat.

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

L'opérateur `??` signifie « utilise la valeur de droite uniquement si celle de gauche est `null` ou `undefined` ». Ici, il ne demande pas si l'état est vrai ou faux ; il demande s'il n'existe pas. Il vaut mieux que `||` quand une valeur valide peut être `0`, `false` ou une chaîne vide. Même si les états de l'exemple sont des objets et sont donc toujours des valeurs vraies, il est bon d'apprendre la distinction dès maintenant.

Un `Set<T>` conserve des valeurs sans les répéter. Quand tu ajoutes une seconde fois une chaîne identique, l'ensemble ne garde qu'une seule entrée. Cela ne trie pas les éléments par ordre alphabétique ni ne convertit les majuscules en minuscules : `"Pagos"` et `"pagos"` sont des chaînes distinctes. Si le domaine considère ces noms comme égaux, tu dois les normaliser délibérément avant de les ajouter. La structure ne peut pas deviner les règles métier.

Dans le `revisor`, un `Set<string>` est utile pour valider que la configuration ne répète pas de noms. Le tableau conserve la liste d'origine et un `Set` sert d'appui pendant la vérification. Si chaque nom est ajouté et que la taille de l'ensemble n'augmente pas, tu as trouvé un doublon. Un `Map<string, Estado>` sera utile après avoir produit le rapport si tu veux obtenir un état par nom sans parcourir toute la liste.

N'utilise pas un `Map` comme substitut universel d'un tableau. L'ordre d'insertion d'un `Map` est défini, mais cela ne veut pas dire qu'il doive piloter la présentation d'un rapport. N'utilise pas non plus un objet avec des signatures comme `{ [nombre: string]: Estado }` simplement pour éviter d'apprendre `Map`. Un objet simple est excellent quand tu connais ses propriétés à l'avance ; un `Map` est plus clair quand les clés apparaissent dynamiquement pendant l'opération.

### Génériques : conserver l'information de type en réutilisant une fonction

Une fonction générique utilise un paramètre de type, par convention `T`, pour exprimer une relation entre des parties de sa signature. Ce n'est pas une valeur disponible pendant que Node exécute le programme ; comme tous les types de TypeScript, il est effacé à la compilation. Son rôle est de permettre au compilateur de suivre la trace du type concret qui arrive dans une fonction et de le conserver dans le résultat.

Sans générique, une fonction qui obtient le premier élément d'une liste pourrait recevoir `unknown[]` et renvoyer `unknown`. Cela oblige l'appelant à inspecter à nouveau le résultat, alors que le compilateur savait déjà que la liste contenait des `Servicio`. Si tu écris la fonction pour recevoir `Servicio[]`, tu perds la possibilité de la réutiliser avec `Estado[]` ou une autre liste. Le générique réunit les deux besoins : il fonctionne avec plusieurs types et conserve celui qui a été choisi à chaque appel.

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

`T` ne signifie pas « n'importe quoi sans règles ». Il signifie « un type pas encore décidé, mais cohérent au sein de cet appel ». Au premier appel, TypeScript infère `T` comme `number` ; c'est pourquoi `primerPuerto` est `number | undefined`. Au second, il infère `string` ; c'est pourquoi `primerServicio` est `string | undefined`. Le `undefined` demeure parce qu'un tableau vide n'a pas de premier élément, quel que soit le type de ses éléments.

Les génériques peuvent aussi avoir des contraintes. Si une fonction doit accéder à `nombre`, il ne suffit pas d'écrire `<T>`, car toutes les valeurs n'ont pas cette propriété. Tu peux écrire `T extends { nombre: string }` pour déclarer la capacité minimale requise. La contrainte n'oblige pas les valeurs à être exactement cet objet ; elle admet les objets qui ont au moins cette propriété. Cela tire parti du typage structurel que tu as vu dans la leçon 3.

Dans le `revisor`, une fonction générique sera utile pour ne pas dupliquer l'infrastructure. Par exemple, le rapport pourra regrouper des états, chercher le premier élément d'une liste ou encapsuler un résultat réussi sans perdre le type de la valeur. Ne rends pas une fonction générique simplement parce que tu le peux. Si l'opération est conçue exclusivement pour `Servicio`, utiliser `Servicio` dans la signature communique mieux le domaine. Le générique vaut la peine quand la logique fonctionne vraiment de la même manière pour plusieurs types et que la relation entre les types compte pour celui qui reçoit le résultat.

En Go, une fonction générique déclare aussi des paramètres de type, même si la syntaxe et certaines règles diffèrent. L'idée utile dans les deux langages est la même : tu n'écris pas une fonction générique pour éviter de penser à ses contrats, mais pour exprimer qu'un contrat se répète sans dégrader toutes ses valeurs vers une forme trop large.

### Types utilitaires : dériver des contrats du modèle

Un type utilitaire prend un type existant et produit un autre type pendant la compilation. Il ne modifie pas les objets à l'exécution. `Pick`, `Omit`, `Readonly` et `Record` sont des outils fournis par TypeScript pour exprimer des relations fréquentes sans copier manuellement toutes les propriétés d'un modèle.

Copier des types paraît inoffensif quand un `Servicio` a trois propriétés. Le problème arrive quand le modèle change. Si tu ajoutes `reintentos` à `Servicio` et qu'il existe trois copies partielles écrites à la main, ces copies peuvent devenir obsolètes de manières différentes. Dériver le contrat montre clairement qu'il dépend de l'original et permet au compilateur de signaler les changements qui demandent désormais une décision.

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

`Pick<Servicio, "timeoutMs">` ne conserve que les propriétés sélectionnées. Il convient pour un changement qui doit apporter exclusivement la donnée modifiable. `Omit<Servicio, "url">` crée une vue sans URL, utile si le panneau doit afficher des services mais ne doit pas recevoir cette propriété. Ce n'est pas une mesure de sécurité en soi : l'objet à l'exécution peut encore contenir une URL si tu l'envoies sans le transformer. Le type empêche le code TypeScript de l'utiliser dans le cadre de ce contrat ; la couche qui construit la réponse doit décider quelles données elle sérialise.

`Readonly<T>` rend en lecture seule les propriétés de premier niveau de `T`. Utilise-le quand une fonction reçoit une configuration qui ne doit pas changer. Il n'est pas profond : si une propriété contient un autre objet, les propriétés internes restent modifiables, sauf si tu les déclares aussi `readonly` ou utilises un type conçu pour cela. Il n'appelle pas non plus `Object.freeze` ; il ne change pas le comportement de JavaScript.

`Record<K, V>` décrit un objet dont les clés sont `K` et dont les valeurs sont `V`. Il est particulièrement utile pour représenter une structure sérialisable dont les clés sont déjà connues par leur type, ou une table que tu enverras en JSON. Pour une collection dynamique que tu géreras avec des méthodes comme `has` et `delete`, `Map` communique généralement mieux l'intention. La différence n'est pas une question de performance automatique, mais d'opérations et de sens.

Dans le `revisor`, `Omit<Servicio, "url">` peut définir la vue sûre qui arrivera au panneau, `Pick` peut représenter une mise à jour limitée du timeout et `Record<string, Estado>` peut servir de forme de rapport indexée par nom quand le contrat HTTP a vraiment besoin d'un objet JSON. Le modèle central reste `Servicio` ; les types utilitaires sont des vues dérivées pour des cas concrets, pas des substituts anonymes qui masquent le domaine.

### Erreurs : l'exception pour interrompre, le résultat pour continuer

Une exception change le flux normal. Quand une fonction exécute `throw`, JavaScript cherche le `catch` le plus proche capable de la gérer. S'il n'en trouve pas, le programme se termine sur une erreur. Ce mécanisme est utile pour les erreurs qui ne peuvent pas se résoudre localement ou pour les API qui signalent déjà leurs échecs par des exceptions.

Le problème apparaît quand l'échec est une alternative attendue de l'opération. Le `revisor` doit signaler que pagos a échoué ; il n'a pas besoin d'abandonner le rapport entier. Si `revisarServicio` lance une exception pour chaque service inaccessible et que personne ne la transforme, le premier problème peut t'empêcher de connaître l'état des autres. Pour les résultats attendus, une union discriminée garde la décision dans le flux normal du programme.

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

La propriété `ok` est le discriminant. Quand TypeScript voit `if (resultado.ok)`, il sait que `valor` existe dans cette branche ; dans l'autre, il sait que `detalle` existe. Tu n'as pas besoin d'écrire des propriétés optionnelles comme `valor?: T` et `detalle?: string`, parce que ces propriétés optionnelles permettraient des états ambigus : les deux données présentes ou les deux absentes.

Dans le `revisor`, `Resultado<Estado>` peut représenter le résultat interne d'une requête avant de l'intégrer au rapport. Si une bibliothèque lance une exception réseau, une couche proche de l'opération peut l'attraper, la convertir en `{ ok: false, detalle }` et laisser l'exécution se poursuivre. La leçon 5 ajoutera des promesses et des opérations concurrentes ; l'idée importante est déjà prête : un échec par service doit être une information du rapport, pas nécessairement la fin du processus.

Ne convertis pas toutes les erreurs en résultats ni toutes les alternatives en exceptions. Une configuration invalide au démarrage peut être une raison légitime d'arrêter le programme, car il n'y a pas d'exécution fiable à poursuivre. L'absence de réponse d'un service sur dix, en revanche, est exactement l'une des choses que le rapport doit montrer. La question n'est pas « quel mécanisme paraît le plus moderne ? », mais « qui peut se rétablir, et quelle information doit-il recevoir ? ».

### `unknown` dans `catch` : inspecter avant de faire confiance

JavaScript permet de lancer n'importe quelle valeur. Même si la convention saine est de lancer des instances d'`Error`, du code tiers peut faire `throw "sin red"`, `throw 503` ou `throw { mensaje: "falló" }`. C'est pourquoi, avec `strict`, TypeScript traite la variable de `catch` comme `unknown` : tu n'as encore aucune preuve que ce soit une `Error` ni qu'elle possède une propriété `message`.

La solution n'est pas de changer le type en `any`. `any` désactive les vérifications précisément là où les données sont les moins fiables. La solution est de réduire `unknown` avec une vérification qui s'exécute réellement. `error instanceof Error` vérifie que la valeur appartient à la hiérarchie d'`Error` ; après cette condition, TypeScript permet de lire `message`.

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

La fonction `textoError` concentre une politique petite mais importante : quel texte sera affiché quand une couche inférieure lance quelque chose. Le cas final n'essaie pas de sérialiser arbitrairement un objet et ne révèle pas de détails potentiellement sensibles. Dans une application réelle, tu conserverais peut-être plus de contexte dans un journal interne, mais le message qui arrive au rapport ou au panneau doit être délibéré.

Dans le `revisor`, les requêtes réseau de la leçon suivante utiliseront cette conversion près du `try/catch`. Le résultat vers le reste du programme sera un `EstadoFalla` avec un détail sûr. Cela réduit le nombre d'endroits qui ont besoin de comprendre les exceptions et évite que React, l'API et la logique du rapport implémentent trois versions différentes de la même inspection.

## L'erreur que tu vas voir

Avec TypeScript 7.0.2 et `strict`, accéder à `message` sans vérifier la valeur capturée produit TS18046. L'erreur ne dit pas que les exceptions sont invalides. Elle dit que le compilateur ne peut pas prouver que la valeur capturée possède une propriété `message`, car JavaScript permet de lancer n'importe quelle valeur.

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

La correction n'est pas une assertion comme `error as Error`. Une assertion force seulement le compilateur à faire confiance ; elle ne vérifie rien pendant que le programme tourne. Si quelqu'un a lancé une chaîne, l'accès suivant peut produire `undefined` ou échouer autrement. Utilise une vérification comme `error instanceof Error` avant de lire `message`, comme dans la figure 04_06.

Il est aussi normal de rencontrer TS2322 en essayant de ranger une valeur de mauvais type dans un tableau ou un `Map` typé. Par exemple, si un `Map<string, Estado>` attend un `Estado` dont la propriété `tipo` ne peut valoir que `"disponible" | "falla"`, la chaîne `"correcto"` n'est pas compatible, même si elle semble exprimer une idée proche. Le diagnostic signifie que le vocabulaire du programme est défini dans un type littéral et que la nouvelle chaîne n'en fait pas partie. Corrige la valeur pour utiliser le littéral convenu ou, si le domaine a réellement gagné un nouvel état, modifie l'union et traite le nouveau cas dans toutes les fonctions qui l'utilisent.

Quand un `Map#get` renvoie une valeur qui peut être `undefined`, le diagnostic habituel n'est pas une gêne du compilateur mais un signal de conception. Une clé absente est un cas possible. Décide ce qui doit se passer : renvoyer un résultat d'échec, utiliser une valeur par défaut explicite, interrompre une opération ou vérifier `has` avant de lire. N'utilise pas `!` pour effacer le `undefined`, sauf si tu peux démontrer localement que la clé existe et que la preuve se trouve à côté de l'accès.

Si tu as activé `noUncheckedIndexedAccess` dans le projet, le compilateur applique la même précaution à un accès par indice. Cette option n'appartient pas à `strict` : ajoute-la explicitement au `tsconfig.json` quand le projet indexe des tableaux ou des tables avec des indices dont il ne peut démontrer la validité. Le résultat est une vérification supplémentaire qui évite de traiter comme existant un élément que JavaScript peut renvoyer comme `undefined`.

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

Avec le même fichier et seulement `strict`, TypeScript accepte l'accès parce que l'indice conserve le type `Servicio` ; en ajoutant `noUncheckedIndexedAccess`, il exige de traiter `undefined`. N'utilise pas cette option en remplacement de la validation de données externes : elle ne fait qu'améliorer le contrat statique des accès à des collections qui existent déjà en mémoire.

## Ce qui se fait de travers

Utiliser `any[]` pour « que la liste accepte tout » élimine le contrat précisément quand la collection mélange des données d'origines différentes. Une liste de services ne doit accepter ni nombres, ni chaînes, ni objets partiellement formés. S'il y a un point où tu ne connais pas encore les éléments, utilise `unknown[]` et valide chacun à la frontière ; si le programme connaît déjà le contrat, utilise `Servicio[]`.

Copier la définition de `Servicio` pour créer une vue du panneau semble plus rapide que d'utiliser `Pick` ou `Omit`, mais cela crée des contrats qui divergent avec le temps. Le problème n'est pas seulement le texte répété : le modèle central peut changer et les copies peuvent conserver une ancienne version sans que le compilateur relie les deux. Dérive une vue quand sa relation avec le modèle est réelle et utilise un nouveau type nommé quand elle représente un concept différent.

Utiliser un `Set` pour construire le rapport est une autre erreur fréquente. Un ensemble répond à la question de savoir si quelque chose appartient ou non ; il ne conserve pas l'état associé à chaque service. Si tu as besoin de consulter « quel état a eu pagos ? », il te faut un `Map` ou un tableau d'états avec une recherche. Si tu as besoin de conserver l'ordre d'affichage, conserve aussi une liste ordonnée.

Lancer des exceptions pour le résultat attendu de chaque service rend le flux de contrôle difficile à suivre. L'appelant doit deviner quelles opérations peuvent lancer, quelles erreurs attraper et lesquelles laisser passer. Pour un échec qui doit apparaître dans le rapport, renvoie une alternative de résultat ou convertis-la en `EstadoFalla` près de l'opération qui a échoué.

Attraper une exception et écrire `catch (error) { return error.message; }` suppose une garantie que JavaScript n'offre pas. C'est particulièrement dangereux parce que le code de récupération peut échouer et masquer la cause d'origine. Traite la valeur comme `unknown`, vérifie sa forme et conserve un message de secours pour les valeurs non reconnues.

Enfin, n'utilise ni `as` ni l'opérateur `!` pour faire taire un type qui ne te plaît pas. `map.get(nombre)!` affirme que le résultat existe, mais ne crée pas d'entrée dans la table. `valor as Estado` affirme qu'une valeur respecte le modèle, mais ne valide ni du JSON ni une réponse HTTP. Ces outils ont des usages ponctuels quand il existe déjà une preuve que le compilateur ne peut pas inférer ; ils ne remplacent ni une vérification ni une décision de conception.

## Exercices

### Exercice 1 — Détecter les noms répétés

Écris une fonction `nombresDuplicados(servicios: readonly Servicio[]): string[]`. Elle doit parcourir la liste, détecter les noms qui apparaissent plus d'une fois et renvoyer chaque nom en double une seule fois. Utilise un `Set` pour les noms déjà vus et un autre pour les doublons. Teste la fonction avec catálogo, pagos, catálogo et inventario ; la sortie ne doit contenir que `catálogo`.

### Exercice 2 — Trouver un service par son nom

Écris `buscarServicio(servicios: readonly Servicio[], nombre: string): Servicio | undefined`. Elle doit renvoyer le service dont le nom correspond exactement, ou `undefined` s'il n'existe pas. Écris ensuite une ligne qui affiche l'URL trouvée ou le texte `servicio no configurado`. N'utilise pas d'assertion de type pour éliminer le cas `undefined`.

### Exercice 3 — Convertir un tableau en index

Écris une fonction générique `porClave<T extends { nombre: string }>(valores: readonly T[]): Map<string, T>`. Elle doit créer un `Map` dont la clé est `nombre` et dont la valeur est l'objet d'origine. Teste-la aussi bien avec un tableau de `Servicio` qu'avec un tableau d'objets qui ont `nombre` et une autre propriété différente.

### Exercice 4 — Convertir une exception en résultat

Définis `Resultado<T>` avec les alternatives `ok: true` et `ok: false`. Écris `ejecutar<T>(operacion: () => T): Resultado<T>` pour exécuter une opération synchrone. Si l'opération renvoie une valeur, elle doit produire un succès ; si elle lance n'importe quelle valeur, elle doit renvoyer un échec avec un détail obtenu par une fonction qui reçoit `unknown`. Teste une opération qui renvoie `200` et une autre qui lance `new Error("sin conexión")`.

## Solutions

### Solution 1

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

La fonction sépare deux questions. `vistos` répond à la question de savoir si le nom est déjà apparu ; `duplicados` évite de l'ajouter plusieurs fois au résultat. S'il y avait trois entrées appelées catálogo, le résultat resterait une seule chaîne.

### Solution 2

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

`find` exprime exactement le contrat : il peut trouver un élément ou n'en trouver aucun. Le chaînage optionnel `?.` évite de lire `url` quand `encontrado` est `undefined` ; `??` fournit le texte de secours.

### Solution 3

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

La contrainte exige la propriété nécessaire pour former la clé, mais conserve toutes les autres propriétés. C'est pourquoi le premier `Map` conserve `timeoutMs` et le second conserve `turno`.

### Solution 4

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

La fonction générique conserve le type que renvoie l'opération. Si l'opération produit un nombre, le résultat réussi contient un nombre ; si elle produisait un `Estado`, il contiendrait un `Estado`. L'exception ne sort pas de `ejecutar` : elle est transformée en une alternative explicite que l'appelant peut afficher ou combiner avec d'autres résultats.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2`.
- [ ] En exécutant `npx tsc --strict --target ES2022 --module nodenext fig04_01.ts` et `node fig04_01.js`, tu vois une quantité de trois services et les noms dans l'ordre catálogo, pagos et inventario.
- [ ] En exécutant `npx tsc --strict --target ES2022 --module nodenext fig04_02.ts` et `node fig04_02.js`, l'ensemble affiche deux noms uniques bien que l'on ait essayé d'ajouter catálogo deux fois.
- [ ] En exécutant `npx tsc --strict --target ES2022 --module nodenext fig04_05.ts` et `node fig04_05.js`, tu vois à la fois `resultado: 4` et `falla: el divisor no puede ser cero`.
- [ ] En exécutant `npx tsc --strict --target ES2022 --module nodenext fig04_07.ts`, TS18046 apparaît sur la ligne qui essaie de lire `message` depuis `unknown`.
- [ ] En exécutant `npx tsc --strict --noUncheckedIndexedAccess --target ES2022 --module nodenext fig04_08.ts`, TS2532 apparaît quand on lit une propriété de l'élément indexé sans vérifier `undefined`.

## Pour aller plus loin

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — documentation officielle sur les paramètres de type, l'inférence et les contraintes ; consulté le 2 octobre 2026.
- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — documentation officielle de `Pick`, `Omit`, `Readonly`, `Record` et d'autres types utilitaires ; consulté le 2 octobre 2026.
- [TSConfig: useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) — documentation officielle sur l'usage de `unknown` dans les variables de `catch` ; consulté le 2 octobre 2026.
- [TSConfig: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) — documentation officielle de la vérification supplémentaire pour les accès indexés ; consulté le 2 octobre 2026.
