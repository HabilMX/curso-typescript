# Leçon 6 — Les données qui viennent de l'extérieur

**Durée :** 2 × 45 min

**Ce que tu construis :** validation de la configuration et des réponses

**Ce que tu apprends :** le type ne valide pas à l'exécution : valider à la frontière ; types dérivés du schéma

## À la fin, tu seras capable de

- Distinguer les données fiables à l'intérieur du programme des valeurs qui arrivent depuis du JSON, une variable d'environnement ou une réponse HTTP.
- Recevoir des données externes comme `unknown` et ne les convertir en contrat interne qu'après les avoir validées.
- Écrire des gardes de type et des fonctions de validation qui donnent des erreurs utiles sans utiliser `any` ni assertions pour masquer les problèmes.
- Lire et valider une liste de services depuis un fichier JSON avant de lancer des requêtes concurrentes.
- Convertir les variables d'environnement, qui arrivent toujours sous forme de texte ou d'absence, en configurations numériques valides.
- Dériver le type interne d'un schéma de validation pour éviter de maintenir deux contrats qui se contredisent.

## Le pourquoi avant le comment

Jusqu'à la leçon précédente, le `revisor` possède une liste de `Servicio`, peut interroger ses cibles de façon concurrente et convertit les échecs attendus en valeurs `Estado`. Tout cela fonctionne très bien tant que chaque objet est construit directement dans des fichiers TypeScript. Si tu écris `{ nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 }`, le compilateur peut vérifier que l'objet contient les trois propriétés et que chacune a le type promis.

Un vrai programme ne se limite pas à des objets écrits par le développeur. La liste de services peut venir d'un fichier JSON modifié par quelqu'un de l'exploitation. Le port de l'API peut venir d'une variable d'environnement configurée au démarrage d'un conteneur. La réponse d'un service distant peut contenir du JSON produit par une autre application, avec une autre version, une autre politique d'erreurs ou un défaut temporaire. Dans les trois cas, le programme reçoit des valeurs JavaScript qui ne sont pas passées par le compilateur de ce projet.

C'est une frontière importante. À l'intérieur du `revisor`, après validation, tu peux travailler avec `Servicio`, `Estado` et `Reporte` comme des contrats connus. À la frontière, avant la validation, tu sais seulement que quelque chose est arrivé. Ce peut être un objet, un tableau, `null`, du texte, un nombre ou un objet qui semble correct sauf pour une propriété. La décision saine est de rendre cette incertitude explicite : recevoir `unknown`, inspecter la valeur pendant l'exécution et produire une donnée fiable ou une erreur qui indique ce qu'il faut corriger.

On pense souvent qu'une annotation TypeScript résout ce problème. Si tu écris `const servicio = JSON.parse(texto) as Servicio`, l'éditeur cesse d'afficher des avertissements et le code suivant peut lire `servicio.timeoutMs`. Mais aucune vérification n'a eu lieu. `as Servicio` demande au compilateur de te faire confiance ; il n'examine pas le JSON, ne convertit pas une chaîne en nombre et n'ajoute pas une propriété absente. Quand Node exécutera le JavaScript émis, l'alias `Servicio` n'existera plus.

La différence ressemble à celle qui existe en Go entre désérialiser du JSON et valider un `struct`. Go peut remplir les champs connus d'une structure, mais tu dois encore décider si les valeurs reçues sont acceptables : une URL vide, un port zéro ou une limite négative peuvent tenir dans leurs types et rester des configurations invalides. TypeScript a une responsabilité supplémentaire : avant même d'affirmer qu'une valeur a la forme d'un objet, il faut le vérifier. Le type statique protège les relations de ton code ; la validation protège l'entrée venue du monde extérieur.

La frontière n'est pas un endroit où répéter les validations dans toute l'application. Si dix fonctions demandent si `timeoutMs` est un nombre, tu finis avec dix versions de la même règle et dix messages différents. Si tu valides une fois au chargement de la configuration, le reste reçoit `readonly Servicio[]` et se concentre sur l'interrogation, la coordination et la présentation des résultats. La validation ne rend pas fiables les autres services distants ; elle établit où le `revisor` décide quelles données il peut accepter comme siennes.

