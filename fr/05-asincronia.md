# Leçon 5 — Asynchronisme : qu'il vérifie tout à la fois

**Durée :** 2 × 45 min

**Ce que tu construis :** le `revisor` concurrent

**Ce que tu apprends :** *event loop* (boucle d'événements), promesses, `async/await`, `Promise.all` vs `allSettled`, `AbortController` et délais limites

## À la fin, tu seras capable de

- Expliquer l'ordre d'exécution entre le code synchrone, les microtâches de promesses et les tâches comme les minuteurs.
- Écrire une fonction `async` dont le contrat de sortie est `Promise<Estado>`.
- Exécuter les requêtes de plusieurs services de façon concurrente et conserver l'ordre de la configuration dans le rapport.
- Choisir entre `Promise.all` et `Promise.allSettled` selon la politique d'échecs du rapport.
- Appliquer un délai limite avec `AbortController`, propager son signal et distinguer une annulation d'un autre échec.
- Corriger TS2322 en transformant les résultats de `Promise.allSettled` en états du domaine.

## Le pourquoi avant le comment

Jusqu'à la leçon précédente, le `revisor` sait ce qu'est un `Servicio` et comment représenter un `Estado` : un résultat disponible apporte un code HTTP et une durée ; un échec apporte un détail. Pourtant, les fonctions que nous avons écrites jusqu'ici pourraient interroger chaque service l'un après l'autre. Cet ordre est facile à imaginer, mais c'est une décision coûteuse quand l'opération principale consiste à attendre une réponse réseau.

Suppose qu'il y ait trois services : catálogo, pagos et inventario. Si chaque requête dure environ une seconde et que tu les fais en série, le rapport se termine environ trois secondes plus tard. Pendant que le programme attend catálogo, il n'a pas besoin d'occuper le CPU pour continuer à attendre. Pourtant, une implémentation séquentielle décide de ne pas démarrer pagos avant que catálogo ne soit terminé, et de ne pas démarrer inventario avant que pagos ne soit terminé. L'attente s'accumule alors que les trois requêtes sont indépendantes.

La concurrence tire parti précisément de cette indépendance. Le `revisor` peut lancer les trois requêtes, laisser Node traiter d'autres événements pendant que les réponses arrivent et rassembler les résultats à la fin. Cela ne signifie pas que le programme exécute trois instructions JavaScript simultanément dans le même fil. Cela signifie qu'il peut avoir plusieurs opérations en attente, normalement d'entrée-sortie, sans se bloquer à les attendre une par une. Si la requête la plus lente dure une seconde, le rapport concurrent dure environ cette seconde, plus le petit travail d'organisation de ses résultats.

Cette différence ressemble à la concurrence de Go, mais l'outil mental n'est pas le même. En Go, tu peux lancer des goroutines et les coordonner avec des canaux, des groupes d'attente et des contextes. Dans Node, le code JavaScript ordinaire d'un processus s'exécute principalement dans un seul fil et le système d'exécution coordonne les opérations asynchrones au moyen de l'*event loop*, des promesses et des files de travail. Tu n'as pas besoin de gérer des fils pour la plupart des requêtes HTTP ; tu dois exprimer ce qui se passe quand une opération se termine, échoue ou est annulée.

Le mot « concurrent » ne signifie pas non plus « sans limite ». Tout lancer à la fois peut être correct pour une petite liste de services indépendants, mais ce serait irresponsable de le faire sans réfléchir face à des milliers de cibles, une base de données avec peu de connexions ou un fournisseur qui impose des limites de requêtes. Dans cette leçon, l'ensemble est la liste contrôlée du `revisor`. Plus tard, quand le projet recevra de la configuration et traitera du HTTP, tu pourras décider d'une limite de concurrence à partir de données réelles.

Le deuxième problème est plus important que la vitesse : un échec ne devrait pas t'empêcher de connaître les autres. Si pagos ne répond pas, le rapport reste utile s'il indique que catálogo est disponible et qu'inventario a épuisé son délai limite. Un rapport de santé n'a généralement pas besoin de la politique « si une requête échoue, efface tous les résultats » ; il doit enregistrer chaque résultat séparément. Cette politique détermine si tu utiliseras `Promise.all`, `Promise.allSettled` ou une combinaison des deux.

Enfin, attendre sans limite est une autre sorte d'erreur. Un service distant peut devenir lent, une connexion peut perdre des paquets et une cible peut accepter la connexion sans terminer sa réponse. Si le `revisor` ne définit pas de limite, une seule requête peut laisser toute l'exécution en suspens. Le `timeoutMs` de `Servicio`, qui n'était jusqu'ici qu'une partie du modèle, devient une règle qui doit affecter l'exécution. `AbortController` est le mécanisme standard pour communiquer : « cette opération ne doit plus continuer ».

L'objectif de la leçon n'est pas de mémoriser le mot `await`. C'est de concevoir un contrat de vérification qui puisse se terminer de trois manières claires : disponible, échec normal ou échec par délai limite. Quand cette décision apparaît dans le type et dans la fonction qui coordonne les promesses, le rapport reste complet même quand une partie du système a des problèmes.

## Les concepts

### L'*event loop* : terminer une instruction avant de s'occuper de la chose suivante en attente

JavaScript exécute d'abord le code synchrone qu'il a devant lui. Si une fonction appelle `console.log`, l'affichage a lieu avant que le programme ne passe à la ligne suivante. Quand le code lance une opération asynchrone, comme un minuteur, une lecture de fichier ou une requête réseau, il enregistre une continuation pour plus tard et laisse le fil continuer à travailler. Il ne tourne pas en rond et ne bloque pas le processus en demandant sans cesse si la réponse est arrivée.

L'*event loop* est le mécanisme qui coordonne ces continuations. Quand la pile d'appels est libre, Node peut prendre du travail dans ses files et exécuter le bloc de JavaScript suivant. Les promesses résolues programment des microtâches ; les minuteurs programment des tâches ultérieures. La conséquence visible est qu'une microtâche en attente est traitée avant un minuteur déjà prêt, même si le minuteur a été enregistré avant.

```ts
// fig05_01.ts
console.log("inicio síncrono");

setTimeout(() => {
  console.log("tarea de temporizador");
}, 0);

Promise.resolve().then(() => {
  console.log("microtarea de promesa");
});

console.log("fin síncrono");
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_01.ts
$ node fig05_01.js
inicio síncrono
fin síncrono
microtarea de promesa
tarea de temporizador
```

Le `0` du minuteur ne veut pas dire « exécute-le maintenant ». Il veut dire « ne l'exécute pas avant qu'au moins ce tour du travail en cours soit terminé ». C'est pourquoi `fin síncrono` apparaît en premier. La continuation de `Promise.resolve().then(...)` ne s'exécute pas non plus dans la même ligne qui l'a créée : elle reste en attente comme microtâche et est traitée après le code synchrone, avant de passer à la tâche du minuteur.

Ne fais pas de cet ordre une formule pour contrôler le programme avec une précision d'horloge. L'ordre entre microtâches et tâches est bien une règle utile ; la durée concrète d'une requête réseau, d'un minuteur ou d'une opération du système d'exploitation ne l'est pas. Un programme correct ne dépend pas du fait qu'une réponse arrive « en moins de dix millisecondes » sur ton ordinateur. Il dépend du fait de réagir correctement quand la réponse arrive, échoue ou est annulée.

Dans le `revisor`, une requête HTTP lance un travail qui se poursuivra en dehors du code JavaScript immédiat. Quand la fonction appelle `fetch`, elle n'obtient pas le corps de la réponse de façon synchrone. Elle obtient une promesse et permet au processus de continuer à lancer d'autres requêtes. Quand une réponse est prête, la continuation associée à cette promesse entre dans le travail en attente que l'*event loop* pourra traiter.

Cela explique une différence importante avec une fonction ordinaire. Une fonction synchrone renvoie une valeur terminée, comme `string` ou `Estado`. Une fonction qui doit attendre un réseau renvoie une promesse de cette valeur. Le travail n'est pas achevé au retour de l'appel ; il est représenté par un objet qui promet un résultat futur.

### Promesses et `async`/`await` : rendre visible qu'un résultat arrivera plus tard

Une `Promise<T>` représente une opération qui finit par se terminer avec une valeur de type `T` ou par être rejetée avec une raison. La promesse ne garantit pas que tout s'est bien passé : elle garantit qu'il y aura un dénouement. Une promesse peut être en attente, tenue ou rejetée. Si elle est tenue, elle contient la valeur attendue ; si elle est rejetée, elle exprime que l'opération n'a pas pu la produire.

Le mot `async` change le contrat d'une fonction. Si une fonction est marquée `async`, elle renvoie toujours une promesse, même quand tu écris `return "listo"` à l'intérieur. Dans ce cas, son type est `Promise<string>`, pas `string`. `await` attend le dénouement d'une promesse à l'intérieur d'une fonction `async` ; si elle est tenue, il produit sa valeur. Si elle est rejetée, `await` lance cette raison comme une exception à cet endroit.

Les figures 05_02 à 05_07 utilisent `await` au niveau supérieur. Exécute-les dans le dossier `figuras/` que tu as créé dans la leçon 1, dont le `package.json` contient `{ "type": "module" }` ; ainsi `--module nodenext` les traite comme des modules ESM. Sans cette configuration, TypeScript rejette le `await` de niveau supérieur.

```ts
// fig05_02.ts
async function obtenerEtiqueta(): Promise<string> {
  const nombre = await Promise.resolve("catálogo");
  return `revisando ${nombre}`;
}

const etiqueta = await obtenerEtiqueta();
console.log(etiqueta);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_02.ts
$ node fig05_02.js
revisando catálogo
```

Le `await` ne transforme pas une opération asynchrone en opération synchrone. Il permet seulement d'écrire la continuation sous une forme proche du code séquentiel. Pendant que `obtenerEtiqueta` attend la promesse, la fonction est suspendue ; elle n'arrête pas l'*event loop* et n'empêche pas les autres opérations en attente d'avancer. Quand la promesse est tenue, la fonction reprend son exécution et résout sa propre promesse avec la chaîne finale.

Une confusion courante est de penser que `await` doit être utilisé à chaque appel d'une fonction asynchrone. Il doit être utilisé quand tu as besoin de la valeur avant de continuer sur cette branche. Si tu veux d'abord lancer plusieurs requêtes puis attendre toutes, mettre `await` à l'intérieur de chaque tour d'une boucle les rend séquentielles. La position de `await` décrit une dépendance : si l'opération suivante dépend du résultat précédent, attends ; si elle n'en dépend pas, lance-la et coordonne-la ensuite.

Dans le `revisor`, le contrat naturel d'une vérification individuelle est `Promise<Estado>`. La fonction ne peut pas renvoyer immédiatement un `Estado` terminé parce qu'elle ne sait pas encore si le service répondra. Elle promet en revanche de fournir un état quand la requête se terminera ou quand elle aura converti un échec en résultat du domaine.

```ts
// fig05_03.ts
interface Servicio {
  readonly nombre: string;
}

type Estado = {
  servicio: Servicio;
  tipo: "disponible";
};

async function revisarUno(servicio: Servicio): Promise<Estado> {
  await Promise.resolve();
  return {
    servicio,
    tipo: "disponible",
  };
}

const estado = await revisarUno({ nombre: "catálogo" });
console.log(`${estado.servicio.nombre}: ${estado.tipo}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_03.ts
$ node fig05_03.js
catálogo: disponible
```

L'annotation `Promise<Estado>` compte parce qu'elle documente la frontière temporelle de la fonction. Celui qui appelle `revisarUno` sait qu'il ne peut pas lire `estado.tipo` directement depuis l'appel. Il doit utiliser `await`, `then` ou confier la promesse à un coordinateur. TypeScript ne sait pas combien de temps un réseau mettra, mais il peut t'empêcher de confondre une promesse en attente avec l'état qu'elle produira.

En Go, une fonction qui interroge un service peut renvoyer une valeur et une `error` une fois que la goroutine ou la fonction a terminé. En TypeScript, une fonction asynchrone exprime cette attente à l'intérieur de `Promise`. Les deux options obligent à modéliser l'échec ; la différence est qu'en TypeScript, le résultat futur fait explicitement partie du type de retour.

### `Promise.all` : tout lancer et attendre l'ensemble

`Promise.all` reçoit un itérable de promesses et renvoie une nouvelle promesse. Elle est tenue quand toutes les promesses sont tenues, avec un tableau de valeurs dans le même ordre que l'entrée. Ce dernier point est utile pour le `revisor` : les réponses peuvent se terminer dans n'importe quel ordre, mais le rapport peut conserver l'ordre dans lequel la personne a configuré les services.

Si l'une des promesses est rejetée, `Promise.all` est rejetée dès qu'elle connaît ce rejet. Les autres opérations ne sont pas annulées automatiquement ; elles peuvent continuer à travailler. Ce qui change, c'est le résultat de la promesse coordinatrice : il n'y aura plus de tableau complet de valeurs. Cette politique convient quand chaque partie est indispensable, par exemple en chargeant trois fichiers nécessaires pour construire une seule configuration valide.

```ts
// fig05_04.ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const servicios = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(servicios.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_04.ts
$ node fig05_04.js
catálogo: disponible
pagos: disponible
inventario: disponible
```

Le `map(consultar)` appelle `consultar` une fois pour chaque nom sans attendre à l'intérieur de la boucle. Le résultat est un tableau de promesses, et `Promise.all` attend l'ensemble. Si tu écris ceci :

```ts
for (const servicio of servicios) {
  const resultado = await consultar(servicio);
  console.log(resultado);
}
```

les requêtes se feraient l'une après l'autre. Ce n'est pas toujours incorrect : ce serait adapté si la deuxième requête avait besoin d'un identifiant obtenu par la première. Mais pour des services indépendants, ce serait une attente cumulée sans bénéfice.

Dans le `revisor`, `Promise.all` peut bien être l'outil adéquat même si chaque service peut échouer. La clé est de convertir chaque échec individuel en une valeur `EstadoFalla` dans `revisarUno`. La promesse individuelle n'est alors pas rejetée pour un échec prévu : elle est tenue avec un état qui décrit cet échec. Le coordinateur peut utiliser `Promise.all` parce que tous les chemins normaux produisent un élément du rapport.

Cette séparation clarifie les responsabilités. `revisarUno` décide comment traduire une exception réseau, une annulation ou une réponse invalide en `EstadoFalla`. `revisarTodos` ne fait que coordonner une collection de `Promise<Estado>`. Le rapport reçoit toujours une liste d'états et n'a pas besoin de connaître les exceptions techniques de chaque service.

### `Promise.allSettled` : conserver chaque dénouement avant de décider ce qu'il signifie

`Promise.allSettled` attend elle aussi l'ensemble complet, mais n'est pas rejetée si une promesse individuelle échoue. Elle renvoie un tableau d'objets discriminés. Chaque objet a `status: "fulfilled"` et `value`, ou `status: "rejected"` et `reason`. C'est un outil utile quand la coordination doit observer tous les dénouements techniques, même si certaines opérations n'ont pas fini par produire une valeur.

```ts
// fig05_05.ts
function tareas(): Promise<string>[] {
  return [
    Promise.resolve("catálogo"),
    Promise.reject(new Error("conexión rechazada")),
    Promise.resolve("inventario"),
  ];
}

try {
  await Promise.all(tareas());
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(`Promise.all: ${error.message}`);
  }
}

