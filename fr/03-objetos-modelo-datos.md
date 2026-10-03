# Leçon 3 — Objets et modèle de données

**Durée :** 2 × 45 min

**Ce que tu construis :** le modèle `Servicio` / `Estado`

**Ce que tu apprends :** `type` vs `interface`, typage structurel, `readonly`, unions discriminées pour les états

## À la fin, tu seras capable de

- Définir un objet `Servicio` avec des propriétés obligatoires et expliquer quel contrat représente chacune.
- Choisir entre `type` et `interface` pour modéliser une forme de données ou une union.
- Expliquer pourquoi TypeScript accepte les objets d'après leur forme et non d'après une étiquette nominale.
- Protéger avec `readonly` les propriétés qui ne doivent pas être réaffectées, et reconnaître sa limite à l'exécution.
- Représenter des résultats réussis et échoués au moyen d'une union discriminée.
- Corriger les diagnostics TS2540, TS2339 et TS2741 sans désactiver `strict`.

## Le pourquoi avant le comment

Jusqu'ici, le `revisor` n'a manipulé que des valeurs simples : un nom, une URL, une chaîne qui décrit un état. Cela suffit pour expliquer une fonction ou vérifier que l'environnement compile, mais laisse sans réponse une question importante : comment éviter que les données qui appartiennent au même service finissent séparées, mélangées ou utilisées sous des noms différents ?

En JavaScript, tu peux stocker les informations d'un service dans plusieurs variables isolées :

```ts
const nombre = "catálogo";
const url = "https://catalogo.example";
const timeoutMs = 1500;
```

Il n'y a rien d'incorrect dans ces trois lignes. Le problème apparaît quand il y a plusieurs services. Tu aurais `nombreCatalogo`, `urlCatalogo`, `timeoutCatalogo`, puis `nombrePagos`, `urlPagos`, `timeoutPagos`, et ensuite tu devrais te rappeler quelles valeurs vont ensemble. JavaScript ne distingue pas de lui-même le nom d'un service de l'URL d'un autre. Une fonction peut recevoir trois arguments dans le mauvais ordre et, s'ils sont tous des chaînes ou des nombres compatibles, l'erreur peut passer inaperçue.

L'objet résout la première partie du problème : il regroupe les données qui décrivent une même chose. Au lieu de transporter trois valeurs déconnectées, tu transportes un `Servicio`. Le nom des propriétés rend visible ce que représente chaque valeur, et le compilateur peut vérifier que l'objet contient toutes les données dont le programme a besoin.

Mais un objet seul n'exprime pas encore toutes les règles du domaine. Le `revisor` ne connaît pas seulement des services configurés : il produit aussi des résultats. Un résultat disponible a un code HTTP et une durée ; un résultat échoué n'a peut-être pas de code HTTP, mais il a un détail de l'échec. Si tu modélises les deux résultats comme un seul objet rempli de propriétés optionnelles, la logique finit pleine de questions ambiguës : « le code manque-t-il parce que le réseau a échoué ou parce que personne ne l'a affecté ? », « puis-je afficher `detalle` alors que l'état est disponible ? », « que signifie le fait que les deux champs existent en même temps ? ».

La leçon consiste à transformer ces questions en contrats visibles. `interface` et `type` permettent de nommer des formes d'objet. Le typage structurel permet à une fonction d'accepter une valeur parce qu'elle possède les propriétés dont elle a besoin, et non parce qu'elle provient d'une classe ou a déclaré appartenir à une hiérarchie. `readonly` indique qu'une partie d'une configuration ne doit pas changer après sa création. Les unions discriminées permettent de décrire des états mutuellement exclusifs et obligent à traiter chaque chemin avant d'accéder à des données spécifiques.

En Go, un `struct` regroupe des champs sous un type nommé. TypeScript utilise lui aussi des objets pour regrouper des données, mais il s'appuie sur une différence importante : ses types sont vérifiés avant l'exécution et effacés à l'émission du JavaScript. `interface Servicio` ne crée pas de classe, ne construit pas d'objets et n'existe pas pour Node quand le programme tourne. C'est une description statique de la forme que les objets doivent avoir dans le code TypeScript.

Cette différence a deux conséquences. La première est positive : tu peux appliquer un contrat à des objets JavaScript ordinaires sans les réécrire en classes ni les faire hériter d'une base commune. La seconde demande de la prudence : écrire un type ne suffit pas pour valider du JSON, une variable d'environnement ou une réponse HTTP. La validation de ces frontières viendra dans la leçon 6. Ici, tu modéliseras les valeurs qui sont déjà fiables à l'intérieur du programme.