Il importe aussi de distinguer la structure de la règle métier. Confirmer que `timeoutMs` est un nombre élimine une classe d'erreurs, mais admet encore `-50`, `NaN` ou `3.14`. Pour ce projet, la limite est une quantité entière de millisecondes et doit être positive. Confirmer que `url` est une chaîne ne prouve pas non plus que la cible répond ni qu'elle appartient au bon réseau ; cela vérifie seulement que la configuration contient un texte non vide que l'étape suivante peut interpréter comme une URL. Chaque couche répond à une question différente et aucune ne remplace les autres.

L'objectif de la leçon n'est pas de construire une énorme bibliothèque de validation. C'est d'apprendre un ordre de travail qui se maintient quand le projet grandit : définir une règle exécutable à la frontière, en tirer une valeur interne fiable et conserver une explication claire quand l'entrée ne la respecte pas. Cet ordre préparera le `revisor` à l'API de la leçon 8 et au panneau de la leçon 9, où le serveur comme le navigateur franchiront à nouveau des frontières de données.

## Les concepts

### Les types sont effacés ; `unknown` conserve le bon doute

TypeScript analyse le code avant d'émettre du JavaScript. Les alias, interfaces, paramètres génériques et annotations aident le compilateur, mais ne se transforment pas en vérifications automatiques à l'exécution. Node reçoit du JavaScript ordinaire : il ne peut pas demander si un objet « est un `Servicio` », parce que ce nom n'existe pas comme valeur pendant l'exécution.

`JSON.parse` convertit du texte JSON en une valeur JavaScript. Le standard permet que cette valeur soit n'importe lequel des types possibles de JSON : objet, tableau, chaîne, nombre, booléen ou `null`. Même si tu sais que le fichier devrait contenir des services, cette attente ne change pas ce qui est arrivé. C'est pourquoi il convient de conserver le résultat comme `unknown` avant de l'inspecter.

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

La figure compile parce que l'assertion ordonne au compilateur de traiter la valeur comme `Servicio`. Pourtant, l'exécution montre la réalité : `timeoutMs` reste une chaîne. Si une fonction ultérieure faisait de l'arithmétique avec cette valeur, JavaScript pourrait la convertir de manière inattendue ou produire `NaN`. Le problème n'a pas commencé dans l'opération arithmétique ; il a commencé au moment où l'on a affirmé un contrat sans preuve.

`unknown` ne signifie pas que la valeur est inutile. Il signifie que tu ne peux pas encore lire ses propriétés ni l'appeler comme une fonction. Cette restriction est utile parce qu'elle oblige à faire la vérification au bon endroit. Après avoir prouvé que la valeur est un objet non nul, tu peux examiner ses clés ; après avoir prouvé qu'une clé contient un entier positif, tu peux l'utiliser comme limite.

Ne confonds pas `unknown` avec `any`. `any` éteint la vérification et permet d'accéder à n'importe quelle propriété comme si elle était valide. C'est confortable pendant quelques secondes et coûteux ensuite : une erreur externe peut voyager silencieusement à travers plusieurs fonctions avant d'apparaître loin de son origine. `unknown`, en revanche, garde l'incertitude visible. C'est le type adapté au JSON, aux valeurs de `catch`, aux messages entre processus et aux données qui arrivent d'un réseau.

Dans le `revisor`, la liste configurée est une frontière. Le fichier JSON ne doit pas alimenter directement `revisarTodos` ; il doit d'abord passer par une fonction qui démontre qu'il existe une liste de services utilisables. Après cette fonction, `revisarTodos` peut conserver le contrat de la leçon 5 : elle reçoit une collection de `Servicio` et renvoie une promesse d'états. Elle n'a pas besoin de connaître le JSON ni les propriétés mal orthographiées.

### Gardes de type : vérifier la forme que JavaScript a réellement

Une garde de type est une fonction qui fait une vérification pendant l'exécution et dont la signature indique au compilateur ce que tu as appris si elle renvoie `true`. La vérification la plus simple pour commencer consiste à déterminer si une valeur est un enregistrement de propriétés. `typeof valor === "object"` ne suffit pas parce qu'en JavaScript `typeof null` vaut aussi `"object"`, et parce que les tableaux sont des objets même s'ils ne représentent pas la configuration d'un service.