const resultados = await Promise.allSettled(tareas());

for (const resultado of resultados) {
  if (resultado.status === "fulfilled") {
    console.log(`${resultado.value}: disponible`);
  } else if (resultado.reason instanceof Error) {
    console.log(`pagos: falla (${resultado.reason.message})`);
  }
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_05.ts
$ node fig05_05.js
Promise.all: conexión rechazada
catálogo: disponible
pagos: falla (conexión rechazada)
inventario: disponible
```

La seconde collection de tâches est intentionnelle. Une promesse a déjà un dénouement ; elle ne « redémarre » pas quand on l'attend à nouveau. La fonction `tareas` crée un nouvel ensemble pour démontrer séparément la politique de `all` et celle de `allSettled`.

Remarque aussi le *narrowing*. TypeScript ne permet pas de lire `resultado.value` sans vérifier que `status` vaut `"fulfilled"`, parce que les résultats rejetés n'ont pas cette propriété. De façon équivalente, `reason` appartient au cas rejeté. C'est le même principe que les unions discriminées de la leçon 3, appliqué à un type de la bibliothèque standard.

`Promise.allSettled` n'est pas automatiquement meilleure. Elle a un coût conceptuel : le coordinateur connaît maintenant des détails de promesses qui auraient peut-être dû être convertis plus tôt dans le vocabulaire du domaine. Pour le `revisor`, utilise-la si tu as réellement besoin de distinguer « la fonction de vérification a produit un état » de « la fonction elle-même a eu une défaillance inattendue ». Si tous les échecs attendus sont déjà transformés en `EstadoFalla`, `Promise.all` rend le contrat plus petit et plus direct.

En Go, une collection de goroutines peut envoyer chaque résultat par un canal et le coordinateur décide s'il s'interrompt à la première erreur ou s'il attend tout le monde. `Promise.all` et `Promise.allSettled` offrent des politiques équivalentes pour une collection d'opérations asynchrones. Aucune ne remplace la conception du résultat : tu dois décider si l'erreur est une donnée du rapport ou une condition qui invalide toute l'opération.

### `AbortController` et délais limites : annuler est une décision explicite

Un délai limite n'est pas une promesse qu'une opération se terminera vite. C'est la décision de cesser de l'attendre quand elle franchit une limite. Pour appliquer cette décision, il te faut deux éléments : quelque chose qui programme l'annulation et une opération qui écoute le signal d'annulation. `AbortController` produit un `AbortSignal` ; la fonction coordinatrice conserve le contrôleur et remet le signal à l'opération.

Quand tu appelles `controller.abort(razon)`, `signal.aborted` passe à `true` et les consommateurs du signal reçoivent l'événement d'annulation. Des API comme `fetch` acceptent `signal` pour interrompre une requête en attente. Tes propres fonctions asynchrones peuvent aussi accepter le signal et rejeter leur promesse quand il est annulé.

```ts
// fig05_06.ts
function esperarCancelacion(signal: AbortSignal): Promise<void> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

async function conLimite(): Promise<void> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, 0);

  try {
    await esperarCancelacion(controlador.signal);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  } finally {
    clearTimeout(temporizador);
  }
}

