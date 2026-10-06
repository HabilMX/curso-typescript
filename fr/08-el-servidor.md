# Leçon 8 — Le serveur

**Durée :** 2 × 45 min

**Ce que tu construis :** l'API HTTP du `revisor`

**Ce que tu apprends :** serveur HTTP, routes typées, JSON, configuration, journal, arrêt propre

## À la fin, tu seras capable de

- Créer un serveur HTTP Node qui écoute des connexions, répond à une requête et s'arrête sans laisser de ressources ouvertes.
- Modéliser les routes connues comme une union TypeScript et répondre explicitement aux chemins qui n'existent pas et aux méthodes que tu n'admets pas.
- Envoyer des réponses JSON avec le code d'état et l'en-tête `content-type` corrects, et publier un contrat qui ne laisse pas fuiter de données internes.
- Lire la variable d'environnement `PUERTO` comme un texte non fiable et la valider avant de la remettre au serveur.
- Enregistrer des événements opérationnels sans mélanger le journal avec les règles métier ni avec les réponses au client.
- Arrêter le serveur de façon ordonnée à la réception de `SIGTERM` ou `SIGINT`, en attendant les requêtes qui étaient déjà en cours.
- Assembler le `revisor` des leçons précédentes en un processus qui interroge de vraies cibles et répond à `GET /api/estados`.

## Le pourquoi avant le comment

Jusqu'à la leçon précédente, le `revisor` sait déjà faire un travail utile. Il a un modèle `Servicio`, représente chaque dénouement avec une union discriminée `Estado`, interroge plusieurs cibles à la fois avec `revisarTodos`, valide sa configuration avant de l'utiliser et est organisé en modules avec des tests. Mais tout cela vit dans un processus que tu lances et lis depuis le terminal. C'est utile pour développer, et cela a une limite importante : tout autre programme qui voudrait connaître le rapport devrait exécuter le `revisor` de son côté, interpréter du texte pensé pour des personnes ou importer des modules internes d'un projet qui n'est pas le sien.

Une API HTTP change cette frontière. Au lieu de demander à chaque consommateur de savoir lire des fichiers, lancer des requêtes et trier des résultats, le processus du `revisor` conserve cette responsabilité et offre une opération publique : « donne-moi l'état actuel ». Une **API** (interface de programmation d'applications) est précisément cela : un ensemble d'opérations qu'un programme offre à d'autres programmes, avec un contrat qui dit ce que l'on peut demander et ce que l'on reçoit en échange. Un panneau web, celui de la leçon 9, pourra demander cette information depuis un navigateur. Une alerte, une intégration de déploiement ou un outil de support pourraient le faire aussi. L'API ne remplace pas la logique que tu as déjà construite : elle la place derrière une porte avec un contrat visible.

HTTP est une conversation simple entre deux participants. Un client envoie une requête avec une méthode (`GET`, `POST`…), un chemin, des en-têtes et, parfois, un corps. Le serveur décide comment la traiter et renvoie une réponse avec un code d'état, des en-têtes et un corps. Dans le cas le plus petit, un client demande `GET /salud`, le serveur répond `200` et le corps `ok`. Dans le cas du `revisor`, un client demandera `GET /api/estados` et recevra du JSON avec le résultat de la vérification de tous les services à ce moment-là.

Le mot « serveur » peut paraître plus gros qu'il ne l'est. Tu n'as besoin ni d'un compte, ni d'un service externe, ni d'une bibliothèque supplémentaire pour commencer : Node inclut le module `node:http`, qui accepte des connexions TCP, les convertit en objets de requête et de réponse et exécute une fonction pour chaque requête. Un framework web peut économiser du code quand un projet a beaucoup de routes, de validateurs et de *middleware* (fonctions intermédiaires qui traitent une requête avant ou après le gestionnaire final), mais il convient de comprendre d'abord le contrat de base que ce framework administre. Si tu ne sais pas quand un en-tête s'écrit, ce qui se passe avec une route inconnue ou comment le processus s'arrête, changer de syntaxe n'élimine pas le problème ; cela ne fait que le cacher.

Il convient aussi de distinguer deux directions de communication. La leçon 5 a préparé le type `Consultar`, qui décrit comment le `revisor` interroge un service qui n'est pas le sien ; dans cette leçon, tu écriras la première implémentation réelle de ce type, avec `fetch`. Et le `revisor` sera aussi serveur HTTP pour ses propres consommateurs. Les deux rôles utilisent des codes HTTP, des URL et des corps de réponse, mais leurs responsabilités sont opposées. Comme client, le `revisor` traduit des réponses distantes et des échecs réseau en `Estado`. Comme serveur, il traduit ses `Estado` internes en une réponse stable que d'autres personnes et programmes peuvent consommer sans connaître ses entrailles.

Le type TypeScript aide particulièrement à cette couche parce qu'une API réunit plusieurs petites décisions qui, en JavaScript, restent souvent implicites. Quelles routes existent ? Quelle forme a la réponse de chacune ? Quelle configuration est valide pour démarrer ? Quels événements sont enregistrés ? Que se passe-t-il à la réception d'un signal d'arrêt ? Un type n'arrête pas une connexion et ne protège pas à lui seul le port d'un processus, mais il rend visibles les contrats que tu dois maintenir pendant que le programme grandit.

Le serveur ne doit pas non plus devenir une seconde application qui duplique tout. La validation des fichiers continue d'appartenir à `configuracion.ts`. L'interrogation concurrente continue d'appartenir à `revisar.ts`. La présentation pour les personnes continue d'appartenir à `reporte.ts`. Le serveur est une couche extérieure : il interprète une requête, appelle les fonctions du domaine et adapte le résultat à HTTP. Cette séparation permet à une même vérification d'alimenter l'API, la console et le panneau sans que chaque consommateur réinvente les règles de disponibilité.

Go offre une comparaison utile. Avec `net/http`, Go permet lui aussi d'enregistrer une fonction qui traite des requêtes et de démarrer un serveur depuis la bibliothèque standard. Node suit une idée semblable : un processus écoute, une fonction reçoit la requête et la réponse, et le programme décide des routes, des codes et de l'arrêt. La différence tient à la manière d'exprimer l'attente. En Go, il est courant qu'une fonction d'arrêt renvoie une `error` ; dans Node, beaucoup d'opérations réseau s'expriment avec des événements ou des *callbacks* (fonctions de rappel) que tu enveloppes dans une promesse pour pouvoir utiliser `await`, comme tu le feras dans cette leçon.

Avant d'écrire des routes, adopte une idée opérationnelle : un serveur n'est pas une fonction qui « se termine et c'est tout ». Il vit tant qu'il écoute des connexions, donc ses limites comptent plus que dans un programme court. Il doit avoir une configuration validée avant d'ouvrir le port, enregistrer les événements qui aident à le diagnostiquer et s'arrêter de façon délibérée quand le système a besoin de l'arrêter. Si l'on laisse ces décisions pour la fin, elles apparaissent sous forme de processus qui ne se terminent pas, de ports occupés ou de journaux qui n'expliquent pas pourquoi une requête a échoué.

Cette leçon conserve la structure que tu as fixée dans les leçons 1 et 7 : l'entrée unique est `src/main.ts`, que `tsc` compile en `dist/main.js` ; le `rootDir` est `./src` et le `outDir` est `./dist` ; et les scripts s'appellent `compilar`, `verificar`, `arrancar`, `probar`, `lint` et `formato`. Aucune nouvelle dépendance n'est installée : `node:http` et `fetch` viennent avec Node. Ce qui change, ce sont les fichiers de `src/` : on ajoute `contrato.ts`, `consulta.ts`, `archivo.ts`, `bitacora.ts` et `servidor.ts`, et on réécrit `main.ts` pour que, au lieu d'afficher un rapport d'exemple, il démarre un serveur.

## Les concepts

### Un serveur HTTP : écouter n'est pas répondre

