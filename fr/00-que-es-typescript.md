# Leçon 0 — Qu'est-ce que TypeScript, et ce qu'il n'est PAS

**Durée :** 90 min (ou 2 × 45)

**Ce que tu construis :** rien pour l'instant (lecture)

**Ce que tu apprends :** JS vs TS ; les types sont effacés à l'exécution ; ce qui est protégé et ce qui ne l'est pas ; pourquoi `strict`

## À la fin, tu seras capable de

- Expliquer la différence entre JavaScript et TypeScript sans dire qu'ils sont deux langages concurrents dans le navigateur.
- Compiler un fichier `.ts`, exécuter le JavaScript généré et reconnaître quelle information de types a disparu.
- Identifier une erreur que TypeScript peut arrêter avant l'exécution d'un programme.
- Identifier un cas où un type écrit en TypeScript ne suffit pas à protéger des données venues de l'extérieur.
- Expliquer pourquoi le cours utilise `strict` dès le départ.
- Lire et corriger les erreurs TS2345 et TS18048 du compilateur.

## Le pourquoi avant le comment

Le `revisor` que tu vas construire tout au long de ce cours interroge plusieurs services, rassemble leurs réponses et affiche un rapport. Même s'il paraît petit au début, il contient un problème qui se retrouve dans presque tous les systèmes : il y a des données dont la forme est celle attendue, et des données qui peuvent arriver avec une mauvaise forme. Un service doit avoir un nom, une URL et un état ; une réponse doit comporter un code HTTP ; le panneau doit recevoir le même rapport que celui produit par l'API. Si quelqu'un confond une URL avec un code numérique, écrit de travers le nom d'une propriété ou traite comme une réponse réussie un objet incomplet, le programme peut échouer tard : peut-être seulement quand une personne ouvrira le panneau, ou quand un service externe répondra d'une façon inhabituelle.

JavaScript permet d'écrire des programmes utiles avec très peu de barrières. Tu peux créer un objet, lui ajouter une propriété plus tard, passer une chaîne là où une autre fonction attendait un nombre et exécuter le fichier aussitôt. Cette souplesse est l'une de ses qualités : JavaScript sert à expérimenter, à automatiser des tâches, à construire des interfaces et à faire des changements rapides. Le coût apparaît quand le programme grandit, quand plusieurs personnes touchent au même code ou quand une fonction cesse d'être évidente par elle-même. L'éditeur ne peut plus savoir avec certitude quelles données reçoit une fonction, et tu finis par garder des règles importantes en mémoire, dans des commentaires ou dans l'espoir que les tests couvrent tous les chemins.

TypeScript ajoute une couche de vérification avant l'exécution. Cette couche décrit quelles valeurs une fonction peut recevoir, quelles propriétés un objet doit avoir et quels résultats une opération peut produire. Grâce à cette information, le compilateur vérifie que les pièces du programme s'emboîtent. Il n'attend pas que l'utilisateur tombe sur un écran cassé ni qu'une vraie requête arrive en production : il signale de nombreuses erreurs pendant que tu écris ou que tu compiles.

Le mot important est « nombreuses », pas « toutes ». TypeScript ne remplace pas les tests, ne transforme pas des données externes en données fiables et n'empêche pas à lui seul qu'une fonction contienne une mauvaise règle métier. Si le `revisor` considère qu'une réponse HTTP 500 signifie « service disponible », TypeScript peut vérifier que le code est un nombre, mais il ne peut pas deviner que ton critère opérationnel est faux. Les types décrivent la structure et les relations entre des valeurs ; ils ne connaissent pas automatiquement le monde que ces valeurs représentent.

Il convient aussi de dissiper dès la première leçon une confusion courante : TypeScript ne remplace pas JavaScript à l'exécution. Node, le navigateur et React exécutent du JavaScript. Le flux normal du cours consiste à écrire du TypeScript, à le vérifier avec `tsc` et à transformer le résultat en JavaScript avant de l'exécuter. Quand le `revisor` tournera, ses types `Servicio`, `Estado` et `Reporte` ne seront plus là en tant qu'objets que Node pourrait consulter. Cela a des conséquences importantes : une annotation peut éviter une erreur dans ton code, mais elle ne valide pas le JSON qui arrive par HTTP et ne modifie pas une valeur déjà incorrecte.