await conLimite();
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_06.ts
$ node fig05_06.js
tiempo límite
```

Le `finally` n'est pas de la décoration. Si la requête se termine avant le délai limite, tu dois nettoyer le minuteur pour qu'il n'annule pas une opération déjà terminée ni ne garde du travail inutile en attente. De même, ne crée pas un contrôleur unique pour tous les services si chaque `timeoutMs` est indépendant. L'annulation d'inventario ne doit pas interrompre catálogo par accident.

La raison de l'annulation mérite d'être convertie en un détail lisible. Un `AbortSignal` communique que quelque chose a été annulé, mais le rapport doit décider si c'était à cause de la limite, d'un arrêt propre ou d'une annulation demandée ailleurs. Dans cette leçon, une annulation par limite se convertit en `EstadoFalla` avec `detalle: "tiempo límite"` ; plus tard, le modèle pourra ajouter une variante spécifique si le domaine a besoin de la distinguer visuellement.

Dans le `revisor`, le signal traverse le contrat de la fonction qui fait la requête. Il est important de ne pas le cacher dans une variable globale ni de le créer à un endroit que la fonction de requête ne peut pas observer. Celui qui lance la vérification possède le contrôleur ; celui qui fait un travail annulable reçoit le signal.

```ts
// fig05_07.ts
interface Servicio {
  readonly nombre: string;
  readonly timeoutMs: number;
}