`createServer` construit un objet serveur. Cet objet n'occupe encore aucun port et ne reçoit aucun trafic. Pour commencer à écouter, tu dois appeler `listen`. Chaque fois qu'une requête arrivera, Node invoquera la fonction que tu as remise à `createServer` avec deux objets : `IncomingMessage`, qui représente la requête, et `ServerResponse`, qui représente la réponse que tu vas construire.

Cette séparation importe parce que créer, écouter et répondre sont des phases distinctes. Tu peux construire le serveur sans le démarrer pour tester son gestionnaire. Tu peux choisir un port dans la configuration avant de l'ouvrir. Et tu peux arrêter le serveur après l'avoir utilisé. Si tu rassembles tout dans un long appel sans noms, il est plus difficile de voir quelle opération a échoué : si la configuration n'a pas pu être lue, si le port était occupé ou si la route a mal répondu.

Une réponse HTTP minimale a deux parties pertinentes. Le code d'état communique le résultat général : `200` indique le succès, `404` indique que la ressource demandée n'existe pas et `500` représente une défaillance du serveur. Le corps contient le détail que le client peut lire. Les en-têtes indiquent comment interpréter ce corps ; pour du texte, `text/plain; charset=utf-8` déclare à la fois le type de contenu et l'encodage des caractères.

Le programme suivant crée une route de santé. Il utilise le port `0`, qui demande au système d'exploitation d'en choisir un disponible. Cela évite de dépendre du fait que le port 3000, 8080 ou un autre port fixe soit libre sur ta machine. Le programme obtient le port choisi uniquement pour que son propre `fetch` puisse faire une requête ; il ne l'affiche pas, parce que ce choix varie d'une exécution à l'autre. Comme il utilise `await` au niveau supérieur, exécute-le dans le dossier `figuras/` que tu as préparé dans la leçon 1, dont le `package.json` déclare `"type": "module"`.

```ts
// fig08_01.ts
import { createServer } from "node:http";

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
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

const servidor = createServer((solicitud, respuesta) => {
  if (solicitud.url === "/salud") {
    respuesta.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    });
    respuesta.end("ok");
    return;
  }

  respuesta.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
  });
  respuesta.end("no encontrado");
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const respuesta = await fetch(`http://127.0.0.1:${puerto}/salud`);

console.log(`${respuesta.status} ${await respuesta.text()}`);

await cerrar(servidor);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_01.ts
$ node fig08_01.js
200 ok
```

Le préfixe `node:` identifie les modules propres à Node et évite de les confondre avec un paquet installé par le projet. Comme le programme importe un module de Node, la commande inclut `--types node` : TypeScript a besoin de ces déclarations pour connaître `createServer` et les propriétés des requêtes, et Node apporte le comportement réel à l'exécution du JavaScript.

`respuesta.end(...)` est décisif. Il écrit le corps final et signale que la réponse est terminée. Si tu oublies de la terminer, le client peut rester à attendre alors que le serveur a déjà calculé son contenu. C'est aussi une bonne pratique d'utiliser `return` après une réponse qui ferme une branche : ce n'est pas nécessaire pour que HTTP fonctionne, mais cela évite que le code suivant essaie d'écrire une seconde réponse sur la même connexion.

Observe aussi comment le port est obtenu. `servidor.address()` renvoie `string | AddressInfo | null` : une chaîne si le serveur écoute sur un socket Unix, un objet avec le port s'il écoute en TCP et `null` s'il n'écoute pas encore. La figure écarte les deux cas qui ne lui servent pas avec une vérification explicite et lance une erreur s'ils se produisent. Cette vérification fait le travail qu'une assertion de type ne ferait que feindre : après elle, TypeScript sait que `direccion` est un `AddressInfo` et que `direccion.port` existe, sans que tu aies à lui promettre quoi que ce soit.

Dans le `revisor`, `/salud` n'a pas besoin d'interroger tous les services ni de lire le rapport complet. Sa question est plus petite : « le processus HTTP est-il vivant et peut-il répondre ? ». Cette distinction est utile en exploitation. Si `/salud` ne répond pas, le problème peut être le processus, le port ou le réseau local. Si `/salud` répond mais que `/api/estados` signale des échecs, le processus fonctionne et le problème est dans les services vérifiés ou dans leur interrogation. Ne déclare pas disponible toute la plateforme simplement parce que le serveur répond `200` : une route de santé vérifie la vie du processus, et le rapport d'états représente le résultat de cibles externes. Ce sont des questions distinctes et elles doivent conserver des noms et des réponses distincts.

### Routes typées : l'URL externe n'est pas une union fiable

Un chemin reçu par HTTP arrive sous forme de texte. N'importe quel client peut demander `/api/estados`, `/api/estado`, `/API/ESTADOS`, `/borrar-todo` ou un chemin avec des paramètres inattendus. Le type de `solicitud.url` reflète cette réalité : c'est `string | undefined`. Tu ne peux pas déclarer que cette entrée externe est déjà l'une de tes routes simplement parce que tu aimerais qu'elle le soit.

L'opération correcte comporte deux étapes. D'abord, tu analyses le texte externe et le convertis en une représentation interne. Ensuite, le reste du gestionnaire travaille avec une union limitée. C'est le même patron de frontière que dans la leçon 6 : de l'extérieur arrive une valeur large ; après validation et classification, le domaine reçoit des alternatives connues.

L'union `Ruta` ne change pas ce qu'une personne peut écrire dans la barre du navigateur. Elle évite en revanche que le reste du programme traite une route inconnue comme si elle était valide. Si tu ajoutes une route future, TypeScript peut t'aider à trouver les endroits où tu dois décider de son code d'état, de son corps et de son format de réponse ; dans le projet final, il le fera avec la garde d'exhaustivité avec `never` que tu as vue dans la leçon 3. Dans cette figure, les états sont écrits à la main dans le fichier pour que le programme soit exécutable seul ; dans le projet, ils viendront de `revisarTodos`.

```ts
// fig08_02.ts
import { createServer } from "node:http";

interface Servicio {
  readonly nombre: string;
  readonly url: string;
  readonly timeoutMs: number;
}

type Estado =
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

type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  const ruta = new URL(url ?? "/", "http://revisor.local").pathname;

  if (ruta === "/salud") {
    return { tipo: "salud" };
  }

  if (ruta === "/api/estados") {
    return { tipo: "estados" };
  }

  return { tipo: "no-encontrada" };
}

function cerrar(servidor: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    servidor.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

const estados: readonly Estado[] = [
  {
    servicio: {
      nombre: "catálogo",
      url: "https://catalogo.example",
      timeoutMs: 1500,
    },
    tipo: "disponible",
    codigoHttp: 200,
    duracionMs: 42,
  },
  {
    servicio: {
      nombre: "pagos",
      url: "https://pagos.example",
      timeoutMs: 3000,
    },
    tipo: "falla",
    detalle: "tiempo límite",
  },
];

const servidor = createServer((solicitud, respuesta) => {
  const ruta = reconocerRuta(solicitud.url);

  if (ruta.tipo === "salud") {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("ok");
    return;
  }

  if (ruta.tipo === "estados") {
    respuesta.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify({ estados }));
    return;
  }

  respuesta.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify({ detalle: "ruta no encontrada" }));
});

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no entregó una dirección TCP");
}

const puerto = direccion.port;
const estadosRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/estados`);
const desconocidaRespuesta = await fetch(`http://127.0.0.1:${puerto}/api/no-existe`);

console.log(await estadosRespuesta.text());
console.log(`${desconocidaRespuesta.status} ${await desconocidaRespuesta.text()}`);