L'objectif n'est pas de remplir le projet de longs types. C'est de rendre explicites les décisions qui changent le comportement du `revisor` : ce dont un service a besoin pour pouvoir être vérifié, quelles données ne doivent pas être altérées pendant une vérification et quelle information existe dans chaque résultat possible. Quand ces décisions sont inscrites dans le type, le compilateur peut détecter les combinaisons impossibles avant que le panneau ou l'API essaient de les utiliser.

## Les concepts

### Objets : une chose dont les données vont ensemble

Un objet JavaScript réunit des paires propriété-valeur. Les accolades créent l'objet ; chaque propriété a un nom et une valeur. Tu peux lire une propriété avec un point, comme `servicio.nombre`, ou avec des crochets, comme `servicio["nombre"]`. TypeScript part de ce même mécanisme de JavaScript et ajoute la possibilité de décrire quelles propriétés le programme attend.

La différence entre « un objet qui a aujourd'hui ces propriétés » et « un objet que le programme reconnaît comme `Servicio` » est importante. Le premier peut grandir, changer ou arriver incomplet. Le second est un contrat : il doit avoir les propriétés déclarées, et chacune doit contenir une valeur du type indiqué. Le compilateur ne vérifie aucun réseau et n'interroge aucune URL ; en revanche, il vérifie qu'un objet littéral écrit dans le programme respecte la forme promise.

```ts
// fig03_01.ts
type Servicio = {
  nombre: string;
  url: string;
  timeoutMs: number;
};

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre} -> ${servicio.url}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(etiqueta(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_01.ts
$ node fig03_01.js
catálogo -> https://catalogo.example
```

La fonction ne reçoit pas trois paramètres dont tu dois te rappeler la relation. Elle reçoit un seul `Servicio`, et le type documente que cette unité a `nombre`, `url` et `timeoutMs`. Il est aussi plus facile d'étendre le contrat de façon consciente. Si, plus tard, le programme a besoin d'une politique de nouvelles tentatives, tu peux ajouter `reintentos` au type et laisser TypeScript signaler les endroits qui doivent désormais décider de sa valeur.

Dans le `revisor`, l'objet de configuration doit décrire le service, pas le résultat de son interrogation. Un `Servicio` est stable pendant toute la durée d'une exécution : il identifie ce que l'on veut vérifier et avec quelle limite. Le résultat sera représenté par un autre type appelé `Estado`. Séparer les deux idées évite un objet confus où une URL configurée, un code HTTP observé et un message d'échec se mélangent comme s'ils étaient le même genre de donnée.

```ts
// fig03_02.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function prepararConsulta(servicio: Servicio): string {
  return `${servicio.nombre}: límite de ${servicio.timeoutMs} ms`;
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

for (const servicio of servicios) {
  console.log(prepararConsulta(servicio));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_02.ts
$ node fig03_02.js
catálogo: límite de 1500 ms
pagos: límite de 3000 ms
```

Ne transforme pas chaque donnée liée en classe par habitude. Pour la plupart des valeurs du `revisor`, un objet avec un type bien choisi suffit. Les classes ajoutent un comportement d'exécution, des constructeurs, des prototypes et, parfois, de l'héritage. Rien de tout cela n'est nécessaire pour exprimer qu'un service a un nom, une URL et une limite. Un objet ordinaire avec un contrat clair est souvent plus direct et plus facile à convertir en JSON.

N'utilise pas non plus les objets comme des sacs sans forme, avec des propriétés inventées au fil de l'eau. Une annotation comme `Record<string, unknown>` convient quand tu ne connais vraiment pas les clés, mais un service a bien un vocabulaire connu. Si tu acceptes n'importe quelle clé pour quelque chose qui a trois propriétés concrètes, tu perds l'aide que le type pouvait t'apporter.

### `type` et `interface` : deux outils proches, pas deux camps

Un alias créé avec `type` donne un nom à n'importe quel type. Il peut nommer un objet, une union, un littéral, un tableau ou une combinaison d'autres types. Une interface décrit surtout la forme d'un objet : propriétés, méthodes et relations qu'elle peut étendre. Pour une forme de données simple, les deux se ressemblent presque.

```ts
// fig03_03.ts
interface Punto {
  x: number;
  y: number;
}

type Etiqueta = string;

function describir(punto: Punto, etiqueta: Etiqueta): string {
  return `${etiqueta}: ${punto.x},${punto.y}`;
}

console.log(describir({ x: 4, y: 7 }, "origen de prueba"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_03.ts
$ node fig03_03.js
origen de prueba: 4,7
```