Une garde pour enregistrement ne valide pas à elle seule un `Servicio`. Elle ouvre seulement la porte pour consulter les propriétés en toute sécurité. À partir d'elle, tu peux prendre `nombre`, `url` et `timeoutMs` comme des valeurs `unknown` et valider chacune avec ses règles. Séparer ces étapes évite de donner un sens trop large à une petite vérification.

La figure 06_01 utilise une version simplifiée et modifiable de `Servicio` pour isoler le risque d'une assertion. À partir de la figure 06_02, le modèle retrouve ses trois propriétés `readonly`, parce que la configuration a déjà été acceptée et ne doit pas changer pendant une vérification.

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

La fonction renvoie `Resultado<Servicio>` et ne lance pas d'exception pour une mauvaise configuration attendue. Cela permet à l'appelant de décider s'il faut arrêter le démarrage, afficher toutes les erreurs ou continuer avec une configuration par défaut. Pour une liste de cibles qui définit ce qui sera vérifié, arrêter le démarrage avec une explication vaut généralement mieux que de n'en lancer qu'une partie sans avertir.

La règle d'entier utilise `Number.isSafeInteger`, et pas seulement `typeof timeoutMs === "number"`. En JavaScript, `NaN`, `Infinity` et `2.5` ont aussi le type `number`, mais aucun ne représente correctement une quantité entière de millisecondes. La partie `timeoutMs <= 0` exprime une décision de ce projet : zéro ne signifie pas « sans limite » ; c'est une configuration invalide. Si le produit devait représenter « sans limite », il faudrait une alternative délibérée, et non l'exploitation d'un nombre ambigu.

Dans le `revisor`, cette même fonction convertit un objet externe en `Servicio` interne. Le type `readonly` retrouve son utilité après la frontière : une fois la configuration acceptée, personne ne devrait changer le nom, l'URL ni la limite d'une vérification déjà lancée. La garde ne valide pas que l'URL réponde. Cette vérification appartient à la requête asynchrone, qui peut produire un `EstadoFalla` même quand la configuration était parfaitement valide.

### JSON de configuration : valider le document entier avant de travailler

Un fichier JSON valide peut contenir des données incorrectes pour ton application. `JSON.parse` répond seulement si le texte suit la grammaire de JSON ; il ne sait pas que tu attends un tableau de services ni que leurs noms doivent être distincts. Par exemple, `{"timeoutMs":"mil"}` est du JSON valide, mais ce n'est pas une configuration utilisable.

Il convient de séparer trois échecs que l'on mélange souvent. Le premier est de ne pas pouvoir lire le fichier : peut-être n'existe-t-il pas ou le processus n'a-t-il pas la permission. Le deuxième est que le texte ne soit pas du JSON valide. Le troisième est que le JSON soit syntaxiquement correct mais ne respecte pas le contrat du `revisor`. Chacun demande une explication différente pour être corrigé, même si tous empêchent de lancer la vérification.

Le programme suivant charge un fichier situé à côté du module. Il utilise `node:fs/promises`, le préfixe requis pour les modules natifs de Node, et une URL relative à `import.meta.url` pour ne pas dépendre du répertoire depuis lequel Node a été invoqué. Le JSON est reçu comme `unknown` ; le tableau est validé élément par élément avant d'être renvoyé.

Cette figure utilise `await` au niveau supérieur du fichier. Enregistre-la dans le dossier `figuras/` créé dans la leçon 1, dont le `package.json` contient `{"type":"module"}` ; ainsi TypeScript et Node la traitent comme un module ESM. Sans cette configuration, `await` ne serait valide qu'à l'intérieur d'une fonction `async`.

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

Depuis TypeScript 6, `@types/node` n'est plus chargé automatiquement quand on compile un fichier isolé. Comme cette figure importe `node:fs/promises`, `--types node` inclut explicitement les déclarations de Node installées et permet à TypeScript de reconnaître ce module natif. L'option n'apporte que des types pour la compilation ; Node continue de fournir le module quand le programme s'exécute.

