# Leçon 7 — Modules, tests et qualité

**Durée :** 2 × 45 min

**Ce que tu construis :** le vrai projet, avec des tests

**Ce que tu apprends :** modules ESM, organisation par responsabilité, tests pilotés par table de cas, lint et formatage

## À la fin, tu seras capable de

- Séparer le `revisor` en modules ESM avec des responsabilités nommées et des dépendances explicites.
- Importer des valeurs et des types depuis des fichiers relatifs en utilisant des extensions `.js` compatibles avec Node.
- Écrire un test avec une table de cas qui vérifie les résultats disponibles et les échecs.
- Interpréter une erreur TS2305 provoquée par un export ou un import qui ne correspond pas.
- Configurer des commandes distinctes pour compiler, tester, vérifier le style et formater un projet.
- Décider quel code doit être pur et facile à tester, et quel code appartient aux frontières des fichiers, du réseau ou de la console.

## Le pourquoi avant le comment

Jusqu'à la leçon précédente, le `revisor` peut déjà faire un travail utile. Il a un modèle `Servicio`, représente chaque dénouement avec une union discriminée `Estado`, interroge plusieurs cibles de façon concurrente et valide la configuration avant de l'utiliser. Pourtant, les exemples tiennent encore dans peu de fichiers. Cela aide à étudier une idée isolée, mais ne suffit pas pour soutenir un programme qui va continuer à grandir avec une API HTTP dans la leçon 8 et un écran dans la leçon 9.

Un gros fichier a un avantage initial : tout est sous les yeux. Il a aussi un coût qui augmente vite. Pour trouver comment un état est présenté, tu parcours du code de configuration, de validation, de minuteurs et de requêtes. Pour tester une règle de texte, tu finis par importer ou exécuter des morceaux qui n'ont aucun rapport avec ce texte. Pour changer un détail de la réponse HTTP, tu peux toucher sans le vouloir une règle que le panneau doit conserver. Le problème n'est pas qu'un long fichier soit moralement mauvais ; c'est qu'il cesse de communiquer où vit chaque décision.

Les modules résolvent ce manque de limites. Un module est un fichier qui déclare quelles valeurs il offre avec `export` et ce dont il a besoin chez d'autres modules avec `import`. Cette frontière n'est pas un commentaire ni une suggestion pour celui qui maintiendra le code : TypeScript vérifie que les noms importés existent, et Node résout les fichiers qui seront chargés pendant l'exécution. Quand `reporte.ts` exporte `lineaReporte`, il annonce une capacité concrète. Quand `revisor.ts` importe `Servicio` et `Estado`, il rend visibles les concepts dont il a besoin pour coordonner une vérification.

En JavaScript, les modules ESM sont aussi une solution à un problème historique. Autrefois, il était fréquent de charger plusieurs fichiers au moyen de balises `<script>` et de dépendre de l'ordre de chargement global. Un fichier pouvait supposer qu'un autre avait déjà créé une variable globale, même si rien dans son code ne montrait cette relation. Si l'ordre changeait, l'erreur apparaissait à l'exécution. ESM remplace cet accord implicite par une relation déclarée : le fichier qui a besoin de quelque chose l'importe avec un chemin concret. Node peut construire le graphe de dépendances avant de démarrer le programme.

Le `revisor` a besoin d'une organisation qui grandisse sans créer de fourre-tout. Il ne convient pas de mettre toutes les interfaces dans un dossier appelé `types`, toutes les fonctions dans `utils` et tout le reste dans `helpers`. Ces noms décrivent la forme technique du code, pas la responsabilité du domaine. Avec le temps, `utils` devient l'endroit où finit toute fonction que personne n'a voulu nommer. Pour trouver quelque chose, il faut se rappeler où elle a été cachée, et non comprendre ce qu'elle fait.

Une structure initiale plus utile peut ressembler à ceci :

```text
revisor/
  package.json
  tsconfig.json
  src/
    modelo.ts
    configuracion.ts
    revisar.ts
    reporte.ts
    main.ts
    reporte.test.ts
```

`modelo.ts` décrit `Servicio`, `EstadoDisponible`, `EstadoFalla` et `Estado` : il ne lit pas de fichiers, n'ouvre pas de connexions et n'affiche rien. `configuracion.ts` reçoit des données externes et les valide, comme tu l'as appris dans la leçon 6. `revisar.ts` coordonne les requêtes concurrentes et convertit leurs dénouements en états. `reporte.ts` transforme des états fiables en texte ou, plus tard, en données pour l'API et le panneau. `main.ts` relie les pièces au démarrage du programme. Le test vit à côté du code qu'il protège, dans `src/reporte.test.ts` ; à la compilation, il devient `dist/reporte.test.js` et Node le découvre là.

Le but n'est pas d'avoir beaucoup de dossiers. Séparer chaque petite fonction dans un fichier peut aussi cacher la relation entre des pièces qui devraient se lire ensemble. La question utile est : « ce fichier répond-il à une question claire du programme ? ». Si la réponse de `reporte.ts` est « comment représentons-nous ce qui s'est passé », il y a une responsabilité. Si un dossier s'appelle `misc`, `common` ou `helpers`, il n'y a probablement pas encore de question claire.