Node 24 LTS peut aussi exécuter directement un script `.ts` dont la syntaxe est effaçable. Dans ce cas, il remplace les types par des espaces et exécute le JavaScript restant : il ne vérifie pas les types, ne lit pas `tsconfig.json` et n'accepte pas la syntaxe qui génère du code, comme `enum`. Utilise-le, si cela t'arrange, pour un script isolé ; le `revisor` aura plusieurs fichiers et sera compilé avec `tsc` pour exécuter `dist/*.js`. La page de Node consacrée à TypeScript documente ce *type stripping*, ou effacement des types, et ses limites.

En Go, le compilateur vérifie lui aussi les types avant de créer l'exécutable. La différence pratique est qu'un programme Go se transforme en binaire natif, alors que TypeScript produit du JavaScript pour une plateforme qui existe déjà : Node ou le navigateur. La comparaison utile n'est pas de décider lequel « est le plus strict », mais de reconnaître une discipline commune : déclarer des contrats pour que les erreurs d'intégration apparaissent plus tôt. En Go, ces contrats s'écrivent avec les types du langage ; en TypeScript, ils s'écrivent par-dessus JavaScript et sont supprimés avant l'exécution.

C'est pourquoi le cours commence par une leçon de lecture. Avant d'apprendre la syntaxe, tu as besoin de savoir quelle promesse l'outil fait et laquelle il ne fait pas. Si tu t'attends à ce que TypeScript valide automatiquement un fichier de configuration, tu auras un faux sentiment de sécurité. Si tu crois qu'il se contente d'ajouter des annotations pénibles, tu désactiveras probablement les vérifications au moment précis où elles pourraient le plus t'aider. L'objectif est de l'utiliser pour ce qu'il est : un vérificateur statique qui rend visibles les contrats de ton programme et t'oblige à traiter les zones où ces contrats ne suffisent pas encore.

## Les concepts

### JavaScript reste le programme qui s'exécute

JavaScript est un langage dynamique. Cela signifie que ses valeurs sont inspectées pendant que le programme tourne. Une variable peut contenir une chaîne maintenant et, si tu la réassignes, contenir un nombre ensuite. Une fonction peut recevoir n'importe quelle valeur, sauf si tu écris toi-même des vérifications à l'exécution. JavaScript n'exige pas de déclarer tous les types parce que son modèle est conçu pour décider beaucoup de choses au moment de l'exécution.

Cela ne veut pas dire que JavaScript soit négligent ni qu'un programme JavaScript soit condamné à échouer. Tu peux écrire du JavaScript très clair, bien le tester et valider chaque entrée. Le problème est un problème d'échelle et de retour d'information. Si `mostrarEstado` doit recevoir l'un de deux états possibles, JavaScript ne te prévient pas quand tu écris `"disponble"` avec une lettre manquante. Le programme peut continuer à tourner et afficher une étiquette incorrecte, ou parcourir une branche que personne n'attendait. L'erreur reste cachée jusqu'à ce qu'un chemin précis la révèle.

TypeScript prend le même code JavaScript et permet d'en décrire les limites. Un type littéral comme `"disponible" | "falla"` exprime que n'importe quelle chaîne ne convient pas : seules ces deux-là conviennent. Quand une fonction accepte ce type, TypeScript compare chaque appel au contrat avant d'émettre le JavaScript. Il ne calcule pas l'état réel d'un service ; il vérifie que les parties de ton programme emploient le même vocabulaire.

```ts
// fig00_01.ts
type Estado = "disponible" | "falla";

function describir(estado: Estado): string {
  return estado === "disponible" ? "Servicio disponible" : "Servicio con falla";
}

console.log(describir("disponible"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_01.ts
$ node fig00_01.js
Servicio disponible
```

Le programme ressemble presque à du JavaScript. Les parties propres à TypeScript sont `type Estado`, l'union de littéraux et les annotations `: Estado` et `: string`. Le reste —la fonction, l'opérateur ternaire et `console.log`— est du JavaScript ordinaire. Cette continuité est un avantage pour qui programme déjà en JavaScript : tu ne repars pas de zéro et tu n'apprends pas un autre moteur d'exécution ; tu ajoutes une information que le compilateur et l'éditeur peuvent vérifier.