type EstadoDisponible = {
  servicio: Servicio;
  tipo: "disponible";
  codigoHttp: number;
  duracionMs: number;
};

type EstadoFalla = {
  servicio: Servicio;
  tipo: "falla";
  detalle: string;
};

type Estado = EstadoDisponible | EstadoFalla;

type Consultar = (
  servicio: Servicio,
  signal: AbortSignal,
) => Promise<{ codigoHttp: number; duracionMs: number }>;

function esperarAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolver, rechazar) => {
    signal.addEventListener(
      "abort",
      () => rechazar(signal.reason),
      { once: true },
    );
  });
}

const consultarDePrueba: Consultar = async (servicio, signal) => {
  if (servicio.nombre === "catálogo") {
    return { codigoHttp: 200, duracionMs: 0 };
  }

  if (servicio.nombre === "pagos") {
    throw new Error("conexión rechazada");
  }

  return esperarAbort(signal);
};

async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

async function revisarTodos(
  servicios: readonly Servicio[],
  consultar: Consultar,
): Promise<Estado[]> {
  return Promise.all(
    servicios.map((servicio) => revisarUno(servicio, consultar)),
  );
}

function lineaReporte(estado: Estado): string {
  if (estado.tipo === "disponible") {
    return `${estado.servicio.nombre}: HTTP ${estado.codigoHttp}`;
  }

  return `${estado.servicio.nombre}: falla (${estado.detalle})`;
}