Cette organisation a une conséquence importante pour les tests. Une fonction qui reçoit un `Estado` et renvoie une chaîne n'a besoin ni de réseau, ni de fichiers, ni d'horloge, ni de variables d'environnement. Avec les mêmes données, elle renvoie le même résultat. Ce genre de fonction est peu coûteux à tester avec une table de cas. En revanche, une fonction qui lit `process.env`, appelle `fetch`, mesure le temps et écrit dans la console mélange plusieurs frontières. Elle peut nécessiter des tests d'intégration, mais elle ne doit pas empêcher de tester séparément les règles centrales.

Go fait une séparation comparable au moyen des paquets. Une différence utile est que Go compile des paquets et décide quels noms sont publics par la majuscule, alors que TypeScript et JavaScript utilisent explicitement `export` et `import`. Dans les deux cas, l'idée de fond est la même : une dépendance doit être visible et limitée. Il ne s'agit pas de découper des fichiers par sport ; il s'agit de pouvoir changer une partie sans avoir à comprendre ni risquer tout le programme.

Les tests sont la seconde moitié de cet accord. Le compilateur répond à la question de savoir si le programme respecte les types : par exemple, que `lineaReporte` reçoive un `Estado` et non une chaîne. Il ne répond pas à la question de savoir si la règle de présentation est celle dont tu avais besoin. Une fonction peut compiler et malgré tout afficher `HTTP undefined`, omettre un échec ou classer le code 500 comme disponible. Un test construit une entrée connue, exécute une règle et compare le résultat à une attente explicite.

La qualité ne se réduit pas non plus aux tests. Un formateur rend les décisions visuelles cohérentes : indentation, espaces, guillemets et sauts de ligne cessent d'être une discussion répétée à chaque changement. Un linter cherche des motifs qui compilent mais cachent souvent des erreurs ou des ambiguïtés : une variable déclarée et jamais utilisée, une promesse oubliée, une condition difficile à lire ou une conversion risquée. Chaque outil répond à une question différente. `tsc` demande si le programme respecte ses contrats statiques ; les tests demandent si des cas connus produisent les résultats attendus ; le linter cherche des signes de code problématique ; le formateur maintient une présentation prévisible.

Tu ne dois pas attendre d'avoir des centaines de fichiers pour adopter ces pratiques. C'est justement quand le projet est petit qu'il est le plus facile de choisir des noms clairs, de tester une règle importante et d'automatiser les vérifications mécaniques. Ensuite, quand le `revisor` aura un serveur et un écran, ces décisions fonctionneront déjà comme un filet de sécurité au lieu de devenir un énorme nettoyage risqué.

## Les concepts

### Modules ESM : des fichiers aux contrats explicites

Dans un projet avec `"type": "module"` dans `package.json`, Node interprète les fichiers `.js` émis comme des modules ECMAScript, aussi appelés ESM. TypeScript peut analyser des fichiers `.ts` qui suivent ces règles et émettre du JavaScript compatible. L'option `--module nodenext` indique au compilateur qu'il doit respecter la résolution moderne de Node, y compris une règle qui surprend souvent au début : les imports relatifs doivent écrire l'extension du fichier que Node exécutera.

C'est pourquoi un fichier TypeScript écrit `import { lineaReporte } from "./reporte.js"` alors que le fichier source s'appelle `reporte.ts`. TypeScript comprend qu'après la compilation, Node chargera `reporte.js`. Écrire `./reporte` laisse une ambiguïté qu'ESM ne résout pas comme le faisait CommonJS, l'ancien système de modules de Node, qui résolvait chemins et exports avec d'autres règles.

Node 24 LTS peut aussi exécuter directement un fichier `.ts` grâce au *type stripping* (effacement des types) : il remplace la syntaxe de types par des espaces et exécute le JavaScript obtenu. Ce n'est ni une compilation ni une vérification de types ; `node archivo.ts` ne lit pas `tsconfig.json` et n'applique pas `strict`. De plus, il n'accepte que la syntaxe effaçable : `enum`, `namespace` avec des valeurs et les propriétés de paramètre exigent `--experimental-transform-types` ; `.tsx` n'est pas pris en charge, les `.ts` dans `node_modules` ne sont pas admis et les types importés doivent utiliser `import type`. Pour un script d'un seul fichier, cela peut être pratique, mais ce n'est pas le flux du `revisor`.

En particulier, Node qui exécute du `.ts` exige des extensions `.ts` littérales dans les `import`, alors que ce projet écrit `.js` pour que le JavaScript émis soit correct. Si Node reçoit `src/main.ts`, il chercherait littéralement `./modelo.js` dans `src/` et ne le trouverait pas. C'est pourquoi le projet à plusieurs fichiers se compile avec `tsc` et s'exécute depuis `dist/main.js` : là, `modelo.js`, `reporte.js` et les autres modules déclarés par les imports existent bien. L'option `erasableSyntaxOnly` peut t'avertir des constructions que Node ne pourrait pas effacer ; elle ne remplace ni la compilation ni les tests.