Le `as unknown` à la fin de `JSON.parse` n'affirme pas que le document est valide. Il fait le contraire : il évite de se fier au type large exposé par la bibliothèque et force `leerServicios` à le traiter comme une entrée non vérifiée. La preuve vient des vérifications concrètes de `Array.isArray`, `esRegistro`, `typeof` et `Number.isSafeInteger`.

Cet exemple arrête la validation au premier service invalide pour garder la fonction courte. Une autre politique valide consiste à accumuler tous les problèmes dans un tableau d'erreurs, surtout si une personne va éditer un gros fichier et qu'il vaut mieux tout corriger en un seul passage. La règle importante ne change pas : le rapport ne doit pas démarrer avant d'avoir décidé si la configuration complète est acceptable. Taire une entrée invalide et continuer peut laisser des services sans vérification sans que personne ne s'en aperçoive.

Il manque aussi une règle utile en production : les noms en double. La leçon 4 a déjà montré comment les détecter avec `Set`. Cette règle doit s'exécuter après avoir validé la forme de chaque service, car ce n'est qu'alors que tu sais que `nombre` est une chaîne. D'abord, tu convertis chaque entrée externe en un contrat fiable ; ensuite, tu appliques les règles qui relient plusieurs services entre eux.

### Variables d'environnement : texte, absence et conversion explicite

Les variables d'environnement franchissent elles aussi une frontière. Dans Node, `process.env.PUERTO` a le type `string | undefined`, même si la personne qui prépare le déploiement croit avoir écrit un nombre. Le système d'exploitation transporte du texte ; il n'existe pas de variable d'environnement numérique. Si la valeur est `"8080"`, tu dois la convertir. Si c'est `"ocho-mil-ochenta"`, la conversion doit échouer de façon lisible.

N'utilise pas `Number(valor)` sans une décision supplémentaire. `Number("")` produit `0`, `Number(" ")` produit aussi `0`, et `Number("3.5")` produit un nombre même s'il n'est pas un port entier. N'utilise pas non plus `parseInt` comme validation complète : `parseInt("3000ms", 10)` renvoie `3000`, acceptant silencieusement un texte qui était probablement une erreur. Une vérification du format avant la conversion garde le contrat clair.

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

L'objet `entorno` rend l'exemple déterministe. Dans le programme réel, le second argument sera `process.env.PUERTO`. La fonction n'a pas besoin de changer : elle continue de recevoir une chaîne ou `undefined`, et renvoie un nombre fiable ou un détail. La valeur par défaut n'est utilisée que lorsque la variable est absente ; elle ne doit pas masquer une variable présente mais mal écrite. Une absence peut avoir une valeur sûre choisie par le projet ; une configuration explicite et invalide doit demander une correction.

Dans le `revisor`, la configuration du port appartient au serveur de la leçon 8 et la configuration de la limite de services peut protéger le démarrage. Ne mélange pas ces variables avec la liste de `Servicio` : le port décrit comment l'API écoute ; la liste décrit quelles cibles elle interroge. Avoir de petites fonctions par catégorie permet de donner des messages précis et évite qu'une variable arbitraire finisse comme propriété optionnelle d'un service.

La validation des variables d'environnement est aussi une limite de sécurité. N'affiche jamais le contenu de toutes les variables pour déboguer une conversion échouée : un environnement peut contenir des secrets. Pour une valeur non sensible comme un port, tu peux nommer la variable qui a échoué. Pour un futur identifiant secret, indique qu'il manque ou qu'il est invalide sans reproduire le secret ni une partie de celui-ci dans un journal ou une réponse HTTP.

### Schémas et types dérivés : une seule règle pour l'exécution et la compilation

À mesure que les entrées se multiplient, écrire un type d'un côté et une validation indépendante de l'autre peut dupliquer les décisions. Tu pourrais mettre à jour `Servicio` pour ajouter `equipo` et oublier de mettre à jour le validateur ; le compilateur surveillerait les constructions internes, mais une entrée externe pourrait arriver sans le nouveau champ. Un schéma cherche à réduire cet écart : c'est une valeur qui sait lire `unknown` pendant l'exécution et qui permet en plus de dériver son type de sortie.