await cerrar(servidor);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_02.ts
$ node fig08_02.js
{"estados":[{"servicio":{"nombre":"catálogo","url":"https://catalogo.example","timeoutMs":1500},"tipo":"disponible","codigoHttp":200,"duracionMs":42},{"servicio":{"nombre":"pagos","url":"https://pagos.example","timeoutMs":3000},"tipo":"falla","detalle":"tiempo límite"}]}
404 {"detalle":"ruta no encontrada"}
```

`new URL` sépare le chemin des autres composantes d'une URL, comme la requête et le fragment. Ainsi, `/api/estados?orden=nombre` reconnaît toujours la même route de base même si tu décides plus tard d'interpréter le paramètre `orden`. Ne compare pas du texte à une URL complète si seul le `pathname` t'intéresse : une requête ajoutée par un client changerait le texte même si la ressource est la même. Le second argument de `new URL` est une base fictive, `http://revisor.local`, qui n'existe que pour que le constructeur accepte des chemins relatifs comme `/salud` ; elle n'est jamais utilisée pour se connecter à quoi que ce soit.

Observe que `Ruta` utilise une union discriminée. Le champ `tipo` joue le même rôle que dans `Estado` : il permet à TypeScript de réduire le type dans chaque branche. Une route de santé n'a pas besoin des états. Une route introuvable ne doit pas renvoyer par accident la collection interne. À mesure que tu ajoutes des routes, cette structure garde ensemble la décision de reconnaissance et la décision de réponse.

Un `404` n'est pas une exception ni un texte optionnel. C'est la réponse correcte quand le processus existe mais n'offre pas la ressource demandée. Répondre `200` avec une phrase qui dit « introuvable » oblige chaque client à inventer des règles pour interpréter le corps. Les codes HTTP communiquent déjà cette catégorie de résultat ; utilise-les pour que les navigateurs, les outils et le panneau partagent le même langage.

La figure précédente contient aussi un défaut volontaire, et il convient que tu le voies maintenant. Son JSON inclut, pour chaque état, le `servicio` complet : son `url` et son `timeoutMs`. C'est commode pour le programmeur, parce que c'est exactement l'objet qui existe déjà en mémoire, et c'est une erreur pour une API : tu viens de publier l'adresse de tes services internes et chaque changement du modèle changera la réponse sans que personne l'ait décidé. La section suivante corrige cela.

### JSON et contrat public : ce qui sort n'est pas ce qu'il y a dedans

JSON est un format de données, pas une preuve que les données sont correctes. `JSON.stringify` convertit des objets du `revisor` en texte pour une réponse HTTP. De l'autre côté, `respuesta.json()` convertit du texte JSON en une valeur que le client doit traiter comme externe jusqu'à ce qu'il la valide. La différence ressemble à celle de la leçon 6 : le serveur connaît ses `Estado` ; le panneau de la leçon suivante recevra du JSON et devra décider si la réponse respecte le contrat qu'il attend.

L'en-tête `content-type: application/json; charset=utf-8` fait partie de cet accord. De nombreux clients peuvent deviner qu'un corps est du JSON d'après son premier caractère, mais ils ne devraient pas avoir à le faire. L'en-tête déclare quel format est envoyé et permet aux outils HTTP, aux navigateurs et aux bibliothèques de le traiter correctement. N'envoie pas du JSON avec `text/plain` simplement parce qu'il s'affiche bien dans un terminal.

Ce qui compte le plus, c'est la forme. Le modèle interne, `Estado`, conserve le `Servicio` complet parce que `revisarTodos` a besoin de relier chaque résultat à sa configuration. Le contrat public est autre chose : c'est ce qu'une personne ou un programme extérieur a besoin de savoir, et rien de plus. C'est pourquoi le projet crée `src/contrato.ts` avec deux types, `EstadoPublico` et `ReportePublico`. `EstadoPublico` est lui aussi une union discriminée par `tipo`, mais au lieu de `servicio: Servicio`, il ne porte que le `nombre`. Il n'y a pas d'`url`, pas de `timeoutMs`. Et une fonction, `aReportePublico`, dans `reporte.ts`, construit chaque objet public champ par champ. Le construire ainsi, au lieu de copier l'`Estado` et de lui retirer des propriétés, a un avantage qui se mesure avec le temps : si demain `Servicio` ajoute un jeton, un compte ou une politique de nouvelles tentatives, l'API ne le publie pas par accident, parce que la réponse ne contient que ce que quelqu'un y a écrit exprès.

Le même fichier contient une troisième pièce, `esReportePublico(valor: unknown): valor is ReportePublico`, qui vérifie à l'exécution qu'une valeur inconnue a cette forme. Elle semble superflue dans le serveur, qui est celui qui produit le JSON. Elle ne l'est pas, pour deux raisons. D'abord, les tests de cette leçon l'utilisent pour lire la réponse de l'API sans accepter aveuglément ce que renvoie `respuesta.json()`. Ensuite, le panneau de la leçon 9 consomme exactement ce contrat depuis le navigateur, et là, c'est bien une frontière réseau : le fichier `contrato.ts` n'importe rien de Node, il peut donc voyager tel quel jusqu'au navigateur avec le panneau. C'est le premier type partagé entre le serveur et l'écran, et il partage les deux choses qui doivent voyager ensemble : la forme et la manière de la vérifier.

Il évite aussi de publier des détails qui ne font pas partie du contrat. Le JSON de `/api/estados` peut inclure `nombre`, `tipo`, code, durée ou détail parce que ce sont des données utiles du rapport. Il ne doit pas renvoyer de variables d'environnement, de chemins de fichiers locaux, d'en-têtes de requêtes ni de messages techniques bruts par commodité. Une API publique conserve des données minimales, délibérées et documentées. Cette règle s'étend au `detalle` d'un échec : ce texte arrive chez le client, donc le projet le construit avec un vocabulaire court et contrôlé (« tiempo límite agotado », « conexión rechazada », « HTTP 503 ») au lieu de renvoyer le message original d'une exception réseau, qui pourrait révéler des adresses ou des chemins.

### Configuration : le port est du texte, pas un nombre

La configuration suit le même principe de frontière. `process.env.PUERTO` vient de l'environnement et n'est pas un nombre sûr : Node fournit toujours une chaîne, même si la personne qui déploie a écrit `PUERTO=8080`. Elle peut manquer, avoir des espaces, contenir `ochenta`, être `0`, être décimale ou dépasser la plage valide des ports. La convertir avec `Number(...)` sans examiner le résultat reporte le problème jusqu'à `listen`, où le message dépend du système d'exploitation et est moins clair pour celui qui a configuré le processus.

La leçon 6 t'a déjà donné l'outil : `leerEnteroPositivo(nombre, valor, predeterminado)`, qui vérifie le format avec une expression régulière avant de convertir, n'utilise la valeur par défaut que lorsque la variable est absente et rejette une valeur présente mais invalide. Ici, on l'ajoute à `configuracion.ts`, telle quelle, et on construit dessus `leerPuerto`, qui ajoute la règle propre aux ports : ils ne peuvent pas dépasser 65535. La figure suivante réunit les deux fonctions et les teste avec cinq entrées, y compris l'absence de la variable.

```ts
// fig08_03.ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; detalle: string };

function leerEnteroPositivo(
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

function leerPuerto(valor: string | undefined): Resultado<number> {
  const puerto = leerEnteroPositivo("PUERTO", valor, 3000);

  if (puerto.ok && puerto.valor > 65535) {
    return { ok: false, detalle: "PUERTO debe estar entre 1 y 65535" };
  }

  return puerto;
}

const entradas: readonly (string | undefined)[] = [undefined, "8080", "65536", "0", "hola"];

for (const entrada of entradas) {
  const resultado = leerPuerto(entrada);
  const texto = resultado.ok ? `puerto ${resultado.valor}` : `rechazado: ${resultado.detalle}`;
  console.log(`PUERTO=${entrada} -> ${texto}`);
}
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_03.ts
$ node fig08_03.js
PUERTO=undefined -> puerto 3000
PUERTO=8080 -> puerto 8080
PUERTO=65536 -> rechazado: PUERTO debe estar entre 1 y 65535
PUERTO=0 -> rechazado: PUERTO debe ser un entero positivo
PUERTO=hola -> rechazado: PUERTO debe ser un entero positivo
```