Le choix pratique pour ce cours est simple. Utilise `interface` pour les entités en forme d'objet qui représentent des contrats extensibles du programme, comme `Servicio`. Utilise `type` pour les unions, les compositions et les noms de types qui ne sont pas nécessairement des objets, comme `Estado`, `"disponible" | "falla"` ou `string | undefined`. Ce n'est pas une loi du compilateur : les deux peuvent décrire beaucoup d'objets. C'est une convention pour que celui qui lit le code voie tout de suite s'il a devant lui une entité ou une combinaison de possibilités.

Il y a des différences qu'il convient de connaître sans en faire une querelle de religion. Une interface peut en étendre une autre avec `extends` et peut être déclarée plus d'une fois ; TypeScript fusionne les déclarations d'interface portant le même nom. Cette fusion, appelée *declaration merging*, est surtout utile pour compléter les déclarations d'une bibliothèque. Un alias `type` ne se rouvre pas de cette manière : si tu le déclares deux fois dans la même portée, c'est une erreur. En contrepartie, `type` peut représenter directement une union, ce qu'une interface ne peut pas faire.

Ne déclare pas deux fois une interface de domaine simplement parce que le compilateur permet de la fusionner. Si une partie du projet ajoute `timeoutMs` et une autre ajoute `equipo`, le contrat final se retrouve réparti entre plusieurs fichiers et il devient difficile de découvrir d'où vient chaque obligation. Pour le `revisor`, chaque entité du domaine aura une déclaration principale, située à côté des autres types partagés.

Évite aussi de déduire une différence inexistante : `interface` ne rend pas les objets plus rapides, ne génère aucune validation et ne crée aucune instance spéciale. Dans le JavaScript émis, les deux déclarations disparaissent. Le choix sert à communiquer une intention et à aider le compilateur, pas à modifier le comportement de Node.

Dans le `revisor`, `Servicio` utilise une interface parce qu'il exprime la forme stable d'une configuration. `Estado`, en revanche, sera un alias d'union parce que sa fonction est de déclarer des alternatives exclusives. Lire `type Estado = EstadoDisponible | EstadoFalla` communique une idée qu'une interface unique ne peut pas exprimer seule : un résultat appartient toujours à une alternative concrète.

```ts
// fig03_04.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  timeoutMs: number;
}

type EstadoInicial = {
  servicio: Servicio;
  tipo: "pendiente";
};

function presentarInicio(estado: EstadoInicial): string {
  return `${estado.servicio.nombre}: pendiente`;
}

const estado: EstadoInicial = {
  servicio: {
    nombre: "catálogo",
    url: "https://catalogo.example",
    timeoutMs: 1500,
  },
  tipo: "pendiente",
};

console.log(presentarInicio(estado));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_04.ts
$ node fig03_04.js
catálogo: pendiente
```

Le type `EstadoInicial` n'a encore qu'une seule alternative parce que le revisor n'a encore rien interrogé. Plus bas, tu élargiras le modèle pour décrire des résultats disponibles et échoués. L'important est que les noms ne soient pas recyclés pour des idées différentes : `Servicio` décrit l'entrée de la requête ; `Estado` décrit ce que la requête a observé.

Dans `fig03_04`, `timeoutMs` est encore modifiable pour montrer une configuration pendant sa normalisation ; à partir de `fig03_07`, le modèle change et les trois propriétés de `Servicio` sont `readonly`, parce qu'il représente désormais la configuration définitive d'une requête.

### `readonly` : protéger une référence, pas figer le monde

Le modificateur `readonly` interdit de réaffecter une propriété depuis un endroit où TypeScript connaît ce contrat. Il est utile pour les données d'identité et de configuration qui ne devraient pas changer pendant l'opération. Dans le `revisor`, changer `nombre` ou `url` en pleine vérification rendrait le rapport difficile à interpréter : tu pourrais lancer la requête pour catalogo et finir par afficher que tu as vérifié pagos.