Un schéma n'est pas magique. Il a toujours besoin de règles explicites pour le texte, les entiers, les URL et les objets. La différence est que la fonction de validation a un contrat générique : elle reçoit `unknown` et fournit `Resultado<T>`. Le paramètre `T` décrit la valeur disponible après la validation. Un type conditionnel peut extraire ce `T` du schéma sans écrire une seconde définition manuelle.

### Types conditionnels, `infer` et types mappés, pas à pas

Un **type conditionnel** est une règle de types de la forme `A extends B ? X : Y` : si `A` est compatible avec `B`, il produit `X` ; sinon, il produit `Y`. `infer` est un mot réservé qui, à l'intérieur de cette comparaison, capture une partie du type que TypeScript peut déduire. Un **type mappé** parcourt les clés d'un autre type pour construire une propriété pour chacune ; la forme `[K in keyof T]` signifie « pour chaque clé `K` de `T` ». Les trois n'existent que pour le compilateur : ils ne génèrent aucune instruction JavaScript.

Ce petit exemple montre une pièce à la fois. `Salida` est conditionnel parce qu'il n'extrait `T` que lorsqu'il reçoit un `Esquema<T>` ; `infer T` nomme ce type extrait. `ValoresDe` est mappé : il conserve `nombre` et `timeoutMs` de `campos`, mais remplace chaque schéma par sa sortie. La compilation confirme que `servicio` a les deux propriétés avec le bon type avant que Node n'affiche le texte.

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

`Salida<Esquema<string>>` se résout en `string` ; `Salida<Esquema<number>>`, en `number`. C'est pourquoi le type mappé finit comme `{ nombre: string; timeoutMs: number }`. Si tu remplaces `timeoutMs` par du texte dans l'objet final, la compilation échoue : c'est la vérification statique qui accompagne la sortie de la figure. Tu peux maintenant lire la forme plus compacte de `Inferir` et de `{ [K in keyof T]: ... }` qu'utilise le schéma complet.

L'implémentation suivante est volontairement petite. Elle enseigne la relation entre une règle exécutable et le type dérivé ; elle ne prétend pas remplacer une bibliothèque de schémas mature dans un grand système. Remarque que l'unique assertion se trouve dans `objeto`, après que chaque clé a été validée. Elle est concentrée dans l'infrastructure générique, et non répartie chez ceux qui consomment des données externes.

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

`Inferir<typeof esquemaServicio>` ne crée pas de nouvelle validation. Il prend le type de sortie que décrit déjà la valeur `esquemaServicio`. Si tu ajoutes `equipo: textoNoVacio` à l'objet de champs, le type dérivé gagnera `equipo` et la validation l'exigera en même temps. Cette relation réduit une source habituelle de contradictions entre la définition statique et la vérification à l'exécution.

Dans le `revisor`, un schéma peut décrire aussi bien la configuration d'entrée qu'une réponse HTTP attendue d'un service particulier. La validation de configuration construit `Servicio` ; la validation de réponse peut construire un contrat spécifique à ce service avant que le code de vérification n'en extraie de l'information utile. Tu ne dois pas utiliser un schéma générique pour faire croire que tous les services distants répondent de la même façon. Chaque frontière a besoin du contrat qu'elle promet réellement et des règles opérationnelles que le projet décide d'accepter.

## L'erreur que tu vas voir

Avec TypeScript 7.0.2 et `strict`, essayer de lire une propriété directement depuis `unknown` produit TS18046. C'est le diagnostic qui protège la frontière : le compilateur sait que tu n'as pas encore fait de vérification à l'exécution.

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

TS18046 ne se corrige pas avec `valor as { nombre: string }`. Cette assertion ne fait que changer l'opinion du compilateur et laisse l'exécution tout aussi exposée. Vérifie d'abord que la valeur est un enregistrement, prends la propriété comme `unknown` et vérifie que c'est une chaîne. Une garde comme `esRegistro` de la figure 06_02 résout la première partie ; `typeof valor.nombre === "string"` résout la seconde.