Un module peut exporter des valeurs qui existent à l'exécution, comme des fonctions et des constantes, et aussi des types qui ne servent qu'au compilateur. La syntaxe `import type` rend cette différence visible. Si tu importes `Estado` uniquement pour annoter une variable, TypeScript élimine cet import du JavaScript émis. Si tu importes `lineaReporte`, Node doit la charger, parce que c'est une fonction qui est appelée à l'exécution.

Le programme suivant a deux modules. `modelo.ts` est propriétaire du contrat des états et de la règle pour les convertir en lignes. Le fichier principal construit des données du `revisor` et consomme la fonction exportée. Aucun fichier ne dépend d'une variable globale ni n'a besoin de savoir comment l'autre est implémenté au-delà de son export public.

```json fig07_01/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_01/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_01/src/modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

export type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

export type Estado = EstadoDisponible | EstadoFalla;

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_01/src/main.ts
import { lineaReporte, type Estado } from "./modelo.js";

const catalogo: Estado = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 42,
};

const pagos: Estado = {
  servicio: {
    nombre: "pagos",
    url: "https://pagos.example",
    timeoutMs: 3000,
  },
  tipo: "falla",
  detalle: "tiempo límite",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```

```bash
$ cd fig07_01
$ npx tsc -p tsconfig.json
$ node dist/main.js
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo límite)
```

La frontière du module oblige à prendre des décisions utiles. `Estado` est exporté parce que `revisar.ts`, `reporte.ts`, la future API et le panneau doivent parler du même résultat. Un auxiliaire privé qui n'aide que `lineaReporte` n'a aucune raison d'être exporté. Le laisser sans `export` réduit la surface que d'autres fichiers peuvent utiliser par accident. Si une fonction privée change de nom ou disparaît, aucun module externe ne devrait en être cassé.

Dans le `revisor`, évite de créer une dépendance circulaire. Par exemple, `revisar.ts` peut importer des types depuis `modelo.ts`, et une fonction de texte dans `reporte.ts` peut importer `Estado` depuis `modelo.ts`. En revanche, `modelo.ts` ne doit pas importer `revisar.ts` pour lui demander d'interroger le réseau. Le modèle décrit les données ; le coordinateur utilise ce modèle. Si deux modules ont besoin de s'importer mutuellement, c'est normalement qu'une responsabilité est mélangée et il convient d'extraire le concept partagé dans un troisième module plus petit.

Un chemin d'import fait aussi partie du contrat. Ne renomme pas de fichiers à la main sans mettre à jour les imports et n'utilise pas de chemins absolus locaux qui ne fonctionnent que sur ta machine. Le projet doit pouvoir être cloné et exécuté depuis n'importe quel chemin. Les chemins relatifs avec `.js` rendent cette dépendance explicite et fonctionnent aussi bien dans le dossier de développement que dans le JavaScript émis.

### Organisation par responsabilité : le flux du revisor

Les noms de modules doivent suivre le flux réel du programme. Le `revisor` reçoit une configuration externe, valide des services, coordonne des requêtes, transforme des résultats et les présente. Cette séquence suggère des responsabilités naturelles :

| Module | Question à laquelle il répond | Ce qu'il ne doit pas faire |
|---|---|---|
| `modelo.ts` | Qu'est-ce qu'un service et quels résultats peut-il produire ? | Lire du JSON, appeler le réseau ou afficher |
| `configuracion.ts` | Les données externes forment-elles une liste valide de services ? | Décider comment un rapport est présenté |
| `revisar.ts` | Comment chaque service est-il interrogé et chaque dénouement conservé ? | Connaître les détails d'un écran |
| `reporte.ts` | Comment un état fiable est-il transformé en sortie lisible ? | Valider du JSON ou ouvrir des connexions |
| `main.ts` | Comment les pièces sont-elles reliées au lancement du processus ? | Contenir de longues règles métier |

Ce tableau n'est pas une loi universelle. Un petit projet peut avoir `modelo.ts` et `reporte.ts` ensemble tant que la relation est claire. Un projet plus grand peut diviser la configuration de fichier, les variables d'environnement et les options HTTP en modules spécifiques. Le critère n'est pas le nombre de fichiers ; c'est qu'un changement ait un foyer évident. Si tu changes le texte que verra une personne, tu cherches `reporte.ts`. Si la règle d'un `timeoutMs` valide change, tu cherches le validateur de configuration.

La leçon 6 a déjà séparé la validation de l'entrée inconnue. Conserve cette séparation maintenant que les modules apparaissent. `configuracion.ts` peut exporter `leerServicios(valor: unknown): Resultado<readonly Servicio[]>`. Le fichier `main.ts` peut lire un fichier avec `node:fs/promises`, convertir le texte JSON en `unknown`, appeler le validateur et ne remettre les services à `revisarTodos` qu'ensuite. Ainsi, la partie qui touche au disque est petite et la règle de validation reste une fonction qui reçoit des valeurs et renvoie un résultat vérifiable.