La valeur de cette information augmente quand le type est réutilisé. Si chaque fonction du `revisor` inventait ses propres chaînes pour décrire l'état, tu aurais vite `"ok"`, `"OK"`, `"disponible"` et `"funcionando"` pour une même idée. Toutes sont des chaînes valides pour JavaScript, mais toutes ne sont pas valides pour le rapport que tu veux construire. Un type partagé fixe un petit langage pour le projet. Plus tard, ce langage inclura des états avec détail, durée et code HTTP.

Dans le `revisor`, la même idée apparaît dès le plus petit modèle possible. Il ne s'agit pas encore d'interroger une URL ni d'ouvrir un serveur : il s'agit d'éviter que les fonctions qui traitent des résultats parlent des dialectes différents. Si `Estado` dit que les résultats peuvent être `"disponible"` ou `"falla"`, une fonction qui reçoit un service peut s'appuyer sur cette décision et un écran peut afficher les deux alternatives qui existent vraiment.

```ts
// fig00_02.ts
type Estado = "disponible" | "falla";

type Servicio = {
  nombre: string;
  estado: Estado;
};

function resumen(servicio: Servicio): string {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo: Servicio = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_02.ts
$ node fig00_02.js
[disponible] catálogo
```

Ici, TypeScript vérifie plusieurs relations à la fois. `catalogo` doit avoir `nombre` et `estado` ; `nombre` doit être une chaîne ; `estado` doit être l'un des deux littéraux autorisés ; et `resumen` n'accepte qu'un objet de cette forme. Le compilateur n'a pas besoin d'exécuter une requête réseau pour découvrir une contradiction : il la voit en comparant la valeur écrite avec le contrat `Servicio`.

Tu n'as pas besoin d'annoter chaque variable. TypeScript peut inférer de nombreux types à partir des valeurs. Par exemple, si tu écris `const nombre = "catálogo"`, le compilateur sait qu'il s'agit de texte. Les annotations ont plus de valeur aux bords d'une fonction, dans les données partagées entre modules et dans les décisions que tu veux transformer en contrat. Écrire `const nombre: string = "catálogo"` n'ajoute aucune information utile ; écrire `function resumen(servicio: Servicio): string` indique, lui, ce qui entre et ce qui sort.

L'inférence n'élimine pas non plus la nécessité de réfléchir. Le compilateur infère à partir du code disponible, pas à partir de l'intention que tu as oublié d'exprimer. Si une liste peut contenir des services disponibles et des services en échec, tu devras modéliser cette différence de façon explicite. Si une valeur peut manquer, tu devras l'admettre dans le type et la gérer. TypeScript réduit le travail mécanique consistant à répéter des types évidents pour que tu concentres ton attention sur les contrats qui changent le comportement du programme.

### Les types sont effacés avant l'exécution

Une annotation de type n'est pas une instruction pour Node. Quand tu compiles `fig00_02.ts`, le fichier généré conserve la fonction, l'objet et l'appel à `console.log`, mais supprime `type Estado`, `type Servicio`, `: Estado`, `: Servicio` et `: string`. Node n'a pas besoin de les comprendre parce qu'il ne les reçoit jamais.

Le JavaScript essentiel qui résulte de cet exemple ressemble à ceci :

```js
function resumen(servicio) {
  return `[${servicio.estado}] ${servicio.nombre}`;
}

const catalogo = {
  nombre: "catálogo",
  estado: "disponible",
};

console.log(resumen(catalogo));
```

Ce fragment ne contient aucune définition de `Servicio`. Il ne contient pas non plus de liste de valeurs valides pour `Estado`. La vérification a eu lieu pendant la compilation, avant que Node lise le fichier. C'est pourquoi on dit que les types de TypeScript sont effacés : ce sont des informations pour vérifier et développer le programme, pas des données qui accompagneraient automatiquement le programme pendant son exécution.

Cette décision a des avantages. Le JavaScript émis n'a pas besoin d'une bibliothèque de réflexion pour conserver les annotations. Le navigateur ne télécharge pas une représentation de chaque type du simple fait que le projet utilise TypeScript. Node peut exécuter le résultat comme n'importe quel autre module JavaScript. De plus, tu peux adopter TypeScript progressivement : beaucoup de code JavaScript valide peut cohabiter avec des fichiers `.ts` pendant que tu ajoutes des contrats là où il en faut.