Un autre diagnostic courant apparaît quand tu essaies d'utiliser une variable d'environnement comme nombre sans la convertir. `process.env.PUERTO` peut manquer et, même quand elle existe, reste du texte. Si une fonction a besoin d'un `number`, TypeScript ne doit pas accepter `string | undefined` comme substitut. La correction consiste à choisir une politique : utiliser une valeur par défaut pour l'absence, rejeter le démarrage ou convertir et valider le texte. Aucune de ces décisions ne s'exprime avec une assertion de type.

Les erreurs de JSON ont une autre forme parce qu'elles se produisent pendant l'exécution. `JSON.parse` lance `SyntaxError` si le fichier contient une virgule en trop, s'il manque un guillemet ou s'il n'a pas une syntaxe JSON valide. Attrape cette erreur près de la lecture du fichier et convertis-la en message de configuration. Ne la confonds pas avec un objet de forme incorrecte : un fichier peut passer `JSON.parse` et échouer ensuite dans `leerServicios`.

## Ce qui se fait de travers

- **Utiliser `as Servicio` sur du JSON.** L'assertion n'inspecte aucune valeur. Elle peut faire taire le compilateur et repousser l'échec jusqu'à une opération distante ou une partie du panneau qui n'a plus de contexte sur le fichier d'origine.

- **Déclarer le résultat externe comme `any`.** `any` laisse les propriétés, les appels et les conversions avancer sans preuve. À une frontière, ce confort élimine justement la vérification dont le programme a besoin. Reçois `unknown` et réduis le type avec des règles observables.

- **Valider seulement avec `typeof valor === "object"`.** `null` et les tableaux obligent à gérer des cas différents. Un objet ne garantit pas non plus les propriétés requises ni leurs types ; ce n'est que la première étape d'une validation de structure.

- **Accepter des nombres invalides parce que `typeof valor === "number"`.** `NaN`, l'infini, les fractions et les valeurs négatives sont des nombres pour JavaScript. Les règles du domaine doivent décider quel sous-ensemble représente une limite, un port ou une durée valide.

- **Convertir avec `parseInt` et accepter le résultat sans examiner le texte complet.** `parseInt("3000ms", 10)` accepte un préfixe numérique et écarte le reste. Pour la configuration, il vaut mieux rejeter la valeur et demander une correction explicite.

- **Utiliser des valeurs par défaut pour masquer une variable présente mais mal écrite.** Si `PUERTO=abc`, démarrer silencieusement sur un autre port crée un écart entre l'intention et le processus réel. La valeur par défaut est pour une absence délibérée, pas pour remplacer les erreurs.

- **Répéter la définition statique et le validateur sans relation claire.** Deux listes de champs peuvent diverger quand le contrat change. Un schéma qui dérive le type, ou des tests qui comparent les deux règles, maintient visible l'obligation de les mettre à jour ensemble.

- **Afficher des secrets dans les erreurs de configuration.** Indiquer le nom d'une variable manquante peut être utile ; afficher son contenu peut exposer des identifiants dans des terminaux, des journaux ou des réponses HTTP. Conçois les messages pour corriger sans révéler d'information sensible.

## Exercices

### Exercice 1 — Un lecteur d'URL

Écris `leerUrl(valor: unknown): Resultado<string>`. Elle doit accepter uniquement un texte non vide pouvant être converti avec `new URL(valor)`. Si le texte n'est pas une URL valide, elle doit renvoyer `ok: false` avec un détail lisible. Teste-la avec `https://catalogo.example` et avec `no-es-url`.

### Exercice 2 — Liste à noms uniques

Pars de `leerServicios` de la figure 06_03. Après avoir validé chaque entrée individuelle, utilise un `Set<string>` pour rejeter les noms en double. L'erreur doit mentionner le nom répété. Teste une liste avec deux entrées appelées `pagos` et confirme qu'aucune liste partielle n'est remise au code de vérification.

### Exercice 3 — Configuration de démarrage