La leçon 5 a séparé de manière semblable la coordination d'une requête concrète. Le type `Consultar` reçoit un `Servicio` et un `AbortSignal`, et renvoie une promesse avec une réponse. Dans un test, tu peux fournir une fonction de requête contrôlée. Dans le programme réel, `main.ts` pourra construire une implémentation avec `fetch`. L'injection de dépendances consiste à remettre à une fonction la collaboration dont elle a besoin, au lieu qu'elle la crée ou la cache à l'intérieur ; ici, elle évite qu'un test de « un code 503 devient un échec » dépende d'un serveur externe.

Une mauvaise organisation commence souvent par des noms commodes. `utils.ts` paraît pratique parce qu'il permet de ranger une fonction sans décider où elle appartient. Ensuite, il reçoit des validateurs, des convertisseurs, des formateurs, des constantes et des morceaux de réseau. Le résultat est un module très importé qui n'a pas de responsabilité propre et qui rend difficile de savoir quels changements peuvent l'affecter. Si une fonction formate un état, elle appartient au rapport. Si elle normalise une valeur de configuration, elle appartient à la configuration. Si elle ne rentre dans aucune responsabilité existante, peut-être le domaine a-t-il besoin d'un nouveau nom.

Évite aussi de transformer `main.ts` en nouveau fichier gigantesque. Il doit être une composition du programme : obtenir la configuration, valider, demander une vérification et afficher ou démarrer le serveur. Si `main.ts` contient cinquante lignes de règles pour interpréter des réponses, extrais cette décision vers le module qui lui correspond. La clarté de `main.ts` sert de carte de haut niveau : celui qui le lit devrait pouvoir comprendre le parcours du programme sans avoir à mémoriser chaque détail.

### Tests pilotés par table de cas : une règle, de nombreuses entrées

Une table de cas est une collection d'entrées, de sorties attendues et de noms de scénario qui partage un même corps de test. Elle est particulièrement utile quand une fonction a beaucoup de petites alternatives. Au lieu de copier quatre fois la préparation, l'appel et la comparaison, tu écris une fois la mécanique et tu ajoutes des lignes qui décrivent de nouveaux comportements.

Le nom de chaque cas compte. `"caso 1"` n'aide pas quand un échec apparaît des semaines plus tard. `"disponible conserva código y duración"` communique la règle que l'on protège. `"falla conserva detalle"` en communique une autre. Si la deuxième ligne se casse, tu sais s'il faut revoir le modèle, la fonction de présentation ou l'attente. Une table ne remplace pas la réflexion ; elle rend chaque attente visible et extensible.

Node inclut `node:assert/strict`, une bibliothèque standard d'assertions. `assert.equal(real, esperado)` termine le programme avec une erreur si les valeurs sont différentes. Dans cette figure, nous utilisons une table simple et une sortie stable pour que tu puisses la voir comme un programme ordinaire. Dans un projet, le même patron peut vivre dans `node:test`, Vitest ou un autre exécuteur de tests ; la table reste la partie qui définit le comportement attendu.

Comme le fichier importe un module avec le préfixe `node:`, la commande inclut `--types node`. Depuis TypeScript 6, le compilateur ne charge plus automatiquement les déclarations de Node en compilant des fichiers isolés. Cette option informe seulement TypeScript des types installés ; Node continue de fournir `node:assert/strict` pendant l'exécution.

```json fig07_02/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module"
}
```

```json fig07_02/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

```ts
// fig07_02/src/reporte.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_02/src/main.ts
import assert from "node:assert/strict";
import { lineaReporte, type Estado } from "./reporte.js";

const servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

const casos: readonly {
  readonly nombre: string;
  readonly entrada: Estado;
  readonly esperada: string;
}[] = [
  {
    nombre: "disponible conserva código y duración",
    entrada: {
      servicio,
      tipo: "disponible",
      codigoHttp: 204,
      duracionMs: 18,
    },
    esperada: "catálogo: HTTP 204 en 18 ms",
  },
  {
    nombre: "falla conserva detalle",
    entrada: {
      servicio,
      tipo: "falla",
      detalle: "conexión rechazada",
    },
    esperada: "catálogo: falla (conexión rechazada)",
  },
];