const estados = await revisarTodos(
  [
    { nombre: "catálogo", timeoutMs: 100 },
    { nombre: "pagos", timeoutMs: 100 },
    { nombre: "inventario", timeoutMs: 0 },
  ],
  consultarDePrueba,
);

for (const estado of estados) {
  console.log(lineaReporte(estado));
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_07.ts
$ node fig05_07.js
catálogo: HTTP 200
pagos: falla (conexión rechazada)
inventario: falla (tiempo límite)
```

L'exemple utilise une fonction de requête remplaçable pour séparer la coordination des détails de transport. Il n'ouvre pas de vraies connexions et ne mesure pas de vraies durées ; c'est pourquoi la requête de test renvoie `duracionMs: 0` et que cette donnée n'apparaît pas dans la sortie. Ici, `Servicio` est volontairement simplifié à `nombre` et `timeoutMs` : il n'a pas encore besoin de `url`. Le contrat `Consultar` fournit déjà `codigoHttp` et `duracionMs`, afin que l'implémentation ultérieure puisse mesurer une vraie requête HTTP et que la leçon 8 puisse brancher le transport sans changer le contrat du rapport. La politique concurrente ne change pas : chaque service reçoit son propre signal, traduit son dénouement en `Estado` et le coordinateur attend toutes les vérifications.

## L'erreur que tu vas voir

`Promise.allSettled` ne renvoie pas directement le type de valeur des promesses. Elle renvoie `PromiseSettledResult<T>[]`, parce qu'elle doit représenter à la fois les accomplissements et les rejets. Si tu essaies de l'affecter à `Estado[]`, TypeScript produit TS2322.

```ts
// fig05_08.ts
type Estado = {
  tipo: "disponible";
};

async function revisar(): Promise<Estado[]> {
  const tareas: Promise<Estado>[] = [];
  const resultados: Estado[] = await Promise.allSettled(tareas);
  return resultados;
}
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig05_08.ts
fig05_08.ts(8,9): error TS2322: Type 'PromiseSettledResult<Estado>[]' is not assignable to type 'Estado[]'.
  Type 'PromiseSettledResult<Estado>' is not assignable to type 'Estado'.
    Property 'tipo' is missing in type 'PromiseFulfilledResult<Estado>' but required in type 'Estado'.
```

TS2322 signifie que tu essaies d'affecter un type à un autre incompatible. Avec TypeScript 7.0.2, le diagnostic signale d'abord que même le cas tenu est une enveloppe `PromiseFulfilledResult<Estado>` et non un `Estado` : il lui manque directement `tipo`. Le cas rejeté a, quant à lui, `status` et `reason`. La solution n'est pas une assertion comme `as Estado[]`, parce que cela effacerait la décision qui reste à prendre. Tu dois parcourir les résultats, vérifier `status` et convertir chaque cas en l'état qui convient.

```ts
const resultados = await Promise.allSettled(tareas);

return resultados.map((resultado, indice): Estado => {
  if (resultado.status === "fulfilled") {
    return resultado.value;
  }

  return {
    servicio: servicios[indice],
    tipo: "falla",
    detalle: "la revisión no terminó",
  };
});
```

Cette solution oblige à décider à quel service correspond le résultat rejeté. C'est pourquoi il convient de préserver le tableau de `servicios` et de ne pas dépendre de l'ordre de terminaison. Elle montre aussi pourquoi, quand `revisarUno` convertit déjà ses propres échecs en `EstadoFalla`, il peut être plus clair d'utiliser `Promise.all` : le résultat coordonné a déjà le type final du rapport.

Une autre erreur fréquente n'a pas de code TypeScript : oublier d'attraper le rejet d'une promesse. Dans Node, un rejet non traité peut terminer le processus ou produire un avertissement selon le mode d'exécution. Ne le corrige pas en ajoutant un `catch(() => {})` qui efface l'information. Attrape la raison et convertis-la en un échec que le rapport puisse expliquer, ou relance-la si elle doit vraiment arrêter toute l'exécution.

## Ce qui se fait de travers

- **Mettre `await` dans une boucle pour des opérations indépendantes.** Le code paraît ordonné, mais chaque requête attend la précédente. Crée d'abord le tableau de promesses, puis utilise `Promise.all` ou `Promise.allSettled` pour les coordonner.

- **Utiliser `Promise.all` en espérant un rapport partiel automatique.** `Promise.all` rejette au premier rejet observé. Les autres opérations peuvent rester actives, mais leur résultat cesse d'être disponible via cette promesse coordinatrice. Utilise `allSettled` ou convertis l'échec individuel en `EstadoFalla`.

- **Utiliser `Promise.allSettled` par habitude.** Elle peut cacher qu'une fonction individuelle n'a pas correctement défini son contrat d'erreur. Si toute vérification doit se terminer en `Estado`, traduis l'erreur dans `revisarUno` et utilise `Promise.all` pour exprimer que l'ensemble produit toujours des états.

- **Confondre concurrence et parallélisme.** Plusieurs requêtes peuvent être en attente en même temps sans que JavaScript exécute plusieurs parties de ta fonction simultanément. Le bénéfice vient du fait de ne pas bloquer le fil pendant que tu attends des entrées-sorties, pas d'une promesse de plus de CPU.

- **Attendre avec `setTimeout` pour « laisser du temps » à une promesse.** Un minuteur ne prouve pas qu'une opération est terminée et ne synchronise pas correctement les résultats. Attends la promesse qui représente le travail ; n'utilise un minuteur que comme partie explicite d'un délai limite.

- **Créer un `AbortController` sans passer `signal` à l'opération.** Appeler `abort()` n'arrête pas magiquement n'importe quel code. L'opération doit accepter et observer le signal, comme `fetch` ou une fonction à toi qui enregistre l'événement `abort`.

- **Ne pas nettoyer le minuteur dans `finally`.** Si l'opération se termine vite, le minuteur reste en attente et peut annuler plus tard ou garder le processus en vie. `clearTimeout` doit s'exécuter aussi bien en cas de succès que d'échec.

- **Convertir n'importe quelle erreur en texte avec une assertion.** Dans `catch`, la valeur est `unknown` avec `strict`. Vérifie `error instanceof Error` avant de lire `message` ; pour les autres valeurs, utilise un détail sûr et choisi consciemment.

- **Mesurer la durée avec des valeurs inventées en production.** L'exemple utilise `0` pour que sa sortie soit déterministe. L'implémentation réelle doit mesurer autour de l'opération et décider quelle unité et quelle précision aura `duracionMs`.

## Exercices

### Exercice 1 — Deux requêtes sans attente cumulée

Écris `consultar(nombre): Promise<string>` en utilisant `Promise.resolve`. Reçois les noms `catálogo`, `pagos` et `inventario`, lance les trois requêtes avec `map` et utilise `Promise.all` pour afficher le résultat de chacune dans l'ordre de la liste. Ensuite, réécris le programme avec un `for...of` et `await` à l'intérieur de la boucle ; explique pourquoi cette seconde version serait séquentielle si la fonction effectuait une vraie requête réseau.

### Exercice 2 — Un rapport qui conserve les échecs

Crée trois tâches : une tenue pour catálogo, une rejetée avec `new Error("sin conexión")` pour pagos et une tenue pour inventario. Utilise `Promise.allSettled` pour les convertir en un tableau d'`Estado`. Chaque résultat doit avoir `tipo: "disponible"` ou `tipo: "falla"` et conserver le nom du service. N'utilise pas `as Estado[]`.

### Exercice 3 — Délai limite par service

Définis `Consultar` comme `(servicio: Servicio, signal: AbortSignal) => Promise<{ codigoHttp: number; duracionMs: number }>` et utilise-le dans `revisarUno(servicio, consultar)`. Ajoute un `AbortController`, un minuteur fondé sur `servicio.timeoutMs` et un bloc `finally` qui nettoie le minuteur. Écris une requête de test qui se résout pour catálogo et attend le signal d'annulation pour inventario. Le rapport doit montrer catálogo disponible et inventario avec un échec dont le détail est `tiempo límite`.

### Exercice 4 — Politique du coordinateur

Implémente deux coordinateurs pour la même liste de services. Le premier doit utiliser `Promise.all` sur une version de `revisarUno` qui convertit toujours les échecs prévus en `EstadoFalla`. Le second doit utiliser `Promise.allSettled` sur une fonction qui peut être rejetée. Décris, en un paragraphe, lequel tu utiliserais pour le rapport principal du `revisor` et quelle condition concrète te ferait choisir l'autre.

## Solutions

### Solution 1

L'essentiel est de séparer le lancement des opérations de l'attente de leurs valeurs. `map` produit toutes les promesses avant que `Promise.all` n'attende le tableau complet.

```ts
async function consultar(nombre: string): Promise<string> {
  return Promise.resolve(`${nombre}: disponible`);
}

const nombres = ["catálogo", "pagos", "inventario"];
const resultados = await Promise.all(nombres.map(consultar));

for (const resultado of resultados) {
  console.log(resultado);
}
```

Avec un vrai réseau, `await consultar(nombre)` à l'intérieur de la boucle empêcherait de lancer pagos tant que catálogo est en attente. Le résultat pourrait sembler identique, mais le temps total cumulerait les attentes.

### Solution 2

La solution doit réduire chaque `PromiseSettledResult` avec son discriminant `status`. Le tableau `servicios` conserve le service associé à chaque position.

```ts
const estados = resultados.map((resultado, indice): Estado => {
  const servicio = servicios[indice];

  if (resultado.status === "fulfilled") {
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: resultado.value.codigoHttp,
      duracionMs: resultado.value.duracionMs,
    };
  }

  return {
    servicio,
    tipo: "falla",
    detalle:
      resultado.reason instanceof Error
        ? resultado.reason.message
        : "falla desconocida",
  };
});
```

Il n'y a pas de conversion automatique d'un résultat rejeté en `EstadoFalla`. Cette traduction est une décision du domaine et doit être écrite explicitement.

### Solution 3

Chaque appel a besoin de son propre contrôleur et de son propre minuteur. Le signal est remis à la fonction qui peut être annulée ; le bloc `finally` nettoie la ressource temporaire quel que soit le chemin.

```ts
async function revisarUno(
  servicio: Servicio,
  consultar: Consultar,
): Promise<Estado> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort(new Error("tiempo límite"));
  }, servicio.timeoutMs);

  try {
    const respuesta = await consultar(servicio, controlador.signal);
    return {
      servicio,
      tipo: "disponible",
      codigoHttp: respuesta.codigoHttp,
      duracionMs: respuesta.duracionMs,
    };
  } catch (error: unknown) {
    return {
      servicio,
      tipo: "falla",
      detalle: error instanceof Error ? error.message : "falla desconocida",
    };
  } finally {
    clearTimeout(temporizador);
  }
}
```

La fonction renvoie un `Estado` même quand la requête ne répond pas. Cela permet au coordinateur du rapport d'utiliser `Promise.all` sans perdre les autres résultats.

### Solution 4

Pour le rapport principal, j'utiliserais `Promise.all` sur des vérifications qui convertissent les échecs prévus en `EstadoFalla`. Le résultat a un contrat uniforme : une vérification pour chaque service configuré, dans le même ordre, sans exceptions techniques que le panneau devrait interpréter.

J'utiliserais `Promise.allSettled` quand une couche inférieure pourrait rejeter pour des raisons qui ont encore besoin d'un diagnostic séparé, par exemple un lot de tâches d'initialisation où je dois enregistrer lesquelles n'ont même pas réussi à créer un état. Dans ce cas, le coordinateur doit transformer explicitement chaque rejet avant de remettre des données au reste du programme.

## Comment savoir que j'ai réussi

- [ ] `node --version` commence par `v24`.
- [ ] `npx tsc --version` affiche `Version 7.0.2`.
- [ ] En compilant et en exécutant `fig05_01.ts`, les lignes apparaissent dans cet ordre : code synchrone initial, code synchrone final, microtâche de promesse et tâche de minuteur.
- [ ] En compilant et en exécutant `fig05_05.ts`, un échec de pagos apparaît sans empêcher catálogo et inventario de s'afficher comme disponibles.
- [ ] En compilant et en exécutant `fig05_07.ts`, la sortie contient exactement une ligne pour catálogo, pagos et inventario, avec l'échec par délai limite pour inventario.
- [ ] En compilant `fig05_08.ts`, tu obtiens TS2322 sur l'affectation de `Promise.allSettled` à `Estado[]` et tu peux expliquer pourquoi une assertion n'est pas une correction.
- [ ] Tu peux indiquer où l'`AbortSignal` d'une vérification est créé, où il est propagé et où il est consommé.

## Pour aller plus loin

- [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) — documentation officielle sur les contrats de fonctions et les types de retour ; consulté le 2 octobre 2026.

- [Node.js: `AbortController` et `AbortSignal`](https://nodejs.org/api/globals.html#class-abortcontroller) — documentation officielle des API globales d'annulation dans Node ; consulté le 2 octobre 2026.

- [MDN : `Promise.allSettled()`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) — référence sur les résultats tenus et rejetés d'une collection de promesses ; consulté le 2 octobre 2026.

- [MDN : modèle d'exécution de JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Execution_model) — explication de l'*event loop*, de la pile d'appels et des files de travail ; consulté le 2 octobre 2026.