```ts
// fig03_05.ts
interface Registro {
  readonly id: string;
  cliente: {
    nombre: string;
  };
}

const registro: Registro = {
  id: "catalogo",
  cliente: { nombre: "catálogo" },
};

registro.cliente.nombre = "catálogo público";

console.log(`${registro.id}: ${registro.cliente.nombre}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_05.ts
$ node fig03_05.js
catalogo: catálogo público
```

L'exemple montre une nuance essentielle : `readonly` est superficiel. Il empêche de réaffecter `registro.id` et il empêcherait aussi de remplacer entièrement `registro.cliente` si cette propriété était `readonly`. Il n'empêche pas de modifier les propriétés internes de `cliente`, parce que `cliente.nombre` n'a pas été déclaré en lecture seule. Ne confonds pas « une propriété ne peut pas pointer vers un autre objet » avec « l'objet vers lequel elle pointe est immuable ».

C'est comme avoir une étiquette fixe sur un classeur. Tu ne peux pas remplacer le classeur associé à l'étiquette, mais tu peux modifier une feuille à l'intérieur si ses règles le permettent. Si tu as besoin qu'une structure entière soit immuable, tu devras exprimer `readonly` aux niveaux pertinents, utiliser un utilitaire comme `Readonly<T>` ou concevoir des opérations qui construisent de nouvelles valeurs. Cette décision dépend du domaine ; ce n'est pas une conséquence automatique du fait de placer un mot devant une propriété.

`readonly` n'existe pas non plus comme barrière d'exécution. TypeScript l'efface à la compilation. Si du JavaScript externe obtient une référence au même objet, ou si quelqu'un utilise une assertion pour contourner le contrat, Node ne bloquera pas le changement de lui-même. Pour empêcher les changements pendant l'exécution, il existe `Object.freeze`, même s'il est lui aussi superficiel et a d'autres implications. À ce stade, `readonly` sert à exprimer une règle de conception et à obtenir des diagnostics avant l'exécution.

Avec TypeScript 7.0.2, le fichier suivant affiche cette erreur si tu essaies de modifier une propriété déclarée en lecture seule.

```ts
// fig03_06.ts
interface Registro {
  readonly id: string;
}

const registro: Registro = { id: "catalogo" };

registro.id = "pagos";
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_06.ts
fig03_06.ts(8,10): error TS2540: Cannot assign to 'id' because it is a read-only property.
```

Dans le `revisor`, marque comme `readonly` les propriétés qui identifient ce qui va être interrogé : `nombre` et `url`. Ne marque pas tout automatiquement. La limite `timeoutMs` pourrait être ajustable par une fonction qui normalise la configuration avant le début des requêtes ; après cette frontière, tu pourrais construire un `Servicio` définitif avec des valeurs immuables. La question utile est « qui peut changer cette donnée, et à quel moment ? », pas « combien de propriétés puis-je figer ? ».

```ts
// fig03_07.ts
interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

function destinoDe(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url} (${servicio.timeoutMs} ms)`;
}

const pagos: Servicio = {
  nombre: "pagos",
  url: "https://pagos.example",
  timeoutMs: 3000,
};

console.log(destinoDe(pagos));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_07.ts
$ node fig03_07.js
pagos: https://pagos.example (3000 ms)
```

La fonction `destinoDe` n'a besoin que de lire le service, elle peut donc accepter le contrat en lecture seule. Cela indique à l'appelant que la fonction ne doit pas changer la destination de la requête ni altérer ses limites. Si une fonction doit construire une version modifiée, il vaut mieux qu'elle renvoie un nouvel objet avec la modification explicite, plutôt que de muter silencieusement la configuration que d'autres parties du programme continuent d'utiliser.

### Typage structurel : ce qui compte, c'est la forme dont tu as besoin

TypeScript a un typage structurel. En pratique, si une valeur possède les propriétés requises avec des types compatibles, elle peut être utilisée là où cette forme est demandée. Elle n'a pas besoin de déclarer qu'elle « implémente » l'interface ni d'appartenir à une famille de classes. Cette idée ressemble aux interfaces de Go : une valeur est acceptable parce qu'elle satisfait ce dont la fonction a besoin, et non parce qu'elle porte une étiquette spéciale.

```ts
// fig03_08.ts
interface ConNombre {
  nombre: string;
}

function saludar(valor: ConNombre): string {
  return `revisando ${valor.nombre}`;
}

const servicioCompleto = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(saludar(servicioCompleto));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_08.ts
$ node fig03_08.js
revisando catálogo
```

`servicioCompleto` a des propriétés supplémentaires, mais cela n'empêche pas de le passer à `saludar`. La fonction a seulement promis de lire `nombre` ; exiger l'URL et le délai limite reviendrait à ajouter une dépendance dont elle n'a pas besoin. Cette capacité permet de concevoir de petites fonctions et de petits contrats.

Pour autant, le typage structurel ne signifie pas que tu doives rendre tous les contrats aussi minimaux que possible. Une fonction qui lance une requête HTTP a bien besoin de l'URL et de la limite ; son paramètre doit être `Servicio`, pas seulement `ConNombre`. Le principe est de demander exactement ce que tu utilises, ni plus ni moins. Demander moins peut cacher une dépendance réelle ; demander plus attache des fonctions simples à des détails qui ne les concernent pas.