for (const caso of casos) {
  assert.equal(lineaReporte(caso.entrada), caso.esperada);
  console.log(`ok - ${caso.nombre}`);
}
```

```bash
$ cd fig07_02
$ npx tsc -p tsconfig.json
$ node dist/main.js
ok - disponible conserva código y duración
ok - falla conserva detalle
```

Un test utile ne couvre pas seulement le chemin heureux. Le premier cas vérifie un état disponible, mais utilise 204 au lieu de simplement 200 pour confirmer que la fonction conserve le code qu'elle a reçu. Le deuxième teste l'autre alternative de l'union discriminée. Si quelqu'un modifie `lineaReporte` et oublie de traiter les échecs, le deuxième cas passera au rouge. C'est un meilleur signal qu'un pourcentage de couverture : il explique quel comportement n'est plus respecté.

Les valeurs limites doivent aussi trouver leur place dans tes tables. Si une fonction classe comme réussis les codes HTTP de 200 à 299, il ne suffit pas de tester 200 et 500. Ajoute 199, 200, 299 et 300. Les erreurs de comparaison vivent souvent exactement là : `<= 300` au lieu de `< 300`, ou `> 200` au lieu de `>= 200`. Une table permet d'ajouter ces cas comme des données, sans dupliquer toute la structure d'un test.

Ne teste pas uniquement pour la couverture. Une fonction peut être exécutée dans un test et rester sans assertion pertinente. Par exemple, un test qui vérifie seulement que `lineaReporte` renvoie une chaîne exerce les deux branches, mais ne détecte pas que la sortie dise `"todo bien"` pour n'importe quel état. La comparaison doit affirmer le détail qui compte : nom, code, durée ou message d'échec.

Dans le `revisor`, les tests les plus rapides doivent se concentrer sur des fonctions déterministes comme `leerServicio`, `leerServicios`, `lineaReporte`, les classificateurs de codes et les conversions de données. Les tests qui utilisent `fetch`, des fichiers ou un serveur local sont utiles, mais répondent à une autre question : si plusieurs pièces s'intègrent correctement. Commence par les règles pures ; ajoute ensuite des tests d'intégration délibérés là où une frontière le justifie.

### Qualité automatique : compilation, lint et formatage

Une routine minimale de qualité doit être facile à retenir et possible à exécuter avant de livrer un changement. Dans un projet Node, `package.json` peut réunir les commandes pour que personne n'ait à mémoriser de longues options. Un exemple de scripts pour le `revisor` est le suivant :

```json
{
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  }
}
```

`compilar` émet le JavaScript dans `dist/` ; `verificar` fait la même vérification de types sans émettre ; et `arrancar` exécute l'entrée émise. Cette séparation est nécessaire : les tests de Node exécutent les fichiers JavaScript de `dist/`, c'est pourquoi `probar` compile d'abord puis cherche `dist/**/*.test.js`. Un répertoire fictif comme `dist/test` n'est pas un test : Node essaierait de le charger comme module et échouerait avant de découvrir des cas.

Le `tsconfig.json` doit contenir les décisions que le projet répète. Pour Node et ESM, une base raisonnable inclut `strict`, `module` et `moduleResolution` avec la valeur `nodenext`, ainsi que les déclarations explicites de Node. Tu n'as pas besoin de copier chaque option qui existe sur internet : ajoute une option quand tu comprends quel contrat elle impose.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

Le linter ne remplace pas le compilateur. TypeScript sait, par exemple, qu'une fonction exige un `Estado` ; ESLint peut signaler une variable que tu as déclarée sans l'utiliser, une promesse que tu as laissée sans l'attendre ou un motif que l'équipe a décidé d'éviter. Configure-le avec des règles que tu peux expliquer. Une énorme liste de règles copiées d'un autre projet produit généralement des avertissements que personne ne traite. Il vaut mieux commencer avec un petit ensemble, corriger les avertissements et ne le durcir que lorsque l'équipe comprend la raison.

Commence par installer les outils de développement. TypeScript 7 et `typescript-eslint` ne s'exécutent pas encore ensemble : `typescript-eslint` utilise l'API de TypeScript 6. Le projet conserve TypeScript 7 pour `npx tsc` sous `@typescript/native` et laisse TypeScript 6 comme alias `typescript` pour ESLint, dont l'exécutable supplémentaire reste disponible sous `npx tsc6`. Ne remplace pas l'un par l'autre : ce sont deux rôles distincts tant que la compatibilité n'est pas arrivée.

```bash
npm install --save-dev eslint@10.11.0 @eslint/js@10.0.1 typescript-eslint@8.71.0 prettier@3.9.9 @types/node@24 typescript@npm:@typescript/typescript6@^6.0.2 @typescript/native@npm:typescript@^7.0.2
```

npm écrit ces versions dans `package.json` précédées de `^` (par exemple `"^10.11.0"`). Pour ce cours, peu importe : `package-lock.json` fixe ce qui a été installé. Si tu préfères que `package.json` contienne des versions exactes, comme dans l'exemple de la solution 4, ajoute `--save-exact` à la commande ou retire les `^` à la main.

ESLint 10 utilise un fichier de configuration plat ; sans `eslint.config.js`, `eslint src` se termine par une erreur indiquant qu'il n'a pas trouvé `eslint.config.*`. Cette configuration minimale combine les règles recommandées de JavaScript et de TypeScript. Prettier reçoit une décision explicite sur les guillemets et la largeur de ligne.

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json
{
  "singleQuote": false,
  "printWidth": 100
}
```