Le port `0`, qui dans `fig08_01` était utile parce qu'il demandait au système d'exploitation un port libre, est ici rejeté : c'est un outil de test, pas une configuration, parce qu'un service publié a besoin d'un port prévisible où ses clients puissent le trouver. La valeur par défaut `3000` est une décision explicite du projet, pas une propriété spéciale de Node. Il est valide de choisir une autre valeur ou d'exiger que `PUERTO` existe, pourvu que le programme le communique et le teste. L'important est de ne pas laisser une valeur absente se transformer par accident en un comportement inconnu. L'expression régulière `^[1-9]\d*$` rejette les espaces, les signes, les zéros initiaux et les décimaux avant de convertir ; ensuite, `Number.isSafeInteger` confirme que la conversion a produit un entier représentable de façon sûre, et la plage des ports complète le contrat. Valider en couches peut sembler répétitif face à un simple `parseInt`, mais cela évite d'accepter des cas ambigus comme `3000texto`, que `parseInt` convertirait partiellement en `3000`.

Dans le `revisor`, la configuration du serveur ne se mélange pas avec la configuration des services. La liste validée de `Servicio` répond à la question de savoir quelles cibles sont vérifiées et avec quel `timeoutMs` ; elle vit dans un fichier, `servicios.json`, et se lit avec `leerServicios` de la leçon 6. Le port répond à la question de savoir où l'API écoute ; il vit dans une variable d'environnement. Garder les deux concepts séparés permet de changer le port sans toucher au contrat de chaque cible et de réutiliser la logique de vérification depuis un test sans ouvrir de connexion TCP. Et une règle que tu connais déjà depuis la leçon 6 reste en vigueur : si quelque chose manque ou est invalide, le programme indique quelle variable a échoué sans afficher le reste de l'environnement, qui pourrait contenir des secrets.

### Journal et arrêt propre : exploiter fait aussi partie du programme

Un journal enregistre des faits qui aident à répondre à des questions opérationnelles : le processus a-t-il démarré ? quelle requête est arrivée ? quel code a été répondu et combien de temps cela a-t-il pris ? quand a-t-il commencé à s'arrêter ? a-t-il fini de s'arrêter ? Il ne remplace pas la réponse HTTP. La réponse est pour le client qui a fait une requête ; le journal est pour celui qui exploite le système et diagnostique des problèmes ensuite, et c'est pourquoi il ne doit jamais être mélangé avec ce que l'on répond au client.

Les messages doivent avoir de la structure et un but. Un texte comme `algo pasó` ne permet ni de filtrer ni de comparer des événements. Un enregistrement avec `evento` et `detalle`, écrit comme une ligne de JSON, conserve une catégorie stable et une description humaine, et n'importe quel outil d'analyse de journaux sait le lire. Dans un service plus grand, tu ajouterais un niveau, un identifiant de requête et d'autres champs. Et n'utilise pas le journal pour copier des secrets, des corps complets de requêtes ou des jetons d'autorisation : un fichier de journal circule généralement plus que tu ne l'imagines. C'est pour cette raison que le projet enregistre le `pathname` de chaque requête et non l'URL complète, parce que la requête (`?token=…`) est précisément l'endroit où les gens mettent, sans y penser, ce qui ne devrait pas rester écrit.

L'arrêt mérite la même attention que le démarrage. Appeler `servidor.close(...)` cesse d'accepter de nouvelles connexions et prévient, par son *callback*, quand le serveur a fini de s'arrêter, c'est-à-dire quand il ne reste plus aucune connexion active. Cela ne signifie pas qu'une requête en cours disparaît à cet instant : l'arrêt ordonné permet de terminer ce qui était déjà en route. Si le processus sort sans attendre cet avis, tu peux couper une réponse en plein milieu ou perdre le dernier enregistrement.

En production, celui qui arrête ton processus n'est presque jamais une personne qui tape une commande : c'est un superviseur (systemd, un orchestrateur de conteneurs, l'appui sur `Ctrl+C` dans ton terminal) qui envoie un **signal** au processus. `SIGTERM` signifie « termine quand tu peux » et `SIGINT` est ce qu'envoie `Ctrl+C`. Si tu n'écoutes pas le signal, Node se termine immédiatement, sans rien fermer. Si tu l'écoutes, tu décides ce qu'il faut faire avant de sortir.

La figure suivante démontre la séquence complète avec un cas qui la rend visible. Le serveur répond lentement, après 100 ms. Le programme lance une requête, attend que le serveur la reçoive, puis s'envoie à lui-même `SIGTERM` avec `process.kill(process.pid, "SIGTERM")`. Remarque l'ordre des enregistrements : l'arrêt commence pendant que la requête est encore en cours, le client reçoit quand même sa réponse complète, et ce n'est qu'ensuite que `cerrado` est écrit.

```ts
// fig08_04.ts
import { createServer, type Server } from "node:http";

function registrar(evento: string, detalle: string): void {
  console.log(JSON.stringify({ evento, detalle }));
}

function cerrar(servidor: Server): Promise<void> {
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

let llegoLaSolicitud: () => void = () => {};
const solicitudRecibida = new Promise<void>((resolve) => {
  llegoLaSolicitud = resolve;
});

const servidor = createServer((_solicitud, respuesta) => {
  registrar("solicitud", "llegó; responderá en 100 ms");
  llegoLaSolicitud();

  setTimeout(() => {
    respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    respuesta.end("terminé");
  }, 100);
});

let cierre: Promise<void> | undefined;

function detener(senal: string): void {
  cierre ??= (async () => {
    registrar("cierre", `${senal} recibida: no se aceptan conexiones nuevas`);
    await cerrar(servidor);
    registrar("cerrado", "ya no queda ninguna solicitud en curso");
  })();
}

process.once("SIGTERM", () => detener("SIGTERM"));

await new Promise<void>((resolve) => {
  servidor.listen(0, "127.0.0.1", resolve);
});

const direccion = servidor.address();

if (direccion === null || typeof direccion === "string") {
  throw new Error("el servidor no escucha en un puerto TCP");
}

const pendiente = fetch(`http://127.0.0.1:${direccion.port}/lento`).then((respuesta) =>
  respuesta.text(),
);

await solicitudRecibida;
process.kill(process.pid, "SIGTERM");