Définis un type `ConfiguracionServidor` avec `puerto` et `maxServicios`, tous deux des entiers positifs. Écris `leerConfiguracion(entorno: Record<string, string | undefined>): Resultado<ConfiguracionServidor>`. Utilise `3000` comme valeur par défaut pour le port et `20` pour le maximum de services. Une variable présente avec un contenu invalide doit produire une erreur, et non activer la valeur par défaut.

### Exercice 4 — Schéma de réponse disponible

Utilise le patron `Esquema<T>` et `Inferir` pour créer un schéma d'une réponse avec `codigoHttp` entier positif et `duracionMs` entier non négatif. Dérive son type de sortie et écris une fonction qui reçoit ce type et produit `HTTP 200 en 42 ms`. Explique pourquoi cette fonction ne doit pas recevoir directement le résultat de `JSON.parse`.

## Solutions

### Solution 1

La fonction confirme d'abord qu'elle a reçu du texte, puis délègue la syntaxe à `URL`. Le constructeur peut lancer une exception ; on ne l'attrape donc que pour convertir une entrée invalide en résultat attendu de la validation.

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

Il n'est pas nécessaire que cette fonction interroge le réseau. Une URL bien formée peut pointer vers une cible qui n'existe pas ; c'est un échec de la vérification asynchrone, pas de la configuration.

### Solution 2

Les noms sont examinés après que chaque objet individuel a produit un `Servicio`. Ainsi, `servicio.nombre` est déjà une chaîne fiable et tu n'as pas besoin de mélanger la validation des types avec la règle d'unicité.

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

Le chargement complet peut d'abord appeler `leerServicios` et, en cas de succès, passer `resultado.valor` à `sinDuplicados`. Si l'une des deux échoue, aucune requête n'est lancée.

### Solution 3

La configuration réunit des décisions de démarrage qui n'appartiennent pas à un service individuel. Chaque conversion conserve le nom de la variable dans le détail pour faciliter la correction.

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

La valeur par défaut ne s'applique que dans la branche `valor === undefined`. Une chaîne vide ou un nombre négatif suivent la branche d'erreur et obligent à corriger l'environnement.

### Solution 4

Le type dérivé n'existe qu'après la validation de l'objet. La fonction de présentation reçoit une réponse déjà fiable et n'a pas à répéter les vérifications de `unknown`.

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

`JSON.parse` doit d'abord passer par `respuestaDisponible.leer`. Sans cette validation, le type dérivé ne serait qu'une promesse statique sur une valeur qui peut avoir une autre forme pendant l'exécution.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2`.
- [ ] En compilant et en exécutant `fig06_01.ts`, `string` et `rápido` apparaissent, ce qui démontre qu'une assertion ne transforme pas le JSON.
- [ ] En compilant et en exécutant `fig06_02.ts`, un service valide apparaît, puis le détail indiquant que `timeoutMs` doit être un entier positif.
- [ ] En compilant et en exécutant `fig06_03.ts`, `configuración: 2 servicios` apparaît exactement.
- [ ] En compilant et en exécutant `fig06_04.ts`, le port `8080` apparaît ainsi qu'une erreur pour `REVISOR_MAX_SERVICIOS`.
- [ ] En compilant et en exécutant `fig06_07.ts`, `catálogo: 1500 ms` apparaît ; remplacer `timeoutMs` par du texte empêche de compiler, parce que le type a été dérivé des schémas.
- [ ] En compilant `fig06_06.ts`, TS18046 apparaît sur la ligne qui essaie de lire `nombre` depuis `unknown`.
- [ ] Dans `fig06_03.ts`, avec `figuras/package.json` configuré comme module ESM, la compilation et l'exécution se terminent avec `configuración: 2 servicios`.

## Pour aller plus loin

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentation officielle sur les gardes de type et la réduction de `unknown` ; consulté le 2 octobre 2026.
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) — documentation officielle sur les types conditionnels et l'inférence avec `infer` ; consulté le 2 octobre 2026.
- [Node.js: `process.env`](https://nodejs.org/api/process.html#processenv) — documentation officielle sur les variables d'environnement dans Node ; consulté le 2 octobre 2026.
- [MDN : `JSON.parse()`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — référence JavaScript sur l'analyse de texte JSON et ses erreurs de syntaxe ; consulté le 2 octobre 2026.