Le formateur ne remplace pas non plus une revue de conception. Prettier ne sait pas si `revisarTodos` vit dans le bon module ni si ta table teste une limite importante. Sa valeur est de retirer les décisions mécaniques de la conversation. Si tout le projet utilise la même indentation et la même disposition des lignes, une revue peut se concentrer sur les changements de comportement. Exécute `prettier --check src` dans les vérifications automatiques et utilise `npx prettier --write src` uniquement quand tu veux appliquer le format aux fichiers source.

N'ignore pas un linter parce que le programme « fonctionne ». Un avertissement de promesse non attendue peut signifier que le processus se termine avant d'enregistrer un résultat. Une variable inutilisée peut être le reste d'une validation qui n'a plus lieu. N'obéis pas non plus à chaque règle sans réfléchir : si une règle ne représente pas une décision utile pour ce projet, ajuste-la ou supprime-la avec une raison visible. La qualité automatique doit réduire les erreurs et la friction, pas devenir du bruit.

En Go, `gofmt` fait naturellement partie du flux et `go vet` trouve des constructions qui compilent mais semblent incorrectes. En TypeScript, l'écosystème laisse plus de choix : `tsc`, ESLint, Prettier et l'exécuteur de tests sont des outils distincts. Cette flexibilité exige une décision explicite. Une fois les choix faits, les scripts du projet donnent une expérience semblable : un petit ensemble de commandes que n'importe qui peut exécuter et qu'une intégration continue peut répéter.

## L'erreur que tu vas voir

TS2305 apparaît quand tu importes un nom que le module n'exporte pas. Avec TypeScript 7.0.2, `tsc` affiche le diagnostic suivant. Le module existe et le chemin est correct, mais le fichier n'exporte que `revisarTodos` ; il n'exporte pas de fonction appelée `revisarUno`.

```ts
// fig07_03/revisor.ts
export function revisarTodos(): string {
  return "revisión terminada";
}
```

```ts
// fig07_03.ts
import { revisarUno } from "./fig07_03/revisor.js";

console.log(revisarUno());
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig07_03.ts
fig07_03.ts(2,10): error TS2305: Module '"./fig07_03/revisor.js"' has no exported member 'revisarUno'.
```

TS2305 ne signifie pas que tu doives ajouter `export` partout jusqu'à ce que l'erreur disparaisse. Décide d'abord de quelle partie du contrat tu as besoin. Si le programme doit coordonner une liste complète, importe `revisarTodos`. Si tu as vraiment besoin de vérifier un service individuel, crée et exporte `revisarUno` comme une fonction au contrat clair, et conserve `revisarTodos` comme le coordinateur qui l'appelle pour chaque service.

Une autre erreur fréquente en ESM se produit quand on omet `.js` dans un chemin relatif. TypeScript avec `module: "nodenext"` peut signaler TS2835 et suggérer une extension explicite. La correction n'est pas d'écrire `.ts` ; écris l'extension `.js` du fichier émis. Ce détail ne paraît étrange que tant que tu regardes le code source. Node résoudra le JavaScript généré, et l'import doit décrire justement ce fichier.

Quand Node affiche `ERR_MODULE_NOT_FOUND`, la compilation est déjà passée et le problème se situe dans la résolution pendant l'exécution. Vérifie le chemin relatif, les majuscules et minuscules du nom du fichier et l'extension `.js`. Ne règle pas cette erreur en passant à `require` ni en désactivant ESM : le diagnostic te montre une différence réelle entre le nom que tu as importé et le fichier que Node peut charger.

Un échec de test se lit autrement. Si `assert.equal` signale qu'il a obtenu une chaîne différente de celle attendue, ne change pas l'attente tout de suite pour retrouver le vert. Demande-toi d'abord si c'est l'exigence qui a changé ou si le code a changé par accident. Un test doit documenter un comportement convenu ; le modifier pour s'accommoder de n'importe quelle sortie élimine justement le signal qui t'avertissait du changement.

## Ce qui se fait de travers

- **Créer un module `utils`, `helpers` ou `common` pour tout ce qui n'a pas de place.** Ces noms n'expliquent aucune responsabilité et finissent par concentrer des dépendances sans rapport. Nomme le concept propriétaire de la fonction, comme `configuracion`, `reporte` ou `revisar` ; si tu n'y arrives pas, il manque peut-être de clarifier la conception avant de déplacer du code.

- **Importer des chemins relatifs sans `.js` en ESM.** Il peut sembler que le fichier source devrait être importé avec `.ts` ou sans extension, mais Node exécute le JavaScript émis. Utilise le chemin que Node résoudra, par exemple `./modelo.js`, et laisse TypeScript relier ce chemin au fichier source.

- **Tout exporter « au cas où ».** Chaque export devient une dépendance potentielle d'autres modules. Plus un fichier a de surface publique, plus il est difficile de changer son intérieur. Exporte les types et fonctions dont d'autres modules ont réellement besoin ; garde privés les auxiliaires d'implémentation.