Elle a aussi une conséquence que tu dois te répéter jusqu'à ce qu'elle devienne intuitive : écrire un type ne convertit pas une valeur. Si tu affirmes qu'une variable est un `number`, le compilateur vérifie les opérations dans le code TypeScript, mais le JavaScript émis ne transforme pas `"404"` en `404`. Si tu déclares qu'une propriété existe, Node ne crée pas cette propriété. Si un JSON reçu n'a pas de `url`, aucune annotation ne la fera apparaître. Les annotations décrivent une attente ; elles ne fabriquent ni ne corrigent des données.

C'est ce qui distingue les types de la validation. La validation s'exécute et décide quoi faire d'une valeur réelle : la rejeter, la corriger, la convertir ou renvoyer une erreur. Un type statique permet au compilateur de raisonner sur les valeurs que le programme considère déjà comme fiables. Les deux sont nécessaires, mais ils interviennent à des endroits différents. Dans ce cours, les types du modèle viendront d'abord ; la validation du JSON, des variables d'environnement et des réponses HTTP arrivera dans la leçon 6, quand tu auras bien compris pourquoi elle ne peut pas être automatique.

Le `revisor` aura des types partagés entre l'API et le panneau. Cela permet aux deux parties de s'accorder sur la forme d'un rapport pendant leur développement. Pourtant, quand le navigateur reçoit du JSON de l'API, il reçoit du JSON : du texte converti en objets JavaScript, pas une instance magique du type `Reporte`. L'API doit construire une réponse correcte et le panneau doit traiter la frontière réseau avec soin. Partager des types évite beaucoup de contradictions à l'intérieur du dépôt ; cela n'élimine pas la nécessité de valider une frontière.

L'effacement explique aussi pourquoi tu ne peux pas écrire quelque chose comme `if (servicio is Servicio)` avec un `type` de TypeScript. Le nom `Servicio` n'existe plus quand Node s'exécute. En revanche, tu peux vérifier des propriétés concrètes avec JavaScript, par exemple contrôler qu'une valeur est un objet, qu'elle a une propriété `nombre` de type chaîne et que son URL est elle aussi une chaîne. Cette vérification fera partie d'une fonction de validation, pas de la définition du type.

La règle pratique est simple : utilise les types pour exprimer des contrats entre le code que tu contrôles ; utilise la validation pour décider si tu acceptes des données qui arrivent de l'extérieur. Dans la vie réelle, il existe des zones grises, comme les données d'une bibliothèque externe ou des fichiers créés par une autre partie du même système. Si tu ne peux pas démontrer qu'une entrée respecte le contrat, traite-la comme non fiable jusqu'à ce que tu l'aies validée.

### TypeScript protège les contrats internes, pas la réalité extérieure

Le compilateur ne voit que le code qu'il reçoit et les types disponibles pour l'analyser. Il peut détecter que tu as passé un nombre à une fonction qui demande une chaîne. Il peut détecter que tu essaies d'utiliser une propriété inexistante sur un objet dont il connaît le type. Il peut détecter qu'une variable est peut-être `undefined`. Il ne peut pas ouvrir une connexion HTTP, vérifier qu'un fournisseur a respecté sa documentation, ni savoir si la configuration qu'un utilisateur a écrite hier a toujours le bon format aujourd'hui.

Le cas le plus dangereux pour les débutants est l'assertion de type avec `as`. Une expression comme `valor as Servicio` ne valide pas la valeur. Elle dit au compilateur : « à partir d'ici, fais-moi confiance, je sais que c'est un `Servicio` ». C'est parfois raisonnable quand tu as déjà fait une vérification que TypeScript n'a pas pu déduire. L'utiliser pour faire taire un doute sur des données externes, en revanche, revient à enlever la ceinture de sécurité parce que l'alarme sonne.

Pour isoler cette frontière, le `Servicio` de la figure suivante utilise une forme réduite, différente du `Servicio` avec `estado` de `fig00_02.ts` : il ne conserve ici que `nombre` et `url`. Le modèle complet et stable du `revisor` arrivera dans la leçon 3.

```ts
// fig00_03.ts
type Servicio = {
  nombre: string;
  url: string;
};

const servicio = JSON.parse(
  '{"nombre":"pagos","direccion":"https://pagos.example"}',
) as Servicio;

console.log(`${servicio.nombre}: ${servicio.url}`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_03.ts
$ node fig00_03.js
pagos: undefined
```

Le fichier compile sans erreur parce que l'assertion a obligé le compilateur à traiter le résultat comme un `Servicio`. Pourtant, le JSON contient `direccion`, pas `url`. À l'exécution, JavaScript cherche une propriété inexistante et produit `undefined`. Il n'y a pas de contradiction pour le runtime : les objets JavaScript peuvent ne pas avoir une propriété. La contradiction existe entre la promesse écrite avec `as Servicio` et la donnée réelle.