Il existe une protection supplémentaire pour les objets littéraux écrits directement dans un appel ou une affectation. Si tu écris `saludar({ nombre: "catálogo", nombreVisible: "Catálogo" })`, TypeScript peut t'avertir que `nombreVisible` n'appartient pas à `ConNombre`. Cette vérification des propriétés excédentaires détecte les fautes de frappe fréquentes. Elle ne contredit pas l'exemple précédent : une valeur déjà stockée dans une variable peut avoir plus de propriétés et continuer à respecter une forme plus petite.

Dans le `revisor`, un résumé peut n'avoir besoin que du nom d'un service, alors que l'opération de requête a besoin de la configuration complète. Il n'est pas nécessaire de créer une hiérarchie de classes pour cette différence. Il suffit de décrire chaque contrat selon son consommateur.

```ts
// fig03_09.ts
interface ConNombre {
  nombre: string;
}

interface Servicio extends ConNombre {
  readonly url: string;
  readonly timeoutMs: number;
}

function encabezado(servicio: ConNombre): string {
  return `Servicio: ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
  timeoutMs: 1500,
};

console.log(encabezado(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_09.ts
$ node fig03_09.js
Servicio: catálogo
```

`Servicio extends ConNombre` réutilise une forme parce que tout service a un nom. Malgré cela, `encabezado` n'a pas besoin de connaître `Servicio` ; elle dépend de la forme plus petite qu'elle consomme. Cette séparation sera utile quand l'API et le panneau partageront des types : chaque fonction pourra importer le contrat dont elle a besoin sans recevoir un objet plus couplé que nécessaire.

Évite d'utiliser le typage structurel comme permission de mélanger des concepts différents simplement parce qu'ils ont par hasard la même forme. Deux objets avec `{ nombre: string }` sont compatibles même si l'un représente un service et l'autre une personne responsable. Si le domaine exige de les distinguer même quand ils partagent la même structure, il te faudra une conception plus spécifique. Pour ce cours, les noms des propriétés et des types de domaine clairs suffisent ; les techniques de marques nominales sont réservées aux cas où le risque justifie cette complexité.

### Unions discriminées : chaque état apporte ses propres données

Une union déclare qu'une valeur peut être l'une de plusieurs alternatives. Tu as déjà utilisé des unions de littéraux comme `"disponible" | "falla"`. Une union discriminée va un cran plus loin : chaque alternative est un objet qui partage une propriété littérale, appelée discriminant, mais contient des données propres. Le discriminant permet à TypeScript de réduire le type quand tu vérifies sa valeur.

Pour le `revisor`, le discriminant sera `tipo`. Dans ce premier exemple minimal, un état disponible apporte `codigoHttp` et un état échoué apporte `detalle`. Dans le modèle complet de la figure suivante, `duracionMs` est ajouté au cas disponible. Ce ne sont pas des données optionnelles d'un objet générique ; ce sont des données qui existent en raison du genre de résultat qui s'est produit.

```ts
// fig03_10.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function descripcion(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `HTTP ${estado.codigoHttp}`;
  }

  return `falla: ${estado.detalle}`;
}

console.log(descripcion({ tipo: "disponible", codigoHttp: 204 }));
console.log(descripcion({ tipo: "falla", detalle: "tiempo agotado" }));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_10.ts
$ node fig03_10.js
HTTP 204
falla: tiempo agotado
```

À l'intérieur du `if`, TypeScript sait que `estado` est `EstadoDisponible`, parce que seule cette alternative peut avoir `tipo: "disponible"`. Après le `if`, il sait qu'il reste `EstadoFalla`, parce que l'union avait exactement deux alternatives. Cette réduction s'appelle *narrowing* (affinage de type). Ce n'est pas une conversion de données : l'objet avait déjà une forme concrète ; la condition permet au compilateur de déterminer laquelle.

Cette conception évite les combinaisons dépourvues de sens. Avec un type faible comme celui-ci :

```ts
type EstadoDebil = {
  tipo: "disponible" | "falla";
  codigoHttp?: number;
  detalle?: string;
};
```

tu pourrais créer un état disponible sans code, un échec sans détail, ou un état disponible qui a en plus le détail d'un échec. Toutes ces combinaisons compileraient, parce que le type admet des propriétés optionnelles sans les relier à `tipo`. L'union discriminée intègre cette relation au contrat.

Dans le revisor, l'état complet conserve le service avec le résultat. Cela permet d'afficher un rapport sans reconstituer quel service a produit chaque donnée. Remarque que chaque variante répète `servicio` ; plus tard, tu pourras extraire cette partie commune si cela améliore la clarté, mais répéter quelques propriétés vaut mieux que cacher un modèle difficile à lire.

```json fig03_11/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  }
}
```

```json fig03_11/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```ts
// fig03_11/src/modelo.ts
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
// fig03_11/src/main.ts
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
  detalle: "tiempo agotado",
};

console.log(lineaReporte(catalogo));
console.log(lineaReporte(pagos));
```