- **Écrire des tests qui dépendent du réseau, de l'horloge et des fichiers pour vérifier une règle de texte.** Ces tests sont plus lents, moins déterministes et plus difficiles à diagnostiquer. Sépare d'abord la règle pure, teste-la avec des données construites en mémoire et laisse les frontières à des tests d'intégration spécifiques.

- **Ne tester qu'un seul cas heureux.** Une fonction qui gère une union discriminée a besoin d'au moins un cas par alternative importante. Les comparaisons de plages ont besoin de valeurs limites. Un cas isolé peut passer alors que le programme échoue pour les entrées qui distinguent réellement une règle.

- **Poursuivre 100 % de couverture comme seul objectif.** La couverture signifie qu'une ligne a été exécutée, pas qu'une attente importante a été vérifiée. Utilise-la pour découvrir des chemins auxquels tu n'as pas pensé, mais vérifie que chaque test peut échouer quand change le comportement qu'il prétend protéger.

- **Utiliser le linter et le formateur comme substituts d'une revue.** Les outils automatiques trouvent des classes limitées de problèmes. Ils ne peuvent pas décider si `timeoutMs` a une politique correcte, si un message d'erreur aide à exploiter le système ou si le module choisi représente bien la responsabilité.

- **Appliquer le format à la main avant chaque revue.** Si le projet a un formateur, laisse-le faire le travail mécanique. Les différences de style mêlées à un changement de comportement rendent difficile de voir ce qui a vraiment changé.

## Exercices

### Exercice 1 — Extraire le modèle du revisor

Crée un module `modelo.ts` qui exporte `Servicio`, `EstadoDisponible`, `EstadoFalla` et `Estado` avec les mêmes contrats que dans les leçons 3 et 5. Crée un fichier principal qui importe `type Estado` depuis `./modelo.js`, construit un état disponible et un état d'échec, et les affiche au moyen d'une fonction exportée par le module.

### Exercice 2 — Une table pour classer les codes

Écris `clasificarCodigo(codigoHttp: number): "disponible" | "falla"` dans un module. Crée un test avec une table de cas pour 199, 200, 299, 300 et 503. Chaque ligne doit avoir un nom qui décrit la limite ou la règle qu'elle vérifie. Utilise `node:assert/strict` et documente la commande de compilation avec `--types node`.

### Exercice 3 — Séparer la configuration de démarrage

Pars de `leerServicios` de la leçon 6. Place-le dans `configuracion.ts`, conserve l'entrée comme `unknown` et exporte seulement la fonction de lecture et les types dont un autre module a besoin. Crée un petit `main.ts` qui reçoit une valeur déjà analysée, appelle la fonction et ne remet la liste à la vérification que si le résultat a `ok: true`.

### Exercice 4 — Une routine de qualité

Ajoute les scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` et `formato` avec les contrats de cette leçon. Inclus `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` et `"sourceMap": true` dans `tsconfig.json`. Installe ESLint, `typescript-eslint` et Prettier avec les alias de TypeScript 6 et 7 ; exécute chaque script, corrige au moins un détail de format et note à quelle question répond chaque commande.

## Solutions

### Solution 1

Le module est propriétaire des types et de la présentation parce que les deux décrivent le résultat du domaine. Le fichier consommateur importe le type avec `import type`, de sorte que Node n'a besoin de charger que la fonction qui existe à l'exécution.

```ts
// modelo.ts
export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

export type Estado =
  | {
      servicio: Servicio;
      tipo: "disponible";
      codigoHttp: number;
      duracionMs: number;
    }
  | {
      servicio: Servicio;
      tipo: "falla";
      detalle: string;
    };

export function resumen(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// main.ts
import { resumen, type Estado } from "./modelo.js";

const estado: Estado = {
  servicio: {
    nombre: "inventario",
    url: "https://inventario.example",
    timeoutMs: 2000,
  },
  tipo: "disponible",
  codigoHttp: 200,
  duracionMs: 31,
};

console.log(resumen(estado));
```

Il n'est pas nécessaire d'exporter une constante d'exemple ni des fonctions auxiliaires dont seul `resumen` a besoin. Le module offre le contrat minimal dont un autre fichier a besoin.

### Solution 2

La table rend visibles les quatre limites pertinentes et un cas clairement hors de la plage. La fonction conserve une règle simple : disponible couvre de 200 jusqu'à avant 300.

```ts
import assert from "node:assert/strict";

function clasificarCodigo(codigoHttp: number): "disponible" | "falla" {
  return codigoHttp >= 200 && codigoHttp < 300 ? "disponible" : "falla";
}

const casos = [
  { nombre: "199 queda debajo del rango", codigoHttp: 199, esperado: "falla" },
  { nombre: "200 inicia el rango", codigoHttp: 200, esperado: "disponible" },
  { nombre: "299 termina el rango", codigoHttp: 299, esperado: "disponible" },
  { nombre: "300 queda fuera del rango", codigoHttp: 300, esperado: "falla" },
  { nombre: "503 es falla del servidor", codigoHttp: 503, esperado: "falla" },
] as const;

for (const caso of casos) {
  assert.equal(clasificarCodigo(caso.codigoHttp), caso.esperado);
}
```

Le `as const` conserve les littéraux de chaque attente. Il n'est pas indispensable pour ce test, mais il évite que la table s'élargisse en `string` si tu veux ensuite réutiliser ses valeurs dans une fonction avec une union de littéraux.

### Solution 3

La fonction qui lit la configuration ne doit pas importer `node:fs/promises` ni dépendre du chemin du fichier. Son rôle est de décider si une valeur inconnue forme une liste valide. La lecture physique du fichier relève d'une couche extérieure, qui peut vivre dans `main.ts` ou dans un petit module dédié à la frontière du disque.

```ts
// configuracion.ts
export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; detalle: string };

export interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

La solution réutilise la même garde `esRegistro` et les mêmes règles de la leçon 6 : texte non vide pour le nom et l'URL, et entier sûr positif pour `timeoutMs`. La validation conserve une entrée `unknown` et renvoie un contrat fiable avant de lancer la vérification ; `esRegistro` fait l'affinage avec des vérifications d'exécution, pas avec une assertion de type, si bien que le compilateur et le programme coïncident.

### Solution 4

Les scripts transforment une routine orale en interface du projet. Ce `revisor` complet conserve `src/main.ts` comme unique entrée, laisse le test à côté de la règle et répète dans un vrai projet les décisions expliquées plus haut. Le modèle ne change pas de forme entre ces fichiers : chaque `Estado` garde le `Servicio` complet et distingue disponibilité et échec avec `tipo`.

```json fig07_04/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24",
    "@typescript/native": "npm:typescript@^7.0.2",
    "eslint": "10.11.0",
    "prettier": "3.9.9",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```

```json fig07_04/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```js fig07_04/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

```json fig07_04/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```

```ts
// fig07_04/src/modelo.ts
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
// fig07_04/src/configuracion.ts
import type { Servicio } from "./modelo.js";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
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
```

```ts
// fig07_04/src/reporte.ts
import type { Estado } from "./modelo.js";

export function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

```ts
// fig07_04/src/revisar.ts
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

```ts
// fig07_04/src/main.ts
import { leerServicios } from "./configuracion.js";
import { lineaReporte } from "./reporte.js";
import { revisarTodos, type Consultar } from "./revisar.js";

const configuracion = leerServicios([
  { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
  { nombre: "pagos", url: "https://pagos.example", timeoutMs: 3000 },
]);

if (!configuracion.ok) {
  throw new Error(configuracion.detalle);
}

const consultar: Consultar = async (servicio) => {
  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return { codigoHttp: 204, duracionMs: 12 };
};

const estados = await revisarTodos(configuracion.valor, consultar);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```ts
// fig07_04/src/reporte.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { lineaReporte } from "./reporte.js";

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
```

```bash
$ cd fig07_04
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

✔ disponible conserva código y duración (0.341167ms)
✔ falla conserva detalle (0.057417ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 148.684583
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 204 en 12 ms
pagos: falla (conexión rechazada)
```

`npm run verificar` ne répond qu'aux types sans créer de fichiers ; `npm run probar` recompile et exécute les tests découverts dans `dist/` ; `npm run lint` charge la configuration plate d'ESLint ; et `npm run formato` confirme que les fichiers de `src` respectent déjà Prettier. `npm run arrancar` est la petite vérification de la composition complète. Si tu dois appliquer le format, exécute `npx prettier --write src`, examine le changement et relance `npm run formato`.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2` dans le projet.
- [ ] `npm run verificar` se termine sans diagnostic et ne crée ni ne met à jour de fichiers dans `dist/`.
- [ ] `npm run probar` compile, découvre `dist/reporte.test.js` et rapporte deux tests réussis.
- [ ] `npm run lint` et `npm run formato` se terminent correctement après avoir installé et configuré leurs outils.
- [ ] `npm run arrancar` affiche un état disponible et un état d'échec avec le projet compilé.
- [ ] En compilant l'import d'un nom non exporté, TS2305 apparaît sur le nom importé.
- [ ] Mon projet utilise des imports relatifs avec l'extension `.js` et a `"type": "module"` dans son `package.json`.
- [ ] Mon `tsconfig.json` de Node inclut `"types": ["node"]`, `"rootDir": "./src"`, `"outDir": "./dist"` et `"sourceMap": true`.

## Pour aller plus loin

- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) — documentation officielle sur `export`, `import`, les modules et l'organisation du code ; consulté le 2 octobre 2026.

- [Node.js: exécuter TypeScript](https://nodejs.org/api/typescript.html) — documentation officielle sur le type stripping, la syntaxe effaçable et les limites de l'exécution directe de fichiers `.ts` ; consulté le 2 octobre 2026.

- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html) — documentation officielle sur ESM dans Node et les extensions dans les imports relatifs ; consulté le 2 octobre 2026.

- [Node.js: `node:assert/strict`](https://nodejs.org/api/assert.html) — documentation officielle des assertions strictes utilisées pour vérifier les tables de cas ; consulté le 2 octobre 2026.