Cet exemple ne signifie pas que `JSON.parse` soit mauvais, ni que TypeScript soit inutile face au JSON. Il signifie que l'ordre correct compte. D'abord tu reçois une valeur dont tu ne connais pas la forme ; ensuite tu vérifies ses propriétés ; et seulement alors tu la convertis en une valeur que le reste du programme peut utiliser comme `Servicio`. TypeScript représente ce point de départ avec `unknown`, un type qui oblige à inspecter avant d'accéder aux propriétés. Tu l'étudieras plus en détail quand le `revisor` lira sa configuration et traitera des réponses distantes.

Il existe d'autres limites que tu dois aussi reconnaître. TypeScript ne sait pas si une URL pointe vers un vrai serveur. Il ne sait pas si un état `"disponible"` décrit correctement la santé d'un service. Il ne sait pas si deux requêtes arrivant en même temps modifient une ressource de manière incompatible. Il ne sait pas si un mot de passe a été exposé dans un journal. Il peut t'aider à modéliser les données pour que ces problèmes soient plus faciles à voir et à tester, mais les décisions de sécurité, de concurrence et de métier exigent de la conception, de la validation et des tests.

Le type peut aussi être mal conçu. Si tu déclares que `codigoHttp` est un `number`, tu accepteras `-5`, `999` et `3.14` du point de vue du type. Peut-être que le programme a seulement besoin de savoir que c'est un nombre ; peut-être que le domaine exige un entier entre 100 et 599. La seconde règle ne découle pas toute seule de `number`. Plus tard, tu décideras où représenter les contraintes du domaine : avec des unions de littéraux, des validateurs, des fonctions constructrices ou une combinaison de ces moyens.

Dans le `revisor`, les données que construisent tes propres fonctions forment une zone où TypeScript protège beaucoup. Si `crearReporte` reçoit des services déjà vérifiés et renvoie une structure connue, les types empêchent l'API et le panneau de diverger sur les noms de propriétés. La réponse qui arrive d'une URL configurée par une personne est une autre zone : le type partagé ne prouve pas que le serveur a livré le JSON promis. Cette frontière se valide avant de convertir les données en résultats internes.

Une bonne façon de penser le système est de tracer une ligne. Du côté interne, laisse `strict` être exigeant et évite de t'échapper avec `any` ou des assertions sans preuve. Aux frontières, admets que la valeur ne mérite pas encore confiance et valide-la. Le type ne cesse pas d'être une discipline parce que les données externes sont incertaines ; au contraire, il t'aide à désigner avec précision le moment où elles passent d'incertaines à utilisables.

### `strict` transforme les doutes fréquents en travail explicite

TypeScript a des options de compilation qui déterminent l'étendue de ses vérifications. Depuis TypeScript 6, `strict` vaut `true` par défaut ; TypeScript 7.0.2 part déjà de ces vérifications. Les commandes de cette leçon écrivent `--strict` pour rendre explicite la décision du cours, pas parce que le compilateur en aurait besoin pour l'activer. Qui utilise `--strict false` désactive ces vérifications délibérément. Cette souplesse sert à une migration soigneusement circonscrite, mais ce n'est pas le meilleur point de départ pour un nouveau projet.

L'option `strict` active un ensemble de vérifications strictes. Parmi les plus visibles, `noImplicitAny`, qui empêche des valeurs sans type de devenir silencieusement `any`, et `strictNullChecks`, qui distingue une valeur présente d'une valeur pouvant être `null` ou `undefined`. Cet ensemble peut s'étoffer dans les futures versions de TypeScript ; c'est pourquoi il vaut mieux activer l'option générale que mémoriser une liste d'indicateurs isolés.

Dans un cours qui part de zéro, `strict` n'est ni une punition ni une façon d'écrire plus de texte. C'est une décision pour découvrir tôt les endroits où ton programme n'a pas exprimé quelque chose d'important. Si une fonction accepte un détail qui peut manquer, cette absence fait partie de son contrat. Si un paramètre n'a pas de type, tu as peut-être oublié de décider quelle sorte de valeurs il supporte. Si le compilateur t'oblige à le régler, il évite que quelqu'un d'autre doive le deviner plus tard.