registrar("cliente", `recibió «${await pendiente}»`);
await cierre;
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_04.ts
$ node fig08_04.js
{"evento":"solicitud","detalle":"llegó; responderá en 100 ms"}
{"evento":"cierre","detalle":"SIGTERM recibida: no se aceptan conexiones nuevas"}
{"evento":"cliente","detalle":"recibió «terminé»"}
{"evento":"cerrado","detalle":"ya no queda ninguna solicitud en curso"}
```

L'ordre des enregistrements montre une propriété importante : `cerrado` n'est écrit qu'après `await cerrar(servidor)`. L'enregistrer avant serait une affirmation fausse : le processus pourrait encore servir une connexion active, ou même échouer à l'arrêt. La petite promesse de `cerrar` adapte l'API à *callback* de `server.close` à la forme asynchrone que tu connais depuis la leçon 5.

La variable `cierre` mérite de l'attention. Deux signaux différents peuvent arriver à peu d'écart, par exemple un superviseur qui envoie `SIGTERM` pendant que quelqu'un appuie sur `Ctrl+C` (`SIGINT`), et chacun essaierait d'arrêter le même serveur. L'opérateur `??=` n'affecte la promesse d'arrêt que si elle n'existe pas encore, de sorte que le second signal réutilise l'arrêt en cours au lieu d'en lancer un autre. De plus, le gestionnaire n'appelle pas `process.exit()` : cette méthode termine le processus instantanément et couperait précisément ce que tu viens de démontrer qu'il faut attendre. Quand il ne reste aucun travail en attente, Node se termine tout seul, avec le code de sortie qui convient.

Une remarque sur `process.once` : il enregistre le gestionnaire pour un seul signal de chaque type. Si une seconde `SIGINT` (un second `Ctrl+C`) arrivait après que le premier gestionnaire a déjà tourné, Node revient à son comportement par défaut et termine le processus immédiatement. C'est une sortie de secours raisonnable pour celui qui appuie deux fois sur `Ctrl+C` parce que l'arrêt ordonné est trop long, et cela signifie aussi que, pour deux signaux du même type, la protection de `??=` n'a pas l'occasion de s'exercer. Si tu préfères une autre politique, par exemple attendre un maximum de secondes puis forcer la sortie, c'est une décision du projet, pas une propriété de Node.

Dans le `revisor`, enregistre des événements de bord, pas chaque détail interne d'une fonction pure. `revisarTodos` peut renvoyer des états sans savoir s'ils seront affichés, exposés par HTTP ou montrés sur un écran. `servidor.ts`, lui, sait qu'il a traité `GET /api/estados`, quel code il a répondu et combien de temps cela a pris. C'est la bonne couche pour le journal des requêtes. Et un journal n'est pas non plus une excuse pour attraper n'importe quelle exception et continuer comme si de rien n'était : si tu ne peux pas ouvrir le port parce qu'il est occupé, enregistre le problème avec son contexte et laisse le démarrage échouer avec un code de sortie différent de zéro.

### Le `revisor` assemblé : l'API appelle la vraie vérification

Maintenant, tu assembles les pièces, sans faire du serveur le propriétaire de la vérification. Le modèle et `revisarTodos` conservent le contrat des leçons précédentes, sans une seule ligne modifiée. `servidor.ts` reçoit une fonction qui obtient le rapport et une autre qui enregistre les événements, et ne sait pas d'où elles viennent. `main.ts` est la seule pièce qui les connaît toutes : elle lit le port et le fichier de services, assemble la fonction qui interroge pour de vrai, ouvre le port et enregistre les gestionnaires de signaux. Cette figure change de forme par rapport aux exemples isolés précédents : les états ne sont plus une liste fixe ; ils sont produits en appelant `revisarTodos` à chaque requête.

**Une vraie cible : `consulta.ts`.** C'est la première implémentation réelle du type `Consultar` de la leçon 5. Elle reçoit un `Servicio` et un `AbortSignal`, demande l'URL du service avec `fetch`, mesure combien de temps cela a pris avec `performance.now()` et renvoie le code HTTP et la durée. Deux détails comptent. D'abord, le signal qu'elle reçoit est celui que `revisarTodos` a créé avec `AbortSignal.timeout(servicio.timeoutMs)` : si le service ne répond pas à temps, `fetch` s'interrompt tout seul, sans que `consulta.ts` ait à programmer un minuteur. Ensuite, après avoir lu le code d'état, la fonction annule le corps de la réponse avec `respuesta.body?.cancel()` : le `revisor` s'intéresse au fait que le service réponde, pas au téléchargement de son contenu, et laisser le corps non lu maintient la connexion occupée.

Ce qui change par rapport à un `fetch` naïf, c'est la manière dont les échecs sont traduits. Quand `fetch` ne parvient pas à se connecter, il lance un `TypeError` avec le message « fetch failed » qui, à lui seul, ne dit rien d'utile ; la vraie raison voyage dans `error.cause`, et c'est une autre `Error` avec une propriété `code` comme `ECONNREFUSED`. La fonction auxiliaire `codigoDeRed` parcourt cette chaîne avec les vérifications que tu connais déjà (`instanceof Error`, `"code" in ...`, `typeof ... === "string"`) et renvoie le code ou `undefined`, sans une seule assertion. Avec lui, `consultarConFetch` lance l'un de trois messages courts : « tiempo límite agotado » si le signal a été interrompu, « conexión rechazada » si le code était `ECONNREFUSED` et « no se pudo conectar » dans tous les autres cas. Chaque `throw` porte `{ cause: error }`, qui attache l'erreur d'origine à la nouvelle : ESLint, avec sa configuration recommandée, exige exactement cela (règle `preserve-caught-error`), et il a raison, parce que celui qui déboguera garde ainsi la vraie cause à un pas, même si le client de l'API ne voit que le message court.

**Le fichier de services : `archivo.ts`.** C'est la frontière du disque, telle que l'a dessinée la leçon 7 : il lit `servicios.json`, convertit le texte en `unknown` avec `JSON.parse` et remet cette valeur à `leerServicios`, qui existait déjà. Il renvoie un `Resultado`, de sorte qu'un fichier absent, un JSON mal formé et un service invalide aboutissent au même endroit : un détail lisible, et non une exception avec une trace que quelqu'un doit déchiffrer. Note que `JSON.parse` renvoie `any`, et qu'il est affecté à une variable déclarée `unknown` : cela ne nécessite aucune assertion, et oblige `leerServicios` à vérifier ce qu'il reçoit.

**Le serveur : `servidor.ts`.** Sa forme est celle des figures précédentes, durcie. `crearServidor(opciones)` renvoie un `Server` sans le mettre à l'écoute. `atender` répond d'abord aux méthodes : si ce n'est pas `GET`, il répond `405` avec l'en-tête `allow: GET`, qui est la manière standard de dire au client ce qu'il peut faire. Ensuite, il reconnaît la route avec une union et un `switch` dont le `default` utilise la garde `never` de la leçon 3. Sur `/api/estados`, il attend d'abord `obtenerReporte()` et n'écrit la réponse qu'ensuite : s'il le faisait à l'envers, un échec en cours de route laisserait un `200` déjà envoyé avec un corps cassé. Si le rapport échoue, il enregistre la cause technique dans le journal et répond un `500` avec `{"detalle":"error interno"}` : le client reçoit quelque chose de stable et de sûr, et celui qui exploite a la cause. `escuchar` enveloppe `listen` dans une promesse qui est rejetée si le serveur émet `error` (par exemple `EADDRINUSE`, port occupé) ; sans cela, l'erreur serait émise comme un événement sans gestionnaire et ferait tomber le processus avec une trace. `puertoDe` encapsule la vérification de `address()` que tu as vue dans `fig08_01`.

Il y a une ligne qui mérite une explication : `void atender(...)` dans le gestionnaire de `createServer`. `atender` est une fonction `async` et renvoie donc une promesse ; le gestionnaire de Node ne l'attend pas. L'opérateur `void` déclare qu'ignorer cette promesse est intentionnel. C'est sûr parce que `crearServidor` enchaîne un `.catch(...)` à cette promesse : si `atender` échoue pour une raison qu'il n'a pas prévue, l'erreur est enregistrée et le client reçoit un `500` générique. Sans ce `.catch`, une exception dans `atender` serait une promesse rejetée non gérée, et Node terminerait le processus entier : un seul client avec une requête bizarre ferait tomber le service pour tout le monde. La destination d'une requête est écrite par le client, et toute destination ne peut pas être analysée : `curl --request-target "//"` en envoie une pour laquelle `new URL` lance `TypeError: Invalid URL`. C'est pourquoi `rutaDe` attrape cette erreur et renvoie `"?"`, un marqueur qu'aucune vraie route ne peut avoir (toute route analysée commence par `/`) : elle tombe dans le `404` et le journal montre qu'il est arrivé quelque chose d'illisible, au lieu d'une route vide. Un test envoie précisément cette requête.

**Le point d'entrée : `main.ts`.** C'est une composition, pas un lieu de règles. Il lit et valide le port ; il lit et valide les services ; il assemble le serveur avec une fonction `obtenerReporte` qui appelle `revisarTodos` avec `consultarConFetch` et convertit le résultat avec `aReportePublico` ; il ouvre le port avec `escuchar` ; il enregistre `escuchando` ; et il relie `SIGTERM` et `SIGINT` à un arrêt ordonné avec la même promesse partagée que dans `fig08_04`. Si quelque chose de tout cela échoue avant que le serveur n'ouvre le port, il enregistre l'événement, fixe `process.exitCode = 1` et retourne : le processus se termine tout seul avec un code d'erreur, sans appeler `process.exit()`. Remarque l'ordre : on valide d'abord et on ouvre le port ensuite, jamais l'inverse.

Les tests cessent d'être des jouets. `configuracion.test.ts` utilise une table de cas, comme dans la leçon 7, pour `leerPuerto`. `contrato.test.ts` en utilise une autre pour `esReportePublico` : un rapport valide et quatre façons de se tromper (`null`, des `estados` qui ne forment pas un tableau, un `tipo` inconnu et un `codigoHttp` qui arrive comme texte). `reporte.test.ts` gagne un test vérifiant que le rapport public ne contient ni l'URL ni le `timeoutMs`. Et `servidor.test.ts` fait ce qui donne le plus de confiance, en plus de tester les routes, les méthodes, le `500` sans fuite du détail interne et la requête avec la destination `//`, qui doit recevoir `404` sans faire tomber le processus : il lève un vrai serveur cible, avec quatre comportements (`/ok` répond 200, `/caido` répond 503, un port fermé refuse la connexion et `/lento` ne répond jamais), il lève le serveur du `revisor` avec le vrai `consultarConFetch`, fait un vrai `fetch` vers `/api/estados` et vérifie chaque dénouement : disponible, échec par HTTP 503, échec par connexion refusée et échec par délai limite, ce dernier avec un `timeoutMs` de 150 ms. Ensuite, il vérifie ce qui ne doit pas apparaître : pas une seule `url` dans le JSON. Chaque test ferme ses serveurs dans un bloc `finally`, pour qu'un échec d'assertion ne laisse pas le port ouvert et le processus de tests suspendu.