```bash
$ cd fig03_11
$ npm run compilar
> compilar
> tsc
$ npm run arrancar
> arrancar
> node dist/main.js

catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

L'import utilise `type Estado` parce que seule compte l'information destinée au compilateur. TypeScript élimine cet import de type du JavaScript émis ; `lineaReporte`, en revanche, est une vraie fonction et elle est bien importée pour que Node puisse l'exécuter. L'extension `.js` dans le chemin relatif reste obligatoire parce que Node résoudra le fichier émis.

N'écris pas de conditions fondées sur la présence d'une propriété quand tu as déjà un discriminant clair. Demander `if ("codigoHttp" in estado)` peut fonctionner, mais cela décrit un détail accidentel de la représentation. Demander `if (estado.tipo === "disponible")` exprime la règle du domaine : tu traites le cas disponible. Le code est plus facile à lire, et TypeScript peut réduire le type directement.

Quand tu ajoutes une troisième alternative, par exemple `"cancelado"`, les fonctions qui traitent les états doivent décider quoi en faire. Une garde d'exhaustivité rend cette obligation vérifiable : dans le `default` d'un `switch`, tu affectes l'état restant à une variable `never`. `never` est le type qui représente une valeur impossible ; si toutes les alternatives ont déjà été traitées, TypeScript accepte cette affectation. Cette friction est un avantage. Un nouvel état ne devrait pas apparaître silencieusement dans le panneau comme s'il s'agissait d'un échec connu ; la garde permet au compilateur de signaler chaque fonction qui doit ajouter une branche.

Le programme suivant ajoute `EstadoCancelado` mais laisse le `switch` intact. Avec TypeScript 7.0.2, `tsc` affiche TS2322 parce que, dans le `default`, il reste encore un `EstadoCancelado`, qui ne peut pas être affecté à `never`.

```ts
// fig03_14.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type EstadoCancelado = {
  tipo: "cancelado";
  motivo: string;
};

type Estado = EstadoDisponible | EstadoFalla | EstadoCancelado;