```ts
// fig00_04.ts
function etiquetaDetalle(detalle: string | undefined): string {
  if (detalle === undefined) {
    return "sin detalle";
  }

  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
console.log(etiquetaDetalle("200 OK"));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_04.ts
$ node fig00_04.js
sin detalle
200 OK
```

La fonction ne fait pas semblant que `detalle` existe toujours. Elle déclare `string | undefined`, examine le cas absent et n'appelle `toUpperCase()` que lorsque TypeScript peut démontrer qu'il reste une chaîne. Cette réduction des possibilités s'appelle *narrowing* (affinage de type) : après la condition, le type est plus précis. Tu n'as pas besoin de mémoriser le terme aujourd'hui ; en revanche, tu dois prendre l'habitude de traiter le cas que le contrat dit pouvoir se produire.

Dans le `revisor`, les détails d'une défaillance peuvent manquer. Un service pourrait répondre avec un code HTTP sans texte supplémentaire ; une connexion pourrait se terminer avant de produire une réponse ; une configuration pourrait omettre une étiquette facultative. Si tu modélises tout en `string`, le programme te laisse l'utiliser comme s'il y avait toujours du contenu. Avec `strictNullChecks`, le type conserve la différence entre « il y a un texte, même vide » et « aucun texte n'a été obtenu ». Cette différence améliore à la fois les messages du panneau et la logique de diagnostic.

`strict` ne promet pas que tu n'écriras jamais d'assertion ni que tous les cas seront évidents. Il y aura des intégrations avec des bibliothèques, des API du navigateur ou des données externes où tu devras faire une vérification concrète. La différence est que l'échappatoire sera délibérée et localisée. Sans `strict`, les doutes se propagent : un `any` entre par une fonction, passe par cinq autres et à la fin n'importe quel accès aux propriétés semble valide. Retrouver l'origine coûte alors beaucoup plus cher.

Certains activent les vérifications strictes à la fin, quand le projet compte déjà des milliers de lignes. Cela transforme souvent l'adoption en un nettoyage pénible : beaucoup de décisions en suspens apparaissent à la fois, et la pression de livrer pousse à désactiver des règles ou à remplir le code de `as any`. Commencer en mode strict garde le coût faible. Chaque nouvelle fonction règle ses contrats à sa naissance, et chaque nouveau type reste disponible pour les fonctions qui viendront ensuite.

Go enseigne une leçon semblable : le compilateur ne te laisse pas ignorer beaucoup d'incompatibilités que d'autres langages découvrent tard. TypeScript garde la souplesse de JavaScript parce qu'il peut s'adopter petit à petit, mais ce cours choisira la voie la plus exigeante pour le code nouveau. L'intention n'est pas de faire « gagner » le compilateur dans une discussion, mais de transformer des ambiguïtés réelles en décisions visibles.

Quand tu créeras `tsconfig.json` dans la leçon 1, `strict` fera partie de la configuration de base. À partir de là, une erreur de types ne se corrige pas en retirant l'option. Elle se corrige en clarifiant le contrat : en annotant une entrée, en vérifiant une valeur qui peut manquer, en séparant des états distincts ou en validant une donnée externe. Cette pratique sera l'une des bases du `revisor`.

## L'erreur que tu vas voir

La première erreur apparaît quand un appel contredit le type qu'une fonction a déclaré. Le programme suivant demande une URL sous forme de chaîne, mais reçoit un nombre. `tsc` 7.0.2 n'a pas besoin d'exécuter le fichier pour détecter le problème.

```ts
// fig00_05.ts
function consultarServicio(url: string): void {
  console.log(url);
}

consultarServicio(404);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_05.ts
fig00_05.ts(6,19): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

TS2345 signifie que la valeur d'un argument ne peut pas être affectée au type du paramètre correspondant. Le nombre `404` peut être un code HTTP, mais ce n'est pas une URL. La correction n'est pas de convertir n'importe quelle donnée en chaîne pour faire taire l'erreur. Décide d'abord ce que représente la fonction : si elle interroge une adresse, elle reçoit une chaîne comme `"https://pagos.example"` ; si elle traite un code HTTP, crée une autre fonction dont le paramètre est un nombre. L'erreur a révélé que deux concepts distincts avaient été mélangés.

La deuxième erreur est une conséquence directe de `strictNullChecks`. Le type accepte une chaîne ou `undefined`, mais le programme essaie de l'utiliser comme si c'était toujours une chaîne.

```ts
// fig00_06.ts
function etiquetaDetalle(detalle: string | undefined): string {
  return detalle.toUpperCase();
}