Les fichiers nouveaux ou modifiés sont ceux-ci. Ceux qui ne changent pas par rapport à la leçon 7 apparaissent à la fin de la section, complets, pour que le projet soit reproductible du début à la fin.

```ts
// fig08_05/src/contrato.ts
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
// fig08_05/src/bitacora.ts
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
// fig08_05/src/consulta.ts
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
// fig08_05/src/archivo.ts
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
// fig08_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";

export type ObtenerReporte = () => Promise<ReportePublico>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly registrar: Bitacora;
}

type Ruta =
  { readonly tipo: "salud" } | { readonly tipo: "estados" } | { readonly tipo: "no-encontrada" };

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
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
    case "salud":
      respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      respuesta.end("ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        opciones.registrar({
          evento: "error",
          detalle: error instanceof Error ? error.message : "falla desconocida",
        });
        enviarJson(respuesta, 500, { detalle: "error interno" });
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
// fig08_05/src/main.ts
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
`configuracion.ts` conserve `leerServicios` de la leçon 7 et gagne trois choses : `esRegistro` est désormais exporté (`contrato.ts` l'utilise), et on ajoute `leerEnteroPositivo` et `leerPuerto`. `reporte.ts` conserve `lineaReporte` et gagne `aReportePublico`.

```ts
// fig08_05/src/configuracion.ts
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
// fig08_05/src/reporte.ts
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
Les quatre tests du projet :