function descripcion(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `HTTP ${estado.codigoHttp}`;
    case "falla":
      return `falla: ${estado.detalle}`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_14.ts
fig03_14.ts(26,13): error TS2322: Type 'EstadoCancelado' is not assignable to type 'never'.
```

## L'erreur que tu vas voir

TS2540 apparaît quand tu essaies de réaffecter une propriété `readonly`, comme cela s'est produit dans `fig03_06.ts`. Le compilateur ne dit pas que l'objet est inutilisable ; il signale une opération concrète qui contredit le contrat. La bonne correction dépend de l'intention : si l'identifiant ne doit vraiment pas changer, crée un nouvel objet avec la nouvelle valeur ; s'il devait pouvoir changer pendant une étape de normalisation, utilise un type modifiable uniquement dans cette étape et construis ensuite la valeur définitive.

Un autre diagnostic fréquent avec les unions discriminées est TS2339. Il se produit quand tu essaies de lire une propriété qui n'existe pas dans toutes les alternatives sans avoir vérifié d'abord le discriminant.

```ts
// fig03_12.ts
type EstadoDisponible = {
  tipo: "disponible";
  codigoHttp: number;
};

type EstadoFalla = {
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

function codigo(estado: Estado): number {
  return estado.codigoHttp;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_12.ts
fig03_12.ts(15,17): error TS2339: Property 'codigoHttp' does not exist on type 'Estado'.
  Property 'codigoHttp' does not exist on type 'EstadoFalla'.
```

TS2339 signifie que la propriété n'est pas garantie par le type actuel. `codigoHttp` existe pour `EstadoDisponible`, mais pas pour `EstadoFalla`. N'utilise pas une assertion comme `estado as EstadoDisponible` pour cacher le diagnostic : si le résultat est réellement un échec, cette promesse serait fausse. Vérifie d'abord `estado.tipo === "disponible"` ; ce n'est que dans cette branche que le code HTTP est disponible.

TS2741 apparaît quand tu construis un objet qui omet une propriété obligatoire. Il est particulièrement utile quand on change le modèle, parce qu'il signale toutes les constructions qui ne respectent plus le contrat.

```ts
// fig03_13.ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  url: "https://catalogo.example",
};
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig03_13.ts
fig03_13.ts(8,7): error TS2741: Property 'timeoutMs' is missing in type '{ nombre: string; url: string; }' but required in type 'Servicio'.
```

Ne corrige pas TS2741 en ajoutant des valeurs inventées comme `timeoutMs: 0` sans avoir décidé ce que signifie zéro. Ce peut être une valeur valide, cela peut signifier « sans délai limite », ou ce peut être une configuration dangereuse. Le diagnostic ne demande pas seulement une propriété ; il te demande de trancher une décision du domaine. Si le délai limite doit être obligatoire, fournis une valeur choisie en conscience. S'il peut vraiment manquer, modélise cette absence et traite-la avant de lancer une requête.

## Ce qui se fait de travers

- **Stocker un service dans des variables isolées.** Tant qu'il n'y a qu'un seul service, cela paraît plus court. Avec plusieurs, les valeurs se mélangent et les signatures de fonctions deviennent longues et fragiles. Un objet `Servicio` garde ensemble les données qui décrivent une même configuration.

- **Choisir `type` ou `interface` comme une règle absolue.** Les deux servent pour beaucoup d'objets. Utiliser `interface` pour les entités d'objet et `type` pour les unions est une convention utile ; discuter pour savoir lequel est universellement supérieur détourne de la question importante : quelle forme le programme doit-il admettre ?

- **Utiliser `readonly` comme s'il s'agissait d'une sécurité d'exécution.** Le modificateur n'existe que pendant la vérification des types et il est superficiel. Il ne valide pas les entrées externes, ne fige pas les objets imbriqués et n'empêche pas du JavaScript sans types de modifier une référence partagée.

- **Déclarer toutes les propriétés comme optionnelles dans un état unique.** Un type avec `codigoHttp?: number` et `detalle?: string` admet des combinaisons contradictoires. Une union discriminée exprime quelles propriétés existent dans chaque alternative et oblige à vérifier le cas avant de l'utiliser.

- **Vérifier des propriétés accidentelles plutôt que le discriminant.** `if ("detalle" in estado)` dépend de la manière dont l'objet est représenté aujourd'hui. `if (estado.tipo === "falla")` exprime la décision du domaine et rend la réduction de type plus claire.

- **Utiliser `as EstadoDisponible` pour supprimer TS2339.** Une assertion ne transforme pas un échec en résultat disponible. Si la valeur vient d'une union, le chemin sûr est de l'affiner avec le discriminant. Si elle vient de l'extérieur du programme, elle doit d'abord être validée.

- **Modéliser `Servicio` et `Estado` comme s'il s'agissait de la même entité.** Le service représente l'intention d'interroger une URL ; l'état représente ce qui s'est passé lors de la tentative. Les garder séparés évite qu'une réponse observée modifie accidentellement la configuration qui l'a engendrée.

## Exercices

### Exercice 1 — Un service complet

Définis une interface `Servicio` avec `nombre`, `url` et `timeoutMs`, tous obligatoires. Crée deux services, `catálogo` et `pagos`, et une fonction `etiqueta` qui reçoit un `Servicio` et affiche son nom et son URL. Compile avec `strict` ; ensuite, supprime `timeoutMs` de l'un des objets et explique le diagnostic qui apparaît.

### Exercice 2 — Une configuration qui ne change pas

Modifie `Servicio` pour que `nombre`, `url` et `timeoutMs` soient `readonly`. Essaie de réaffecter `url` après avoir créé un service et confirme TS2540. Puis écris une fonction `conTimeout(servicio, timeoutMs)` qui renvoie un nouvel objet `Servicio` avec la limite modifiée, sans muter l'original.

### Exercice 3 — Rapport de résultats

Définis `EstadoDisponible` avec `servicio`, `tipo: "disponible"`, `codigoHttp` et `duracionMs`. Définis `EstadoFalla` avec `servicio`, `tipo: "falla"` et `detalle`. Crée `type Estado` comme union des deux alternatives et une fonction `lineaReporte` qui produit une ligne différente pour chaque cas. Teste au moins un résultat de chaque sorte.

### Exercice 4 — Un nouvel état oblige à décider

Ajoute `EstadoCancelado` avec `tipo: "cancelado"` et `motivo`. Inclus-le dans `Estado`. Réécris `lineaReporte` sous la forme d'un `switch` avec un `default` qui affecte l'état à une variable `never`. D'abord, laisse de côté le cas `"cancelado"` et confirme TS2322 ; ensuite, ajoute sa branche pour qu'il l'affiche aussi. Identifie les fonctions qui possèdent cette garde d'exhaustivité et explique pourquoi c'est préférable à ce qu'une annulation apparaisse comme un échec générique.

## Solutions

### Solution 1

L'interface doit regrouper les trois données nécessaires pour lancer une requête. En supprimant `timeoutMs`, TypeScript produit TS2741 parce que la configuration ne respecte plus le contrat. Le diagnostic est correct : le programme doit encore décider combien de temps il peut attendre avant de considérer une requête comme échouée.

```ts
interface Servicio {
  nombre: string;
  url: string;
  timeoutMs: number;
}

function etiqueta(servicio: Servicio): string {
  return `${servicio.nombre}: ${servicio.url}`;
}
```

### Solution 2

`readonly` empêche d'affecter la propriété existante, mais créer une nouvelle valeur est valide. La fonction renvoie une copie avec la nouvelle limite ; l'opérateur de décomposition conserve les autres propriétés.

```ts
function conTimeout(servicio: Servicio, timeoutMs: number): Servicio {
  return {
    ...servicio,
    timeoutMs,
  };
}
```

L'objet original ne change pas. Cette propriété est précieuse quand le même `Servicio` est partagé entre le code qui assemble le rapport et le code qui exécute la requête.

### Solution 3

La solution doit interroger le discriminant avant d'accéder aux données particulières d'une alternative. Dans chaque branche, TypeScript réduit le type automatiquement.

```ts
function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}
```

Il n'est pas nécessaire de demander si `codigoHttp` existe : la comparaison avec `tipo` prouve déjà que la valeur est un `EstadoDisponible`.

### Solution 4

La nouvelle alternative doit être ajoutée explicitement à l'union et à la fonction qui la présente.

```ts
type EstadoCancelado = {
  servicio: Servicio;
  tipo: "cancelado";
  motivo: string;
};
```

Ensuite, `lineaReporte` a besoin d'une branche pour `"cancelado"` et d'une garde d'exhaustivité à la fin du `switch`.

```ts
function lineaReporte(estado: Estado): string {
  switch (estado.tipo) {
    case "disponible":
      return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp} en ${estado.duracionMs} ms`;
    case "falla":
      return `${estado.servicio.nombre}: falla (${estado.detalle})`;
    case "cancelado":
      return `${estado.servicio.nombre}: cancelado (${estado.motivo})`;
    default: {
      const sinAtender: never = estado;
      return sinAtender;
    }
  }
}
```

Avec les trois branches, `estado` est impossible dans `default`, donc l'affectation à `never` compile. Si tu ajoutes une autre alternative à `Estado` et oublies son `case`, TS2322 signalera cette fonction. Cela permet de distinguer une annulation intentionnelle d'une panne réseau et oblige à mettre à jour les fonctions qui ont choisi une garde d'exhaustivité ; une fonction sans cette garde ne peut pas promettre que le compilateur la signalera.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2`.
- [ ] `node --version` commence par `v24`.
- [ ] Après avoir créé la structure de `fig03_11`, `cd fig03_11 && npm run compilar && npm run arrancar` affiche exactement :

```text
catálogo: HTTP 200 en 42 ms
pagos: falla (tiempo agotado)
```

- [ ] En compilant `fig03_06.ts` avec `npx tsc --strict --target ES2022 --module nodenext fig03_06.ts`, tu obtiens TS2540 et tu n'essaies pas de l'exécuter comme s'il avait compilé.
- [ ] En compilant `fig03_12.ts` avec `npx tsc --strict --target ES2022 --module nodenext fig03_12.ts`, tu obtiens TS2339 et tu peux expliquer pourquoi `codigoHttp` ne peut être lu qu'après avoir vérifié `tipo`.
- [ ] En compilant `fig03_14.ts` avec `npx tsc --strict --target ES2022 --module nodenext fig03_14.ts`, tu obtiens TS2322 ; tu ajoutes le `case "cancelado"` et la garde `never` compile à nouveau sans `any` ni assertions.
- [ ] Tu peux expliquer que `readonly` protège contre la réaffectation pendant la vérification de TypeScript, mais ne fige pas à lui seul un objet dans Node.

## Pour aller plus loin

- [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — documentation officielle sur les objets, les interfaces, les propriétés `readonly` et la compatibilité structurelle ; consulté le 2 octobre 2026.

- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces) — documentation officielle sur les interfaces, les alias et leurs différences pratiques ; consulté le 2 octobre 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) — documentation officielle sur la réduction de types et les unions discriminées ; consulté le 2 octobre 2026.

- [MDN : Object.freeze()](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) — référence sur la différence entre une restriction statique et le gel d'objets pendant l'exécution ; consulté le 2 octobre 2026.