console.log(etiquetaDetalle(undefined));
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig00_06.ts
fig00_06.ts(3,10): error TS18048: 'detalle' is possibly 'undefined'.
```

TS18048 signifie que le compilateur a trouvé un chemin valide où `detalle` n'a pas de valeur. Si ce JavaScript s'exécutait avec `undefined`, tenter de lire `toUpperCase` produirait une erreur d'exécution. La correction consiste à gérer l'absence avant d'utiliser la chaîne, comme l'a fait `fig00_04.ts`, ou à changer le contrat pour que la fonction ne reçoive `string` que lorsque cette garantie existe vraiment.

Les messages de TypeScript sont des indices, pas des instructions mécaniques. Une erreur peut se résoudre par une condition, par un type mieux conçu, par une validation ou par une autre fonction. La question utile n'est pas « comment faire disparaître TS18048 ? », mais « cette donnée peut-elle manquer d'après les règles du programme ? ». Si la réponse est oui, gère le cas. Si la réponse est non, trouve où manque la validation qui devrait le garantir.

Rappelle-toi aussi que, selon la configuration, TypeScript peut émettre du JavaScript même lorsqu'il a signalé une erreur. Le compilateur est pensé pour qu'une migration progressive n'arrête pas d'emblée un projet JavaScript existant. Dans le `revisor`, les erreurs de compilation seront traitées comme des défaillances à corriger avant de considérer un changement comme terminé. La leçon 1 configurera le projet pour rendre cette politique explicite.

## Ce qui se fait de travers

- Utiliser `any` pour supprimer une erreur. `any` désactive de nombreuses vérifications précisément sur la valeur où tu avais le plus besoin d'information. Il apparaît parfois en intégrant du code existant, mais il ne doit pas être la sortie automatique. Préfère `unknown` quand la valeur vient de l'extérieur, et réduis peu à peu son type au moyen de validations.

- Écrire `as Servicio` sur des données de JSON, de HTTP ou de variables d'environnement. Une assertion n'inspecte pas la valeur ; elle change seulement ce que TypeScript suppose à son sujet. Sans validation préalable, tu peux produire le même `undefined` que `fig00_03.ts`, sous une apparence trompeuse de sécurité.

- Croire que TypeScript remplace les tests. Les types détectent des incompatibilités structurelles, mais ils ne prouvent pas qu'une requête arrive au bon serveur, qu'un délai d'attente (timeout) fonctionne ou qu'un rapport trie les services comme l'utilisateur l'a demandé. Utilise les types pour fermer une classe d'erreurs et les tests pour observer le comportement réel.

- Désactiver `strict` quand plusieurs messages apparaissent. Les erreurs révèlent normalement une décision en attente : un paramètre sans contrat, une donnée facultative traitée comme obligatoire ou une limite externe non validée. Désactiver la règle cache le travail, mais n'élimine pas l'ambiguïté du programme.

- Tout annoter absolument. TypeScript infère avec précision les types simples. Répéter `const nombre: string = "pagos"` ajoute du bruit sans renforcer aucune limite. Garde les annotations pour les contrats publics, les paramètres, les résultats pertinents et les modèles partagés comme `Servicio`.

- Confondre un type avec une règle métier. `codigoHttp: number` ne garantit pas qu'un nombre corresponde à une réponse HTTP valide. Les types expriment une partie du domaine ; les règles restantes demandent de la validation, des tests et des décisions explicites.

## Exercices

### Exercice 1 — Séparer les concepts

Lis l'appel `consultarServicio(404)` de `fig00_05.ts`. Écris deux phrases : l'une qui explique pourquoi TS2345 a raison et l'autre qui propose une valeur correcte pour une fonction qui reçoit une URL. Écris ensuite une seconde signature de fonction adaptée au traitement d'un code HTTP numérique.

### Exercice 2 — Détecter une fausse promesse

Pars du JSON de `fig00_03.ts`. Sans exécuter le programme, identifie la propriété qui ne correspond pas à `Servicio` et prédis la sortie exacte de `console.log`. Explique pourquoi `as Servicio` a permis la compilation alors que l'objet n'a pas la forme attendue.

### Exercice 3 — Rendre l'absence explicite

Modifie mentalement `fig00_06.ts` pour qu'il renvoie `"sin detalle"` quand il reçoit `undefined` et convertisse en majuscules une chaîne présente. Écris quelle doit être la sortie pour `undefined` et pour `"tiempo agotado"`. Compare-la ensuite avec la solution.

### Exercice 4 — Du type à la limite du système

Le `revisor` lit une liste de services depuis une source externe. Explique où tu placerais chaque responsabilité : le type `Servicio`, la validation du fait que `nombre` et `url` sont des chaînes, et la vérification que l'URL répond. Justifie pourquoi aucune des trois ne remplace les deux autres.

## Solutions

### Solution 1

TS2345 a raison parce que `404` est un nombre et que la fonction a déclaré avoir besoin d'une chaîne nommée `url`. Une valeur correcte pour cette fonction pourrait être `"https://pagos.example"`. Si l'intention était de travailler avec le code, une signature adaptée serait `function describirCodigoHttp(codigo: number): string`. Séparer les fonctions évite que le même paramètre représente deux idées distinctes.

### Solution 2

La propriété incorrecte est `direccion` ; le type `Servicio` attend `url`. La sortie est `pagos: undefined`. L'assertion `as Servicio` n'a pas comparé l'objet au type ni ajouté la propriété manquante ; elle a indiqué au compilateur de faire confiance à une affirmation que le programme n'a pas vérifiée. Le runtime ne voit qu'un objet JavaScript avec `nombre` et `direccion`.

### Solution 3

La fonction doit examiner le cas absent avant d'appeler `toUpperCase()`. Pour `undefined`, la sortie doit être `sin detalle`. Pour `"tiempo agotado"`, la sortie doit être `TIEMPO AGOTADO`. La solution complète suit le même schéma que `fig00_04.ts` : une condition règle l'absence et, après elle, TypeScript sait que la valeur restante est une chaîne.

### Solution 4

Le type `Servicio` appartient au code interne partagé par les parties du `revisor` : il exprime qu'un service utilisable a un `nombre` et une `url` de type chaîne. La validation appartient à l'endroit précis où la liste entre dans le système : elle reçoit une valeur encore incertaine, vérifie ses propriétés et rejette ou signale une donnée invalide. La vérification que l'URL répond appartient à l'opération réseau, parce qu'une chaîne ayant la forme d'une URL peut pointer vers un serveur inexistant, lent ou qui répond en échec. Le type ordonne le code ; la validation protège la frontière ; la requête observe l'état réel du service.

## Comment savoir que j'ai réussi

Tu peux considérer cette leçon comme terminée quand tu remplis ces vérifications :

- [ ] Tu peux exécuter `npx tsc --version` et obtenir `Version 7.0.2`.

- [ ] Tu peux exécuter `node --version` et obtenir une version qui commence par `v24`.

- [ ] En copiant `fig00_01.ts`, en le compilant avec `npx tsc --strict --target ES2022 --module nodenext fig00_01.ts` et en exécutant `node fig00_01.js`, tu obtiens exactement `Servicio disponible`.

- [ ] En compilant `fig00_05.ts` avec la même commande, tu obtiens TS2345 et tu n'essaies pas de l'exécuter comme s'il s'agissait d'un programme correct.

- [ ] Tu peux expliquer pourquoi `fig00_03.ts` affiche `undefined` alors qu'il compile sans erreur.

- [ ] Tu peux corriger `fig00_06.ts` sans retirer `strict` et sans changer le type pour faire semblant que `undefined` ne peut jamais arriver.

- [ ] Tu peux dire, sans consulter cette leçon, que TypeScript vérifie avant d'exécuter, émet du JavaScript et ne valide pas à lui seul les données externes.

## Pour aller plus loin

- [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) — documentation officielle de TypeScript ; consulté le 2 octobre 2026.

- [TSConfig: strict](https://www.typescriptlang.org/tsconfig/strict.html) — documentation officielle de l'option `strict` ; consulté le 2 octobre 2026.

- [Node.js: TypeScript](https://nodejs.org/api/typescript.html) — documentation officielle de Node sur l'exécution et la prise en charge liées à TypeScript ; consulté le 2 octobre 2026.

- [MDN : TypeScript](https://developer.mozilla.org/fr/docs/Glossary/TypeScript) — définition et contexte de TypeScript dans MDN ; consulté le 2 octobre 2026.