```ts
// fig08_05/src/configuracion.test.ts
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
// fig08_05/src/contrato.test.ts
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
// fig08_05/src/reporte.test.ts
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
```ts
// fig08_05/src/servidor.test.ts
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
Le fichier `servicios.json` décrit les cibles que le programme vérifie quand tu le lances à la main. Les trois existent : le premier et le deuxième sont des sites publics (sans connexion à internet, tu verras des échecs « no se pudo conectar » sur eux, et c'est normal), et le troisième pointe vers un port de ta propre machine où personne n'écoute, pour voir un échec sans dépendre de personne.

```json fig08_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
Et les fichiers qui ne changent pas par rapport à la leçon 7 : la configuration de npm et de TypeScript, ESLint et Prettier, le modèle et le coordinateur `revisarTodos`.

```json fig08_05/package.json
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
```json fig08_05/tsconfig.json
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
```js fig08_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```
```json fig08_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```ts
// fig08_05/src/modelo.ts
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
// fig08_05/src/revisar.ts
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
```bash
$ cd fig08_05
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

✔ leerPuerto: sin variable usa 3000 (0.638417ms)
✔ leerPuerto: un puerto válido (0.069958ms)
✔ leerPuerto: 65535 es el límite (0.187208ms)
✔ leerPuerto: 65536 se pasa del límite (0.0895ms)
✔ leerPuerto: 0 no es un puerto (0.048708ms)
✔ leerPuerto: un decimal se rechaza (0.033125ms)
✔ leerPuerto: texto se rechaza (0.044541ms)
✔ leerPuerto: la cadena vacía se rechaza (0.030416ms)
✔ esReportePublico: un reporte con las dos variantes (0.406375ms)
✔ esReportePublico: null (0.301167ms)
✔ esReportePublico: estados no es un arreglo (0.160583ms)
✔ esReportePublico: un estado con un tipo desconocido (0.798917ms)
✔ esReportePublico: codigoHttp llega como texto (0.062ms)
✔ disponible conserva código y duración (0.435ms)
✔ falla conserva detalle (0.072583ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.337458ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (165.446042ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (4.957833ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (3.789583ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 239.299834
```

Ce bloc démontre deux limites distinctes. `npm run verificar` confirme les contrats statiques de tous les modules ; `npm run probar` compile puis exécute une vraie requête HTTP, contre de vraies cibles. Aucun `fetch` des tests n'est une simulation : Node ouvre des sockets locaux, le client reçoit des réponses, le délai limite de 150 ms expire pour de bon et l'arrêt attend que les serveurs cessent d'écouter.

Tu n'as pas encore vu le programme tourner. Compile-le et démarre-le sur le port 3100 (si tu ne mets pas `PUERTO`, il utilisera 3000). Ces blocs sont une exécution d'exemple dans ton terminal ; les durées et les heures seront différentes dans le tien.

```text
$ npm run compilar
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:54:27.333Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

Dans un autre terminal :

```text
$ curl -i http://127.0.0.1:3100/salud
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

ok
$ curl http://127.0.0.1:3100/api/estados
{"estados":[{"nombre":"ejemplo","tipo":"disponible","codigoHttp":200,"duracionMs":190},{"nombre":"node","tipo":"disponible","codigoHttp":200,"duracionMs":405},{"nombre":"local-apagado","tipo":"falla","detalle":"conexión rechazada"}]}
$ curl -i http://127.0.0.1:3100/nada
HTTP/1.1 404 Not Found
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"ruta no encontrada"}
$ curl -i -X POST http://127.0.0.1:3100/api/estados
HTTP/1.1 405 Method Not Allowed
allow: GET
content-type: application/json; charset=utf-8
Date: Fri, 02 Oct 2026 20:54:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"detalle":"método no permitido"}
```

Reviens au premier terminal et appuie sur `Ctrl+C`. Le journal raconte toute l'histoire, et la dernière paire de lignes est l'arrêt ordonné :

```text
{"momento":"2026-10-02T20:54:28.533Z","evento":"solicitud","detalle":"GET /salud 200 2 ms"}
{"momento":"2026-10-02T20:54:28.964Z","evento":"solicitud","detalle":"GET /api/estados 200 418 ms"}
{"momento":"2026-10-02T20:54:28.978Z","evento":"solicitud","detalle":"GET /nada 404 0 ms"}
{"momento":"2026-10-02T20:54:28.992Z","evento":"solicitud","detalle":"POST /api/estados 405 0 ms"}
{"momento":"2026-10-02T20:54:28.993Z","evento":"cierre","detalle":"SIGINT recibida"}
{"momento":"2026-10-02T20:54:28.994Z","evento":"cerrado","detalle":"el servidor dejó de aceptar conexiones"}
```

Deux choses méritent d'être observées. La première : `GET /api/estados` a pris 418 ms, à peine plus que la cible la plus lente (405 ms) et beaucoup moins que la somme des trois ; c'est la concurrence de la leçon 5 qui fait son travail à travers HTTP. La seconde : chaque `GET /api/estados` relance toutes les requêtes. C'est la décision la plus simple, la bonne pour commencer, et elle a un coût que tu verras dans « Ce qui se fait de travers ».

## L'erreur que tu vas voir

La première sorte d'erreur apparaît quand tu déclares des routes internes correctes, mais que tu appelles une fonction avec une route qui n'appartient pas à l'union. Avec TypeScript 7.0.2, `tsc` signale TS2345 sur l'appel à `atender`.

```ts
// fig08_06.ts
type Ruta = "/salud" | "/api/estados";

function atender(ruta: Ruta): void {
  console.log(ruta);
}

atender("/api/estado");
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext fig08_06.ts
fig08_06.ts(8,9): error TS2345: Argument of type '"/api/estado"' is not assignable to parameter of type 'Ruta'.
```

TS2345 indique que l'argument d'un appel ne respecte pas le contrat du paramètre. Ici, cela ne veut pas dire que TypeScript a une préférence orthographique : cela révèle une décision en suspens. Si la route publique correcte est `/api/estados`, corrige l'appel. Si tu as vraiment besoin d'une route au singulier, ajoute-la à `Ruta`, apprends à `reconocerRuta` comment l'identifier et définis quelle réponse elle produit. Ne règle pas le problème avec `as Ruta` ; cette assertion fait taire précisément la vérification qui évite les routes déclarées mais non implémentées.

Un autre diagnostic fréquent apparaît parce que `IncomingMessage.url` peut être `undefined`. Même si les requêtes HTTP normales ont une URL, le type de Node permet son absence et le gestionnaire doit avoir une politique explicite.

```ts
// fig08_07.ts
import { createServer } from "node:http";

createServer((solicitud, respuesta) => {
  respuesta.end(solicitud.url.toUpperCase());
});
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --types node fig08_07.ts
fig08_07.ts(5,17): error TS18048: 'solicitud.url' is possibly 'undefined'.
```

TS18048 apparaît quand tu essaies d'utiliser une valeur qui peut manquer. La correction n'est pas d'écrire `solicitud.url!`, parce que cela promet seulement au compilateur que tu sais quelque chose que le programme n'a pas vérifié. Décide ce que l'API doit faire face à l'absence. Pour reconnaître une route, `solicitud.url ?? "/"` offre une racine par défaut, ce que fait `rutaDe` dans le projet. Si l'URL est obligatoire pour une opération concrète, tu peux répondre `400` et terminer la requête. Le choix dépend du contrat, mais il doit exister avant d'utiliser des méthodes de chaîne comme `toUpperCase`.

Il y a une troisième erreur qui n'est pas celle du compilateur mais de Node, et tu la verras bientôt : démarrer le serveur sur un port qu'un autre processus occupe déjà. Sans gestion d'erreurs, Node se termine avec une trace `Error: listen EADDRINUSE`. Dans le projet, `escuchar` convertit cet événement en rejet de la promesse, et `main.ts` l'enregistre et sort avec le code 1. Pour la provoquer, démarre deux copies sur le même port ; la seconde affiche :

```text
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T20:41:59.411Z","evento":"arranque-fallido","detalle":"listen EADDRINUSE: address already in use 127.0.0.1:3100"}
```

`EADDRINUSE` signifie que le port a déjà un propriétaire : c'est presque toujours une copie précédente de ton propre programme que tu n'as pas arrêtée. Avant de changer le code, cherche qui écoute sur ce port (`lsof -i :3100` sous Linux) ou utilise un autre port avec `PUERTO=3101`.

## Ce qui se fait de travers

- **Ouvrir le serveur avant de valider la configuration.** Si tu appelles `listen` et découvres ensuite que `PUERTO` ou la liste de services est invalide, le processus peut rester visible et à moitié fonctionnel. Valide d'abord les entrées externes ; n'ouvre le port que lorsque le programme sait avec quel contrat il va travailler.

- **Utiliser `solicitud.url as Ruta`.** Une assertion n'analyse pas la requête et ne bloque pas les routes étrangères. Elle ne fait qu'éliminer la protection statique. Convertis le texte externe au moyen d'une fonction comme `reconocerRuta` et réponds `404` quand il n'existe pas d'alternative valide.

- **Répondre du JSON sans en-tête `content-type`.** Certains clients pourront interpréter le corps malgré tout, mais d'autres n'auront pas de signal fiable sur la manière de le lire. La représentation et son en-tête forment un seul contrat HTTP.

- **Répondre `200` pour des erreurs de route ou de configuration.** Un corps qui dit « erreur » avec le code `200` oblige le panneau et les autres intégrations à interpréter des phrases. Utilise les codes HTTP pour la catégorie générale et réserve le corps au détail dont le client a besoin.

- **Sérialiser le modèle interne comme réponse.** `JSON.stringify(estados)` tient en une ligne et fonctionne, mais il publie l'URL et le délai limite de chaque service, et lie chaque changement du modèle à un changement de l'API. Construis l'objet public champ par champ.

- **Croire que `new URL` n'échoue jamais.** La destination d'une requête est écrite par le client, et `new URL("//", base)` lance `TypeError: Invalid URL`. Une exception que personne n'attrape dans un gestionnaire asynchrone termine le processus. Attrape l'erreur lors de l'analyse et réponds `404` ou `400`, et enchaîne un `.catch` à la promesse du gestionnaire comme dernier filet.

- **Écrire la réponse avant d'attendre le résultat.** Si tu appelles `writeHead(200, ...)` puis fais `await` sur un travail qui peut échouer, tu ne peux plus changer le code en `500` : le `200` est parti. Attends d'abord, réponds ensuite.

- **Mettre l'interrogation des services dans le gestionnaire de chaque requête sans politique.** Si chaque `GET /api/estados` déclenche toutes les requêtes distantes, dix personnes qui ouvrent le panneau multiplient le trafic vers tes services et obtiennent des rapports différents. Pour commencer, c'est acceptable ; en production, décide délibérément si l'API vérifie à la demande, conserve un rapport récent quelques secondes ou exécute des vérifications programmées.

- **Enregistrer des secrets ou l'URL complète de chaque requête.** Les journaux doivent servir à exploiter, pas devenir une copie permanente de données sensibles. Enregistre la méthode, le chemin sans la requête, le code et la durée ; supprime ou masque les identifiants, les jetons et les données privées.

- **Appeler `process.exit()` à la réception d'un signal.** Le processus se termine immédiatement et peut couper des requêtes, des écritures et des enregistrements. Lance d'abord `server.close`, attends sa fin et laisse le processus se terminer naturellement quand il ne reste plus de travail en attente.

- **Attraper toutes les erreurs et répondre toujours le même détail technique.** Le client a besoin d'une réponse stable et sûre ; le journal a besoin de contexte pour diagnostiquer. Sépare les deux publics : un `500` peut dire `{"detalle":"error interno"}` pendant que l'enregistrement conserve l'erreur technique.

## Exercices

### Exercice 1 — Route de version

Ajoute la route `GET /version` à la reconnaissance typée des routes du projet. Elle doit répondre `200`, un en-tête de texte et le corps `revisor 1`. Conserve `404` pour toute autre route, et vérifie que le compilateur te signale le `switch` tant que tu ne traites pas la nouvelle branche. Vérifie les deux réponses avec un test qui utilise un serveur sur le port `0`.

### Exercice 2 — Un rapport avec résumé

Ajoute à `ReportePublico` un champ `resumen: { disponibles: number; fallas: number }` et calcule-le dans `aReportePublico`. Mets à jour le test de `reporte.test.ts` pour qu'il le vérifie, et lance `npm run verificar` pour voir quels autres fichiers le compilateur t'oblige à toucher. Explique pourquoi `esReportePublico` doit lui aussi changer.

### Exercice 3 — Une variable d'environnement de plus

Ajoute `REVISOR_MAX_SERVICIOS` (20 par défaut) avec `leerEnteroPositivo` et fais en sorte que `main.ts` refuse le démarrage, avec `configuracion-invalida`, si `servicios.json` contient plus de services que cette limite. Écris un test avec une table de cas pour la règle.

### Exercice 4 — Arrêt avec délai maximal

Un arrêt qui attend une requête qui ne se termine jamais laisse le processus suspendu. Modifie `detener` dans `main.ts` pour que, si `cerrar(servidor)` ne se termine pas en 10 secondes, il enregistre l'événement `cierre-forzado` et appelle `servidor.closeAllConnections()`. Vérifie ton changement en démarrant le `revisor`, en faisant un `curl` vers une cible lente et en envoyant `SIGTERM`.

## Solutions

### Solution 1

La nouvelle route doit apparaître à la fois dans le type et dans la fonction qui convertit le texte externe, et cette fonction continue de passer par `rutaDe` : appeler `new URL` directement réintroduirait le défaut des requêtes avec la destination `//`. La laisser dans une seule des deux parties produirait un contrat incomplet : l'union dirait qu'elle existe, mais aucune requête ne pourrait l'atteindre, ou une requête arriverait dans une branche que TypeScript ne reconnaît pas comme faisant partie de la conception. Avec la garde `never` du `switch`, oublier la branche est une erreur de compilation (TS2322) et non un oubli que l'on découvre en production.

```ts
type Ruta =
  | { readonly tipo: "salud" }
  | { readonly tipo: "version" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/salud":
      return { tipo: "salud" };
    case "/version":
      return { tipo: "version" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}
```

Dans `atender`, ajoute `case "version":` avec le même patron que `salud` : `respuesta.writeHead(200, { "content-type": "text/plain; charset=utf-8" })`, `respuesta.end("revisor 1")` et `return`. Le test, dans `servidor.test.ts`, vérifie aussi qu'une route différente reçoit `404` ; ne tester que le chemin réussi ne confirme pas que le serveur conserve la limite entre routes connues et inconnues.

```ts
test("GET /version responde el texto y una ruta parecida sigue en 404", async () => {
  const api = crearServidor({
    obtenerReporte: async () => ({ estados: [] }),
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const version = await fetch(`${base}/version`);
    assert.equal(version.status, 200);
    assert.equal(version.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await version.text(), "revisor 1");

    const parecida = await fetch(`${base}/version/otra`);
    assert.equal(parecida.status, 404);
    await parecida.body?.cancel();
  } finally {
    await cerrar(api);
  }
});
```

### Solution 2

Le changement de type et le calcul vivent ensemble, et le compilateur fait le reste du travail : chaque endroit qui construit un `ReportePublico` sans `resumen` cesse de compiler.

```ts
export interface ReportePublico {
  readonly resumen: { readonly disponibles: number; readonly fallas: number };
  readonly estados: readonly EstadoPublico[];
}

export function aReportePublico(estados: readonly Estado[]): ReportePublico {
  const publicos = estados.map(aEstadoPublico);
  const disponibles = publicos.filter((estado) => estado.tipo === "disponible").length;

  return {
    resumen: { disponibles, fallas: publicos.length - disponibles },
    estados: publicos,
  };
}
```

Ici, `aEstadoPublico` est la fonction qui convertit un seul `Estado`, celle qui était auparavant écrite à l'intérieur du `map`. `esReportePublico` doit aussi vérifier `resumen`, parce que son rôle est de décrire à l'exécution exactement ce que le type promet à la compilation ; si tu ne changes que le type, la garde accepterait des réponses que le type n'admet plus, et le panneau de la leçon 9 compilerait contre un contrat que personne ne vérifie.

### Solution 3

La lecture de la limite est une entrée d'environnement de plus et se traite comme le port : une petite fonction, un `Resultado`, et `main.ts` décide quoi faire de l'échec.

```ts
const maximo = leerEnteroPositivo("REVISOR_MAX_SERVICIOS", process.env.REVISOR_MAX_SERVICIOS, 20);

if (!maximo.ok) {
  fallarArranque("configuracion-invalida", maximo.detalle);
  return;
}

if (servicios.valor.length > maximo.valor) {
  fallarArranque(
    "configuracion-invalida",
    `servicios.json trae ${servicios.valor.length} servicios y el máximo es ${maximo.valor}`,
  );
  return;
}
```

La règle « plus de services que le maximum » est pure : il convient de l'extraire dans une fonction `validarCantidad(servicios, maximo): Resultado<readonly Servicio[]>` dans `configuracion.ts` et de la tester avec une table (0, 1, le maximum, le maximum plus un), qui est l'endroit où vivent les erreurs de limite, au lieu de la tester à travers `main.ts`.

### Solution 4

La course se joue entre deux promesses : l'arrêt ordonné et un minuteur. Si le minuteur gagne, les connexions encore ouvertes sont fermées de force ; cela permet à `server.close` de se terminer.

```ts
const detener = (senal: string): void => {
  cierre ??= (async () => {
    registrar({ evento: "cierre", detalle: `${senal} recibida` });

    const limite = setTimeout(() => {
      registrar({ evento: "cierre-forzado", detalle: "pasaron 10 s con solicitudes abiertas" });
      servidor.closeAllConnections();
    }, 10_000);

    try {
      await cerrar(servidor);
    } finally {
      clearTimeout(limite);
    }

    registrar({ evento: "cerrado", detalle: "el servidor dejó de aceptar conexiones" });
  })();
};
```

Le `.catch(...)` que `main.ts` enchaîne à la fin de l'expression est conservé tel quel ; il est omis ici pour ne montrer que ce qui change. Le `finally` annule le minuteur quand l'arrêt s'est bien terminé à temps : sans lui, le minuteur garderait le processus en vie dix secondes de plus alors que ce n'est plus nécessaire. `closeAllConnections()` coupe les requêtes en cours, c'est donc un dernier recours, et c'est pourquoi on l'enregistre comme un événement à part : celui qui lit le journal doit pouvoir distinguer un arrêt propre d'un arrêt forcé.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2` dans `~/proyectos/revisor`.
- [ ] Dans le dossier `figuras/`, `fig08_01.ts` compile avec `--types node`, affiche `200 ok` et le processus se termine tout seul après avoir fermé son serveur.
- [ ] `fig08_03.ts` rejette `65536`, `0` et `hola` avec un détail qui nomme la variable `PUERTO`, et accepte l'absence avec `3000`.
- [ ] `fig08_04.ts` affiche `cierre` avant `cliente` et `cerrado` à la fin ; la requête en cours reçoit sa réponse.
- [ ] En compilant la figure de la route avec `/api/estado`, TS2345 apparaît ; en compilant la figure de `solicitud.url`, TS18048 apparaît.
- [ ] Dans le projet, `npm run verificar`, `npm run lint` et `npm run formato` se terminent sans avertissements, et `npm run probar` rapporte 19 tests réussis et 0 échoué.
- [ ] `PUERTO=3100 npm run arrancar` enregistre `escuchando` ; `curl http://127.0.0.1:3100/api/estados` renvoie du JSON avec `nombre` et `tipo` par service et sans `url` ; `Ctrl+C` enregistre `cierre` et `cerrado`.
- [ ] `PUERTO=hola npm run arrancar` se termine avec le code de sortie 1 et l'événement `configuracion-invalida`, sans ouvrir aucun port.

## Pour aller plus loin

- [Node.js: HTTP](https://nodejs.org/api/http.html) — documentation officielle de `createServer`, des requêtes, des réponses, de `listen` et de `close` ; consulté le 2 octobre 2026.

- [Node.js: Process](https://nodejs.org/api/process.html) — documentation officielle sur les signaux de processus, `SIGTERM` et le cycle de vie de Node ; consulté le 2 octobre 2026.

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — documentation officielle sur la réduction des unions discriminées, les vérifications de valeurs optionnelles et l'exhaustivité avec `never` ; consulté le 2 octobre 2026.

- [MDN : codes de réponse HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status) — référence sur les codes d'état HTTP et leur signification pour les clients et les serveurs ; consulté le 2 octobre 2026.

- [Sécurité des API pour le CTO : identité, passerelle et jetons, sans faire confiance aveuglément](https://www.habil.mx/fr/blog/securite-api-cto-identite-passerelle-jetons/) — article sur la raison pour laquelle un identifiant ne doit pas figurer dans l'URL (il se retrouve dans les journaux) et sur la façon dont chaque service vérifie que le jeton lui était destiné ; consulté le 6 octobre 2026.
