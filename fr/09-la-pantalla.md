# Leçon 9 — L'écran et le programme terminé

**Durée :** 2 × 45 min

**Ce que tu construis :** le panneau web et le paquet final

**Ce que tu apprends :** React avec TypeScript, hooks, types partagés front–back, sécurité de base (XSS), compiler et publier

## À la fin, tu seras capable de

- Écrire des composants React dans des fichiers `.tsx` avec des propriétés typées et une union discriminée du `revisor`.
- Utiliser `useState` et `useEffect` pour charger des données depuis l'API avec des états de chargement et d'erreur, et annuler la requête quand le composant disparaît.
- Partager entre le serveur et le navigateur un même contrat, avec son type et sa validation à l'exécution, sans traîner de code Node jusqu'à l'écran.
- Reconnaître une insertion de HTML non assaini, expliquer pourquoi elle ouvre une vulnérabilité XSS et la bloquer avec le type, avec ESLint et avec une politique de sécurité du contenu.
- Empaqueter le panneau avec esbuild et le servir depuis le même processus que l'API.
- Tester le panneau dans un vrai DOM et le paquet complet contre le serveur, et dire honnêtement ce que chaque test a vérifié et ce que seul un navigateur peut vérifier.
- Préparer l'artefact qui est publié : ce qu'il contient, ce qu'il ne contient pas et comment on l'installe sans dépendances de développement.

## Le pourquoi avant le comment

Jusqu'à la leçon précédente, le `revisor` fait déjà le travail difficile : il valide une configuration, interroge de vrais services de façon concurrente, représente les échecs comme des données, expose une API HTTP et s'arrête avec ordre. Pourtant, une réponse JSON reste une interface pensée pour un autre programme. Une personne qui a besoin de savoir si `pagos` est en échec peut ouvrir la route, lire une longue structure et chercher à l'œil les champs importants. Cela sert à diagnostiquer ; ce n'est pas un bon écran d'exploitation.

Le panneau remplace la question « quelles données le système possède-t-il ? » par « de quoi quelqu'un a-t-il besoin pour prendre une décision ? ». Un rapport doit montrer d'abord le nom du service, s'il est disponible ou en échec, et la donnée qui explique cette conclusion : code HTTP et durée pour une réponse disponible, détail pour un échec. Il doit dire quand il est encore en cours de chargement et ce qui s'est passé quand le chargement a échoué, parce qu'un écran qui reste blanc ne distingue pas « il n'y a pas de services » de « je n'ai pas pu demander ». Et il doit se mettre à jour tout seul, parce qu'un rapport de disponibilité qui devient périmé est pire que pas de rapport.

React aide à décrire cet écran sous forme de composants. Un **composant** est une fonction qui reçoit des propriétés et renvoie une description d'interface. React se charge de convertir cette description en éléments du navigateur et de les mettre à jour quand les données changent. Cela ne remplace pas les règles construites dans les leçons précédentes : le panneau doit consommer un contrat déjà décidé, pas inventer de son côté quels codes sont des succès, ce que signifie un délai limite ni comment la configuration est validée.

Ce contrat existe déjà. La leçon 8 a séparé le modèle interne du public : le serveur a besoin d'un `Servicio` complet, avec `nombre`, `url` et `timeoutMs`, pour faire des requêtes, et un `Estado` interne conserve ce service parce que la logique de vérification en a besoin. Le navigateur n'a besoin que de `ReportePublico`, qui ne porte ni l'URL ni le délai limite. Cette leçon tire parti de ce que cette séparation a préparé : `src/contrato.ts` n'importe rien de Node, donc le même fichier, avec son type et sa validation, voyage jusqu'au navigateur avec le panneau. Partager des types ne veut pas dire tout partager ; cela veut dire partager ce qui traverse réellement la frontière, et le partager une seule fois pour que le serveur et l'écran ne puissent pas diverger sans que le compilateur le remarque.

Cela réduit une classe de désaccords, mais n'élimine pas la frontière réseau. Les types TypeScript sont effacés avant l'exécution, comme tu l'as vu dans la leçon 0 : le navigateur reçoit des octets de JSON, pas une instance vivante de `ReportePublico`. C'est pourquoi le panneau utilise le même patron que la leçon 6 : ce qui arrive par `fetch` est `unknown` jusqu'à ce que `esReportePublico` démontre le contraire. Le type partagé dit ce que le panneau attend ; la validation vérifie que ce qui est reçu le respecte. Sans le premier, le serveur et le panneau se désynchronisent en silence ; sans la seconde, un proxy qui renvoie une page d'erreur avec le code 200 fait que l'écran compile, démarre et échoue ensuite.

L'écran introduit aussi un risque qui n'existe pas quand on affiche dans la console : le navigateur interprète le HTML. Le `detalle` d'un échec peut contenir du texte qui vient d'un service distant, d'une configuration ou d'une personne. Si ce texte est inséré comme HTML, il peut fermer une balise, créer de nouveaux éléments ou tenter d'exécuter du code dans le contexte de celui qui a ouvert le panneau. Cette famille de vulnérabilités s'appelle **XSS**, pour *cross-site scripting*. Ce n'est pas un problème de « texte bizarre » : c'est un problème de confusion entre des données et des instructions pour le navigateur, et c'est l'une des failles les plus répétées du web.

En Go, la séparation ressemble à la construction d'une structure spécifique pour une réponse HTTP et à sa remise à un modèle (template) avec échappement automatique. L'idée ne dépend pas du langage : le modèle interne contient ce dont le programme a besoin pour fonctionner ; le modèle public ne contient que le nécessaire pour communiquer le résultat ; et le texte venu de l'extérieur n'est jamais traité comme du code. TypeScript apporte un avantage quand le serveur et l'écran vivent dans le même dépôt : le contrat peut être nommé une fois et vérifié des deux côtés avant l'exécution.

Enfin, le produit terminé n'est pas seulement du code qui a belle allure sur ton ordinateur. Il comprend une manière reproductible de le construire, des dépendances enregistrées, une sortie que l'on peut inspecter et une configuration sûre pour le démarrer. Publier, ce n'est pas copier à l'aveugle tout le répertoire ni envoyer des secrets avec le code : c'est générer un artefact connu, vérifier ce qu'il contient, n'installer que ce qui est nécessaire pour exécuter et déployer avec des limites claires de réseau, d'origine et de configuration. À la fin de la leçon, le `revisor` est complet : un seul processus Node qui vérifie les services de `servicios.json`, répond à `GET /api/estados` et sert le panneau qui consomme cette réponse.

Cette leçon conserve, comme la 8, la structure du projet : entrée `src/main.ts`, `rootDir` `./src`, `outDir` `./dist`, et les scripts `compilar`, `verificar`, `arrancar`, `probar`, `lint` et `formato`, avec un nouveau script, `empaquetar`. Ce qui s'installe de nouveau est expliqué en son temps : React, un empaqueteur (esbuild) et un DOM de test (jsdom). Les figures d'un seul fichier s'exécutent dans le dossier `figuras/` de la leçon 1 ; elles ont seulement besoin que tu y installes les mêmes dépendances que celles du projet.

```bash
cd ~/proyectos/figuras
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@29.1.1 @types/jsdom@28.0.3
```

## Les concepts

### Composants et JSX : une fonction qui décrit une partie de l'écran

JSX ressemble à du HTML à l'intérieur de TypeScript, mais ce n'est pas une chaîne de HTML que le navigateur reçoit telle quelle. C'est une syntaxe que TypeScript transforme en appels à React. C'est pourquoi le fichier doit se terminer en `.tsx` et la compilation doit activer `--jsx react-jsx`. Ce mode utilise le *runtime* automatique de React : tu n'as pas besoin d'importer un identifiant appelé `React` simplement pour que JSX compile, même si tu importes bien les valeurs concrètes que tu utilises, comme les hooks.

Un composant de fonction reçoit un objet de propriétés, normalement déstructuré dans ses paramètres, et renvoie du JSX. Les propriétés sont un contrat, comme les paramètres de n'importe quelle autre fonction. Si une ligne a besoin d'un état, le type de la propriété doit le dire. Ne la déclare pas comme `unknown`, `any` ou un objet avec des propriétés optionnelles simplement pour « faire dessiner l'écran » : cela reporterait sur l'écran une incertitude que le modèle a déjà résolue.

Le programme suivant utilise le même patron d'union discriminée que la leçon 3. La ligne traite `disponible` et `falla` séparément : dans la première branche, elle peut lire `codigoHttp` ; dans la seconde, `detalle`. Il n'est pas nécessaire de demander si les champs existent ni de remplir le modèle de propriétés optionnelles ambiguës. Dans cette figure, `EstadoPublico` est simplifié par rapport au contrat réel du projet : il ne porte pas `duracionMs`, pour que l'exemple soit court.

```tsx
// fig09_01.tsx
import { renderToStaticMarkup } from "react-dom/server";

type EstadoPublico =
  | {
      readonly nombre: string;
      readonly tipo: "disponible";
      readonly codigoHttp: number;
    }
  | {
      readonly nombre: string;
      readonly tipo: "falla";
      readonly detalle: string;
    };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li>
        <strong>{estado.nombre}</strong> disponible: HTTP {estado.codigoHttp}
      </li>
    );
  }

  return (
    <li>
      <strong>{estado.nombre}</strong> falla: {estado.detalle}
    </li>
  );
}

const pantalla = renderToStaticMarkup(
  <ul>
    <FilaEstado estado={{ nombre: "catálogo", tipo: "disponible", codigoHttp: 200 }} />
    <FilaEstado estado={{ nombre: "pagos", tipo: "falla", detalle: "tiempo límite" }} />
  </ul>,
);

console.log(pantalla);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_01.tsx
$ node fig09_01.js
<ul><li><strong>catálogo</strong> disponible: HTTP 200</li><li><strong>pagos</strong> falla: tiempo límite</li></ul>
```

`renderToStaticMarkup` convertit un composant en chaîne de HTML sans avoir besoin d'un navigateur. **Rendre** (faire le rendu), c'est cela : convertir la description que renvoie le composant en HTML ou en éléments visibles. Ici, cela sert à voir ce que produit le composant avec des données contrôlées. Cela n'ajoute aucune interactivité : il génère du HTML statique, sans état et sans effets, et ce n'est donc pas ce qu'utilise le panneau final. Le fait qu'un composant puisse être exécuté ainsi, comme une fonction quelconque, est justement ce qui le rend facile à tester.

Les composants n'ont pas besoin d'être des classes. Une fonction avec des propriétés typées est une pièce ordinaire de TypeScript : on peut l'extraire, la tester et la lire sans apprendre de hiérarchie spéciale. React se charge d'interpréter le JSX renvoyé. La comparaison avec Go n'est pas littérale, parce que Go n'a pas de JSX, mais la séparation est bien familière : une fonction de présentation reçoit une structure déjà valide et produit une représentation pour celui qui la consomme.

Dans le `revisor`, la division est petite. `Panel` demande les données et décide quel écran convient selon le chargement ; `Contenido` choisit entre chargement, erreur et liste ; `FilaEstado` reçoit un `EstadoPublico` et le dessine. Aucun ne décide quelle route HTTP existe, ne lit des variables d'environnement ni ne sait quels codes HTTP signifient « disponible » : cela, le serveur l'a déjà décidé, et cela arrive dans le champ `tipo`.

### Hooks : état et effets

Un composant qui ne fait que dessiner des données reçues est le cas facile. Le panneau a besoin de plus : demander des données à l'API, attendre, afficher « Cargando… », le remplacer par la liste à l'arrivée, afficher une erreur si l'API échoue, et recommencer de temps en temps. Pour cela, React offre les **hooks**, des fonctions dont le nom commence par `use` et qui relient un composant aux capacités de React. Il y en a deux dont tu as besoin maintenant.

`useState` donne de la mémoire au composant. `const [total, establecerTotal] = useState<number | undefined>(undefined)` déclare une valeur, `total`, que React conserve entre les rendus, et une fonction, `establecerTotal`, qui la change. Appeler cette fonction ne modifie pas la variable sur le moment : cela demande à React de réexécuter le composant avec la nouvelle valeur. Le type entre chevrons décrit quelles valeurs il admet ; avec une union discriminée, le type de l'état dit exactement quels écrans existent.

`useEffect` exécute un travail qui n'est pas du dessin. Dessiner doit être une fonction pure des propriétés et de l'état ; demander des données à un réseau, programmer un minuteur ou s'abonner à quelque chose est un **effet**, et doit se faire après que React a dessiné, pas pendant. `useEffect(() => { ... }, [])` reçoit une fonction et une liste de dépendances. La fonction s'exécute après le premier rendu ; si elle renvoie une autre fonction, cette fonction de nettoyage s'exécute quand le composant disparaît ou quand une dépendance change, avant de répéter l'effet. La liste de dépendances est la partie où l'on se trompe le plus : elle dit de quelles valeurs dépend l'effet, et React ne le répète que lorsque l'une d'elles change. Une liste vide signifie « seulement au montage ».

La figure suivante est le plus petit exemple qui montre le cycle complet. Un composant demande, au moyen d'un effet, un nombre qui met 10 ms à arriver ; entre-temps, il affiche « Cargando… » ; à l'arrivée, il le stocke dans l'état et React le redessine. Pour l'exécuter dans Node, sans navigateur, la figure crée un document simulé avec jsdom, une implémentation de DOM écrite en JavaScript, et l'installe comme `document` et `window` globaux ; React l'utilise comme s'il s'agissait de celui du navigateur. `act` est l'outil de React pour les tests : il exécute le code qui provoque des changements, attend que React ait fini de les appliquer et ne rend la main qu'ensuite, de sorte que ce que tu lis ensuite est ce que verrait une personne.

```tsx
// fig09_02.tsx
import { JSDOM } from "jsdom";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const dom = new JSDOM('<!doctype html><div id="raiz"></div>');

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

function contarServicios(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(2), 10));
}

function Resumen() {
  const [total, establecerTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    void contarServicios().then(establecerTotal);
  }, []);

  return <p>{total === undefined ? "Cargando…" : `${total} servicios`}</p>;
}

const raiz = dom.window.document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz");
}

const arbol = createRoot(raiz);

await act(async () => {
  arbol.render(<Resumen />);
});
console.log(`primer render: ${raiz.innerHTML}`);

await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
});
console.log(`tras el efecto: ${raiz.innerHTML}`);

await act(async () => {
  arbol.unmount();
});
dom.window.close();
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_02.tsx
$ node fig09_02.js
primer render: <p>Cargando…</p>
tras el efecto: <p>2 servicios</p>
```

Trois choses se voient dans cette sortie. Le premier rendu affiche « Cargando… » parce que l'état initial est `undefined`. L'effet a commencé après ce rendu, pas avant. Et quand la promesse s'est résolue, `establecerTotal(2)` a provoqué un second rendu avec la nouvelle valeur. Observe aussi ce que la figure ne fait pas : elle n'utilise pas `setTimeout` dans le composant et n'appelle pas `contarServicios()` dans le corps de la fonction. Si tu l'appelais dans le corps, il s'exécuterait à chaque rendu, et comme chaque réponse change l'état et provoque un autre rendu, tu aurais une boucle de requêtes.

Il y a un piège qu'il convient de nommer maintenant. Un effet qui demande des données peut se terminer après que le composant n'existe plus : la personne a changé d'écran ou, dans les tests, tu as démonté l'arbre. Si la réponse arrive alors et appelle `establecerTotal`, tu essaies de mettre à jour un composant qui n'est plus là. La défense est le nettoyage de l'effet : le panneau crée un `AbortController` dans chaque effet, remet son signal à `fetch` et l'interrompt dans la fonction de nettoyage, exactement le mécanisme d'annulation que tu connais depuis la leçon 5, qui remplit maintenant une tâche nouvelle. Et quand la requête est interrompue, le `catch` le reconnaît avec `control.signal.aborted` et n'écrit aucun état d'erreur : être annulé n'est pas un échec.

### Types partagés : un contrat, deux côtés

La leçon 8 a créé `src/contrato.ts` avec trois pièces : le type `EstadoPublico`, le type `ReportePublico` et la garde `esReportePublico`. Le serveur les utilise pour construire sa réponse (`aReportePublico` renvoie un `ReportePublico`) et le panneau les utilise pour la recevoir. C'est la forme concrète des « types partagés front–back » : ni un paquet publié, ni un outil de génération de code, mais un fichier du même projet que les deux côtés importent.

Deux règles font que cela fonctionne. La première : le fichier partagé ne contient que ce qui a du sens dans les deux environnements. `contrato.ts` n'importe que `esRegistro` de `configuracion.ts`, une fonction pure sans dépendances de Node. S'il importait `node:fs` ou `node:http`, l'empaqueteur essaierait de l'amener dans le navigateur, qui n'a pas ces modules, et l'empaquetage échouerait ou, pire, produirait un paquet cassé. Le mot « partagé » n'autorise pas à partager du code qui ne sert que dans Node, ni à ce que le navigateur traîne des fonctions qui lisent des fichiers ou des secrets. Partage des types et des transformations pures ; laisse les frontières du réseau, du disque et de l'environnement dans leurs couches.

La seconde règle : ce qui est partagé, c'est le contrat public, pas le modèle interne. Si le panneau importait `Estado`, avec son `Servicio`, le serveur devrait sérialiser l'URL de chaque service pour que la réponse respecte ce type, ou le panneau resterait convaincu de recevoir des données que le réseau ne transporte pas en réalité ; dans les deux cas, le type interne dicterait ce qui est publié. Si quelqu'un remplace `duracionMs` par `duracion` dans `contrato.ts`, TypeScript signalera à la fois le convertisseur du serveur, `aEstadoPublico`, et la ligne du panneau qui lit l'ancien champ. C'est cela, le bénéfice : le désaccord est détecté à la compilation, pas en voyant un écran vide en production.

Malgré tout, un type ne valide rien à l'exécution. Quand le navigateur reçoit le corps de `GET /api/estados`, `await respuesta.json()` fournit une valeur venant d'une frontière externe, et la tentation est d'écrire ceci :

```ts
const reporte = (await respuesta.json()) as ReportePublico;
```

L'assertion n'inspecte pas la réponse. Si une ancienne version de l'API renvoie `codigo` au lieu de `codigoHttp`, ou si un proxy renvoie une page HTML avec le code 200, l'écran compile et échoue ensuite. Le panneau conserve la pratique de la leçon 6 : il reçoit `unknown`, appelle `esReportePublico` et ne produit un `ReportePublico` qu'ensuite. Avant d'analyser, il vérifie en outre le code HTTP : une réponse `503` peut contenir du JSON valide et ne pas être le rapport que le panneau attendait. **Analyser** (parser), c'est transformer une représentation sérialisée, comme un texte JSON, en valeurs JavaScript, que tu dois encore valider. Ne convertis pas une réponse non réussie en liste vide : cela ferait paraître une défaillance de l'API comme « tout va bien, mais il n'y a pas de services ».

Cette validation a lieu une fois, dans `cargar.ts`, à côté de l'appel HTTP. `Panel` ne reçoit pas `unknown` et ne demande pas si `reporte.estados` est un tableau. Un composant qui fait de la validation réseau, du tri, du formatage et du JSX à la fois finit par être difficile à tester et à lire. La couche qui obtient les données répond à « la réponse respecte-t-elle le contrat ? » ; le panneau répond à « comment affiche-t-on un contrat déjà fiable ? ». Et cette séparation ouvre une porte que tu utiliseras dans les tests : `Panel` ne sait pas d'où viennent les données ; il reçoit une fonction `cargar`, de sorte qu'un test lui remet une fonction contrôlée et que le programme réel lui remet `cargarReporte`.

### XSS : un texte externe ne doit pas devenir des instructions

XSS se produit quand des données qu'une autre partie contrôle finissent interprétées comme du HTML ou du JavaScript dans une page. Un échec semble avoir une origine innocente : un service distant renvoie un texte d'erreur, le `revisor` le conserve comme `detalle` et le panneau l'affiche. Mais ce texte est écrit par celui qui contrôle le service distant, et ce pourrait être `<img src=x onerror=alert(1)>`. Si le panneau insère cette chaîne comme HTML, le navigateur crée un élément `img`, l'image ne se charge pas et l'attribut `onerror` exécute du code dans la page, avec les permissions de celui qui l'a ouverte.

La défense principale est de maintenir le bon type sémantique. Un détail est du texte ; il doit donc être un enfant de JSX, comme `{detalle}`. React le traite comme du texte et échappe les caractères qui signifient quelque chose pour HTML : `<` devient `&lt;`, `>` devient `&gt;`, `&` devient `&amp;`. La figure suivante le démontre : bien que l'entrée contienne une balise, la sortie contient `&lt;` et `&gt;`, que le navigateur affiche comme des caractères visibles au lieu de les interpréter comme une image.

```tsx
// fig09_03.tsx
import { renderToStaticMarkup } from "react-dom/server";

function Detalle({ texto }: { readonly texto: string }) {
  return <p>{texto}</p>;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<Detalle texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_03.tsx
$ node fig09_03.js
<p>&lt;img src=x onerror=alert(1)&gt;</p>
```

Compare avec l'alternative. React possède une propriété qui s'appelle, à dessein, `dangerouslySetInnerHTML` : « définir le HTML de façon dangereuse ». Son nom existe pour t'arrêter avant de l'utiliser. React ne peut pas savoir si le HTML que tu lui donnes a été généré par une source fiable, nettoyé par un assainisseur à jour ou reçu d'un réseau sans validation ; il cesse donc d'échapper et l'insère tel quel. La même figure, avec cette propriété, produit autre chose :

```tsx
// fig09_04.tsx
import { renderToStaticMarkup } from "react-dom/server";

function DetalleInseguro({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

const detalleExterno = "<img src=x onerror=alert(1)>";

console.log(renderToStaticMarkup(<DetalleInseguro texto={detalleExterno} />));
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_04.tsx
$ node fig09_04.js
<p><img src=x onerror=alert(1)></p>
```

Cette seconde sortie est le défaut. La balise `img` n'est plus écrite comme du texte : c'est un élément que le navigateur va créer. La même chose se produit sans React : affecter à `elemento.innerHTML` un texte qui vient de l'extérieur pose exactement le même problème, et c'est pourquoi il ne doit pas non plus apparaître dans le panneau. Quand tu as besoin d'afficher du texte sans React, `elemento.textContent = texto` fait ce qu'il faut, parce que le navigateur n'interprète pas ce que tu affectes par cette voie.

Une erreur courante est d'écrire une fonction maison qui remplace seulement `<script>` ou supprime un mot précis. HTML a des attributs d'événements, des URL avec le schéma `javascript:`, des entités, du SVG, des styles et des variations d'encodage ; une liste incomplète de remplacements crée un faux sentiment de sécurité. Si un produit a réellement besoin d'afficher du HTML étranger, par exemple du contenu éditorial avec du gras, la réponse est un **assainisseur** (sanitizer) maintenu et testé, qui parcourt le HTML et ne laisse qu'un sous-ensemble autorisé de balises et d'attributs, appliqué avant le point de rendu et avec des tests sur des entrées hostiles. Pour les détails opérationnels du `revisor`, cette exigence n'existe pas, et la conception correcte est de ne pas interpréter du tout de HTML.

Comme une règle que personne ne surveille s'oublie, le projet la transforme en vérification automatique. Le `eslint.config.js` de cette leçon ajoute la règle `no-restricted-syntax` avec deux sélecteurs : l'un interdit l'attribut `dangerouslySetInnerHTML` et l'autre l'affectation à `innerHTML`. Si quelqu'un écrit l'une ou l'autre, `npm run lint` échoue avec le message que tu as écrit. Voici ce qu'il affiche avec un fichier de test, `src/panel/Mala.tsx`, qui contient les deux (supprime-le ensuite) :

```tsx
export function Mala({ texto }: { readonly texto: string }) {
  return <p dangerouslySetInnerHTML={{ __html: texto }} />;
}

export function pintar(elemento: HTMLElement, texto: string): void {
  elemento.innerHTML = texto;
}
```

```text
$ npm run lint

> lint
> eslint src

/home/tu-usuario/proyectos/revisor/src/panel/Mala.tsx
  2:13  error  No insertes HTML sin sanitizar: usa texto como hijo de JSX      no-restricted-syntax
  6:3   error  No asignes innerHTML: usa textContent o un componente de React  no-restricted-syntax

✖ 2 problems (2 errors, 0 warnings)
```

Une règle de lint n'est pas une défense complète : elle ne voit pas une affectation faite par une autre voie, et quelqu'un peut la désactiver. C'est pourquoi le projet ajoute une seconde couche qui ne dépend d'aucun souvenir de personne : une **politique de sécurité du contenu**, ou CSP (*Content Security Policy*). C'est un en-tête de la réponse qui dit au navigateur quelles ressources il a le droit de charger ou d'exécuter dans cette page. Le serveur l'envoie avec la page : `default-src 'none'` interdit tout par défaut, puis on autorise uniquement ce dont le panneau a besoin : `script-src 'self'` (uniquement des scripts servis depuis la même origine que la page, ce qui bloque un `<script>` ou un `onerror` inséré en ligne), `style-src 'self'`, et `connect-src 'self'` (le panneau ne peut faire de `fetch` que vers sa propre origine). De plus, `frame-ancestors 'none'` empêche une autre page de mettre la tienne dans un cadre, `base-uri 'none'` bloque le changement de la base des chemins relatifs et `form-action 'none'` évite qu'un formulaire injecté envoie des données vers un autre site. La CSP ne change rien au fait qu'une insertion non sûre est un défaut ; c'est le filet sous le trapéziste, pas une permission d'arrêter de regarder.

Il reste deux rappels. Premièrement, si le panneau affiche un jour une URL, ne construis pas d'attributs en concaténant des chaînes : passe la valeur comme propriété de JSX et valide le protocole que ton produit autorise, parce qu'un `href` avec `javascript:` exécute du code même sans contenir aucune balise. Les types décrivent du texte ; la politique de sécurité décide quel texte est une destination autorisée. Deuxièmement, le contrat public fait déjà sa part : l'URL interne de chaque service n'arrive pas au panneau, ce qui réduit à la fois l'exposition de l'infrastructure et la quantité de texte externe qui pourrait toucher la page. La sécurité n'est pas une ligne de code à la fin ; elle commence par décider quelles valeurs franchissent chaque frontière.

### Le panneau de l'intérieur

Le panneau, ce sont quatre petits fichiers dans `src/panel/`, plus une feuille de styles. Il convient de les lire dans l'ordre où le navigateur les utilise.

`cargar.ts` est la frontière réseau du panneau. Il définit le type `Cargar`, une fonction qui reçoit un `AbortSignal` et renvoie une promesse avec un `ReportePublico`, et l'implémentation réelle, `cargarReporte`. Celle-ci demande `/api/estados` avec le signal, vérifie `respuesta.ok` et lance « la API respondió 503 » s'il ne l'est pas, convertit le corps avec `respuesta.json()` en `unknown` (une annotation, sans assertion) et le passe par `esReportePublico` ; en cas d'échec, elle lance « la API no entregó un reporte válido ». Le second paramètre, `base`, vaut `""` dans le navigateur, où `/api/estados` se résout par rapport à la page qui l'a chargé, et les tests l'utilisent pour pointer vers un serveur local avec son adresse complète. Les trois dénouements (rapport, code invalide, contrat non respecté) ont un test, `cargar.test.ts`, contre un vrai serveur HTTP qui répond ce dont chaque cas a besoin.

`useReporte.ts` est un hook maison, c'est-à-dire une fonction dont le nom commence par `use` et qui combine d'autres hooks. Il déclare le type `Carga` comme une union discriminée de trois alternatives : `cargando`, `listo` avec le rapport et `error` avec le détail. C'est le patron de la leçon 3 appliqué à l'état d'un écran, et il a le même avantage : il est impossible de représenter « listo » sans rapport, ou « error » sans détail. Le hook garde cet état avec `useState`, et un nombre `intento` qui ne sert qu'à demander à l'effet de se répéter. L'effet crée un `AbortController`, définit `pedir`, qui appelle `cargar(control.signal)` et enregistre `listo` ou `error`, l'exécute une fois, programme `setInterval` pour la répéter toutes les `cadaMs` millisecondes, et renvoie le nettoyage qui interrompt la requête et arrête le minuteur. Il renvoie l'état et `recargar`, qui met le chargement à `cargando` et augmente `intento` ; comme `intento` figure dans la liste de dépendances, l'effet est nettoyé puis répété.

La liste de dépendances, `[cargar, cadaMs, intento]`, mérite une pause parce que c'est là que se cachent les erreurs subtiles. `cargar` y figure parce que l'effet l'utilise : si elle changeait, l'effet doit se répéter avec la nouvelle. Cela exige que l'appelant passe une fonction stable : si `Panel` recevait une nouvelle fonction à chaque rendu, l'effet se répéterait à chaque rendu et tu aurais la boucle de requêtes que tu connais déjà. `cliente.tsx` monte l'application une seule fois avec `render(...)`, et ne s'exécute plus ensuite : la fonction fléchée qu'il passe comme propriété est créée cette unique fois et reste la même pendant toute la vie du panneau. Si elle était créée par un composant qui est redessiné de nombreuses fois, il faudrait la figer avec `useCallback` ou la déclarer en dehors de lui. ESLint, dans ce projet, ne vérifie pas les listes de dépendances ; le paquet officiel qui le fait est `eslint-plugin-react-hooks`, et c'est une bonne installation suivante pour un projet React plus grand.

`Panel.tsx` n'est que de la présentation. `Contenido` reçoit un `Carga` et choisit quoi dessiner avec un `switch` dont le `default` utilise la garde `never` de la leçon 3 : si demain tu ajoutes l'alternative `vacio` à `Carga` et oublies de la dessiner, le compilateur te le dit. Chaque écran porte un attribut `role` (`status` pour « Cargando… » et `alert` pour l'erreur) qui sert aux lecteurs d'écran à les annoncer, et aux tests à les trouver sans dépendre du texte exact. `FilaEstado` est celle de la figure 1, maintenant avec `duracionMs` et une classe CSS par type. `Panel` rassemble le hook, le contenu et un bouton « Actualizar » qui appelle `recargar`. Chaque ligne a pour `key` la position jointe au nom : `servicios.json` n'oblige pas les noms à être uniques, et deux lignes avec la même clé troubleraient React ; comme la liste est entièrement remplacée à chaque chargement et que les lignes ne conservent pas d'état, la position ne cause aucun problème.

`cliente.tsx` est le seul fichier qui touche le document. Il cherche l'élément `#raiz`, échoue de façon explicite s'il n'existe pas et monte le panneau avec `createRoot(raiz).render(...)`. C'est la frontière entre React et la page, et c'est pourquoi c'est la seule chose que les tests de composants n'importent pas : les tests montent `Panel` de leur côté, dans un document simulé.

La feuille `panel.css` est du CSS ordinaire et ne touche pas à TypeScript, avec une décision délibérée : il n'y a pas d'attributs `style` dans le JSX. Un attribut `style` en ligne violerait la politique `style-src 'self'` que le serveur envoie, parce que le navigateur traite le style en ligne comme du code qui ne vient pas de l'origine. Toute l'apparence vit dans la feuille, que le navigateur charge depuis la même origine.

### Du code au navigateur : empaqueter avec esbuild

Jusqu'ici, tout ce que tu as compilé s'exécute dans Node. Le panneau s'exécute dans un navigateur, et un navigateur ne sait pas exécuter du `.tsx`, ni résoudre `import { createRoot } from "react-dom/client"`, qui est le nom d'un paquet et non le chemin d'un fichier. Il faut produire un seul fichier JavaScript que le navigateur puisse charger avec une balise `<script>`. Cette tâche s'appelle **empaqueter** (bundling), et c'est un **empaqueteur** (bundler) qui la fait : il part d'un fichier d'entrée, suit tous les `import`, rassemble ce qu'il trouve et écrit le résultat.

Le projet utilise esbuild, un empaqueteur open source très rapide, dont la documentation officielle se trouve sur `esbuild.github.io`. Le script `empaquetar` tient en une seule ligne :

```text
esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Chaque option a une raison. Les deux premiers arguments sont les fichiers d'entrée : le programme du panneau et la feuille de styles. `--bundle` est ce qui fait qu'esbuild suit les `import`, y compris ceux de `react` et `react-dom`, et les inclut dans la sortie ; sans cette option, il se contenterait de traduire le fichier et laisserait l'`import` d'un paquet que le navigateur ne pourrait pas résoudre. `--minify` supprime les espaces et raccourcit les noms pour que le fichier pèse moins, et cela a un effet qui compte : quand il est utilisé, esbuild définit `process.env.NODE_ENV` comme `"production"`, et React inclut alors sa version de production, sans les vérifications et avertissements de développement. `--format=iife` écrit le résultat comme une fonction qui s'exécute immédiatement ; cela fonctionne avec un `<script>` ordinaire, sans dépendre des modules du navigateur. `--log-level=warning` fait taire les messages informatifs et ne laisse que les avertissements et les erreurs. `--outdir=dist/publico` place le résultat dans `dist/publico/`, ce que lit le serveur : `cliente.js` et `panel.css`.

Il y a une conséquence qui déconcerte si on ne la dit pas. esbuild convertit TypeScript en JavaScript en effaçant les types, mais ne les vérifie pas. Celui qui vérifie les types reste `tsc` : c'est pourquoi `npm run verificar` existe et pourquoi `npm run empaquetar` peut empaqueter un fichier avec des erreurs de type sans se plaindre. Les deux commandes font des travaux distincts : l'une répond à la question de savoir si le programme est correct, l'autre produit ce qui est livré. Un pipeline qui ne ferait qu'empaqueter n'aurait rien vérifié.

Autre conséquence : le même `tsconfig.json` compile maintenant à la fois le serveur et le panneau. C'est pourquoi il inclut `"jsx": "react-jsx"` et `"lib": ["ES2022", "DOM"]`, qui déclare les types du navigateur (`document`, `window`, `HTMLElement`). C'est une simplification qui a un coût : le code du serveur « voit » aussi `document`, et un oubli qui l'utiliserait compilerait et échouerait à l'exécution. Dans un projet plus grand, on les sépare en deux configurations, une pour le serveur et une pour le panneau, qui partagent le fichier `contrato.ts` ; ici, une seule garde la leçon concentrée.

Remarque enfin où se retrouvent React et React DOM. Comme l'empaqueteur les copie dans `cliente.js`, le serveur qui tourne en production ne les importe pas : ils s'installent avec `--save-dev`, parce qu'on n'en a besoin que pour construire et pour tester. C'est une différence contre-intuitive par rapport à une application qui fait le rendu sur le serveur, et elle a une conséquence pratique que tu verras dans « Compiler et publier » : l'artefact de production n'a besoin d'aucune dépendance.

### Le serveur sert le panneau

Dans la leçon 8, `crearServidor` recevait deux choses : une fonction qui obtient le rapport et un journal. Maintenant, il en reçoit une troisième, `leerActivo`, la fonction qui fournit le contenu des deux fichiers que produit l'empaqueteur. Un **actif** (asset) est un fichier statique que le serveur remet tel quel, comme un script ou une feuille de styles. Le type `Activo` est l'union `"cliente.js" | "panel.css"` : il n'y a aucun moyen de demander un fichier qui ne figure pas dans cette liste. C'est la défense contre une vulnérabilité classique, la **traversée de chemin** (*path traversal*) : un serveur qui construit le chemin d'un fichier avec ce qui arrive dans l'URL, comme `/../../etc/passwd`, finit par remettre des fichiers qu'il n'a jamais voulu publier. Ici, l'URL n'est comparée qu'à deux routes connues et le nom du fichier est décidé par le programme, pas par le client ; toute autre route est un `404` de la même `Ruta` de la leçon 8. `main.ts` fournit l'implémentation réelle, `readFile` sur `dist/publico/<activo>`, résolue avec `import.meta.url` pour que cela fonctionne quel que soit le dossier depuis lequel tu démarres le processus.

L'union `Ruta` s'agrandit de deux alternatives, `pagina` pour `GET /` et `activo` pour les deux fichiers, et le `switch` avec `never` fait que le compilateur t'oblige à traiter chacune. La page, `pagina.ts`, est un document HTML minimal conservé comme constante de texte : un `<div id="raiz">`, le lien vers `/panel.css` et le `<script src="/cliente.js" defer>`. L'attribut `defer` fait que le navigateur exécute le script quand il a fini de lire le document, de sorte que `#raiz` existe déjà.

Les réponses gagnent des en-têtes de sécurité. Toutes portent `x-content-type-options: nosniff`, qui interdit au navigateur de deviner un type de contenu différent de celui déclaré (sans lui, un navigateur pourrait traiter un texte comme un script). La page porte en outre la politique CSP de la section précédente. Les réponses JSON portent `cache-control: no-store`, parce que l'état des services change et que personne ne devrait voir un rapport conservé dans la mémoire d'un intermédiaire. Et si la lecture d'un actif échoue, par exemple parce que tu as oublié de lancer `npm run empaquetar`, l'erreur est enregistrée dans le journal avec sa cause et le client reçoit un `500` générique, comme dans la leçon 8.

Une décision qu'il convient d'énoncer : le panneau et l'API partagent la même origine, c'est-à-dire la même combinaison de schéma, de serveur et de port. C'est pourquoi le `fetch("/api/estados")` du panneau n'a pas besoin de **CORS**, la politique du navigateur qui décide si une page d'une origine peut lire les réponses d'une autre, et qui se configure avec des en-têtes comme `Access-Control-Allow-Origin`. Tant que le panneau et l'API sortent du même processus, il n'y a rien à configurer ; si un jour tu les sépares, ce sera le premier problème que tu rencontreras, et la bonne réponse est de déclarer explicitement les origines autorisées, pas de répondre `*` par commodité.

### Le `revisor` terminé : assemblage et tests

Maintenant, toutes les pièces sont là. Le projet complet est le suivant. Chaque fichier apparaît une fois ; ceux qui n'ont pas changé depuis la leçon 8 portent la même explication que là-bas et se trouvent à la fin.

D'abord, la configuration du projet. `package.json` gagne le script `empaquetar` et les nouvelles dépendances de développement, avec version exacte. Installe-les depuis la racine de `revisor/` avec cette commande ; npm les ajoute à `devDependencies`. Le script `empaquetar`, tu l'ajoutes à la main, et les versions des dépendances de la leçon 7 peuvent apparaître avec `^` dans ton fichier : peu importe, `package-lock.json` fixe ce qui est installé, mais tu peux laisser `package.json` identique à celui ci-dessous si tu veux.

```bash
npm install --save-dev --save-exact react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0 esbuild@0.28.2 jsdom@29.1.1 @types/jsdom@28.0.3
```

```json fig09_05/package.json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "empaquetar": "esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico",
    "arrancar": "node dist/main.js",
    "probar": "npm run compilar && node --test \"dist/**/*.test.js\"",
    "lint": "eslint src",
    "formato": "prettier --check src"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/jsdom": "28.0.3",
    "@types/node": "24",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@typescript/native": "npm:typescript@^7.0.2",
    "esbuild": "0.28.2",
    "eslint": "10.11.0",
    "jsdom": "29.1.1",
    "prettier": "3.9.9",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "8.71.0"
  }
}
```
```json fig09_05/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "sourceMap": true
  },
  "include": ["src"]
}
```
```js fig09_05/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "No insertes HTML sin sanitizar: usa texto como hijo de JSX.",
      },
      {
        selector: "AssignmentExpression[left.property.name='innerHTML']",
        message: "No asignes innerHTML: usa textContent o un componente de React.",
      },
    ],
  },
});
```
Le contrat partagé et le panneau. `contrato.ts` est celui de la leçon 8, sans changement ; on le montre ici parce que les deux côtés l'importent maintenant.

```ts
// fig09_05/src/contrato.ts
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
// fig09_05/src/panel/cargar.ts
import { esReportePublico, type ReportePublico } from "../contrato.js";

export type Cargar = (senal: AbortSignal) => Promise<ReportePublico>;

export async function cargarReporte(senal: AbortSignal, base = ""): Promise<ReportePublico> {
  const respuesta = await fetch(`${base}/api/estados`, { signal: senal });

  if (!respuesta.ok) {
    throw new Error(`la API respondió ${respuesta.status}`);
  }

  const cuerpo: unknown = await respuesta.json();

  if (!esReportePublico(cuerpo)) {
    throw new Error("la API no entregó un reporte válido");
  }

  return cuerpo;
}
```
```ts
// fig09_05/src/panel/useReporte.ts
import { useEffect, useState } from "react";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";

export type Carga =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "listo"; readonly reporte: ReportePublico }
  | { readonly tipo: "error"; readonly detalle: string };

export function useReporte(
  cargar: Cargar,
  cadaMs: number,
): { readonly carga: Carga; readonly recargar: () => void } {
  const [carga, establecerCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, establecerIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();

    async function pedir(): Promise<void> {
      try {
        const reporte = await cargar(control.signal);
        establecerCarga({ tipo: "listo", reporte });
      } catch (error: unknown) {
        if (control.signal.aborted) {
          return;
        }

        const detalle = error instanceof Error ? error.message : "falló la carga";
        establecerCarga({ tipo: "error", detalle });
      }
    }

    void pedir();
    const temporizador = setInterval(() => void pedir(), cadaMs);

    return () => {
      control.abort();
      clearInterval(temporizador);
    };
  }, [cargar, cadaMs, intento]);

  function recargar(): void {
    establecerCarga({ tipo: "cargando" });
    establecerIntento((actual) => actual + 1);
  }

  return { carga, recargar };
}
```
```tsx
// fig09_05/src/panel/Panel.tsx
import type { EstadoPublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { useReporte, type Carga } from "./useReporte.js";

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  if (estado.tipo === "disponible") {
    return (
      <li className="disponible">
        <strong>{estado.nombre}</strong>: disponible (HTTP {estado.codigoHttp}, {estado.duracionMs}{" "}
        ms)
      </li>
    );
  }

  return (
    <li className="falla">
      <strong>{estado.nombre}</strong>: falla ({estado.detalle})
    </li>
  );
}

function Contenido({ carga }: { readonly carga: Carga }) {
  switch (carga.tipo) {
    case "cargando":
      return <p role="status">Cargando…</p>;
    case "error":
      return <p role="alert">No se pudo cargar el reporte: {carga.detalle}</p>;
    case "listo":
      return (
        <ul>
          {carga.reporte.estados.map((estado, posicion) => (
            <FilaEstado key={`${posicion}-${estado.nombre}`} estado={estado} />
          ))}
        </ul>
      );
    default: {
      const sinAtender: never = carga;
      throw new Error(`carga sin atender: ${JSON.stringify(sinAtender)}`);
    }
  }
}

export function Panel({
  cargar,
  cadaMs = 10_000,
}: {
  readonly cargar: Cargar;
  readonly cadaMs?: number;
}) {
  const { carga, recargar } = useReporte(cargar, cadaMs);

  return (
    <main>
      <h1>Revisor</h1>
      <Contenido carga={carga} />
      <button type="button" onClick={recargar}>
        Actualizar
      </button>
    </main>
  );
}
```
```tsx
// fig09_05/src/panel/cliente.tsx
import { createRoot } from "react-dom/client";
import { cargarReporte } from "./cargar.js";
import { Panel } from "./Panel.js";

const raiz = document.getElementById("raiz");

if (raiz === null) {
  throw new Error("falta el elemento #raiz en la página");
}

createRoot(raiz).render(<Panel cargar={(senal) => cargarReporte(senal)} />);
```
```css fig09_05/src/panel/panel.css
body {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-width: 40rem;
  padding: 0 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  border-left: 0.5rem solid #888;
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
}

li.disponible {
  border-color: #1a7f37;
}

li.falla {
  border-color: #cf222e;
}
```
Le serveur, sa page et le point d'entrée.

```ts
// fig09_05/src/pagina.ts
export const paginaInicial = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revisor</title>
    <link rel="stylesheet" href="/panel.css" />
  </head>
  <body>
    <div id="raiz"></div>
    <script src="/cliente.js" defer></script>
  </body>
</html>
`;
```
```ts
// fig09_05/src/servidor.ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Bitacora } from "./bitacora.js";
import type { ReportePublico } from "./contrato.js";
import { paginaInicial } from "./pagina.js";

export type ObtenerReporte = () => Promise<ReportePublico>;
export type Activo = "cliente.js" | "panel.css";
export type LeerActivo = (activo: Activo) => Promise<string>;

export interface OpcionesServidor {
  readonly obtenerReporte: ObtenerReporte;
  readonly leerActivo: LeerActivo;
  readonly registrar: Bitacora;
}

type Ruta =
  | { readonly tipo: "pagina" }
  | { readonly tipo: "activo"; readonly activo: Activo }
  | { readonly tipo: "salud" }
  | { readonly tipo: "estados" }
  | { readonly tipo: "no-encontrada" };

const POLITICA_PAGINA = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

function rutaDe(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://revisor.local").pathname;
  } catch {
    return "?";
  }
}

function reconocerRuta(url: string | undefined): Ruta {
  switch (rutaDe(url)) {
    case "/":
      return { tipo: "pagina" };
    case "/cliente.js":
      return { tipo: "activo", activo: "cliente.js" };
    case "/panel.css":
      return { tipo: "activo", activo: "panel.css" };
    case "/salud":
      return { tipo: "salud" };
    case "/api/estados":
      return { tipo: "estados" };
    default:
      return { tipo: "no-encontrada" };
  }
}

function enviar(
  respuesta: ServerResponse,
  codigo: number,
  tipo: string,
  cuerpo: string,
  extra: Record<string, string> = {},
): void {
  respuesta.writeHead(codigo, {
    "content-type": tipo,
    "x-content-type-options": "nosniff",
    ...extra,
  });
  respuesta.end(cuerpo);
}

function enviarJson(respuesta: ServerResponse, codigo: number, cuerpo: unknown): void {
  enviar(respuesta, codigo, "application/json; charset=utf-8", JSON.stringify(cuerpo), {
    "cache-control": "no-store",
  });
}

function errorInterno(opciones: OpcionesServidor, respuesta: ServerResponse, error: unknown): void {
  opciones.registrar({
    evento: "error",
    detalle: error instanceof Error ? error.message : "falla desconocida",
  });
  enviarJson(respuesta, 500, { detalle: "error interno" });
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
    case "pagina":
      enviar(respuesta, 200, "text/html; charset=utf-8", paginaInicial, {
        "content-security-policy": POLITICA_PAGINA,
      });
      return;
    case "activo":
      try {
        const tipo = ruta.activo === "cliente.js" ? "text/javascript" : "text/css";
        enviar(respuesta, 200, `${tipo}; charset=utf-8`, await opciones.leerActivo(ruta.activo));
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
      }
      return;
    case "salud":
      enviar(respuesta, 200, "text/plain; charset=utf-8", "ok");
      return;
    case "estados":
      try {
        enviarJson(respuesta, 200, await opciones.obtenerReporte());
      } catch (error: unknown) {
        errorInterno(opciones, respuesta, error);
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
// fig09_05/src/main.ts
import { readFile } from "node:fs/promises";
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
    leerActivo: (activo) => readFile(new URL(`./publico/${activo}`, import.meta.url), "utf8"),
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
Les tests sont ce qui soutient l'affirmation « le panneau fonctionne » sans ouvrir de navigateur. Il convient de lire ce que démontre chacun, et ce qu'il ne démontre pas.

`Panel.test.tsx` monte vraiment le composant : il installe un document simulé de jsdom (`dom-de-prueba.ts`, comme dans la figure 2), monte `Panel` avec `createRoot` dans `act` et vérifie quatre choses. Que l'on voit « Cargando… » tant que la promesse de `cargar` est en attente et que, une fois résolue, les deux lignes apparaissent avec leur texte. Qu'un `detalle` contenant du HTML s'affiche comme du texte : il cherche un élément `img` et n'en trouve aucun, et vérifie que le HTML obtenu contient `&lt;img`. Qu'une erreur de l'API s'affiche avec `role="alert"` et qu'appuyer sur « Actualizar » (un vrai clic sur le bouton, dans `act`) redemande et récupère la liste. Et qu'au démontage de l'arbre, le signal reçu par `cargar` est interrompu. Ce sont les vrais hooks : l'effet s'exécute, l'état change et React redessine ; il n'y a aucune fonction simulée de React.

`cargar.test.ts` vérifie la couche réseau du panneau contre un serveur HTTP local qui répond ce dont chaque cas a besoin : un rapport valide, un `503` et un JSON qui ne respecte pas le contrat.

`paquete.test.ts` est le test de fumée de l'ensemble, et le plus ambitieux. Il construit le panneau avec l'API d'esbuild, en mémoire et avec les mêmes options que `npm run empaquetar` ; il lève le serveur du `revisor` avec ces fichiers comme actifs et un rapport qui contient un `detalle` hostile (`<b>negrita</b>`) ; il demande `/` et vérifie que la politique CSP complète arrive, identique au texte exact et sans aucun `unsafe-` (la relâcher par inadvertance fait passer le test au rouge) ; il télécharge `/cliente.js` tel que le recevrait un navigateur ; il ouvre la page dans un document simulé, exécute ce script, qui fait un `fetch` vers la vraie API, et attend l'apparition de la ligne. Il vérifie que son texte est littéral, avec les balises visibles, et qu'aucun élément `b` n'a été créé. C'est le parcours complet : serveur, page, paquet, API, validation, React et échappement, avec les mêmes octets que ceux qui voyageraient vers un navigateur. Une réserve sur le test : jsdom n'apporte pas `fetch`, donc le test lui en installe un qui résout les chemins relatifs par rapport au serveur local, et ce remplacement écarte le second argument, y compris le signal d'annulation, parce que l'`AbortSignal` créé dans jsdom n'est pas celui de Node. L'annulation n'est pas testée ici ; c'est le test de `Panel.test.tsx`, qui reçoit bien le signal de Node, qui la vérifie.

Et ce qu'aucun de ces tests ne démontre : qu'un vrai navigateur télécharge et exécute le paquet. jsdom implémente le DOM, mais n'est pas un navigateur : il n'applique pas le CSS, n'impose pas la politique CSP, et n'a pas de moteur de rendu. C'est pourquoi, après la construction, il y a une vérification manuelle qui ne s'automatise pas et qu'il convient de faire une fois, comme expliqué plus bas.

Les tests qui existaient depuis la leçon 8 sont toujours là : la table de `leerPuerto`, celle d'`esReportePublico` et celles du serveur. Dans le serveur, seule sa construction a changé : elle reçoit désormais `leerActivo`. Le bloc suivant montre tous les fichiers qui n'ont pas changé ou qui ont changé sur un petit détail.

```ts
// fig09_05/src/panel/dom-de-prueba.ts
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://127.0.0.1/",
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

export const documento = dom.window.document;
```
```tsx
// fig09_05/src/panel/Panel.test.tsx
import { documento } from "./dom-de-prueba.js";
import assert from "node:assert/strict";
import test from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReportePublico } from "../contrato.js";
import type { Cargar } from "./cargar.js";
import { Panel } from "./Panel.js";

const reporte: ReportePublico = {
  estados: [
    { nombre: "catálogo", tipo: "disponible", codigoHttp: 200, duracionMs: 42 },
    { nombre: "pagos", tipo: "falla", detalle: "<img src=x onerror=alert(1)>" },
  ],
};

async function montar(cargar: Cargar): Promise<{ contenedor: HTMLElement; desmontar: () => void }> {
  const contenedor = documento.createElement("div");
  documento.body.append(contenedor);
  const raiz = createRoot(contenedor);

  await act(async () => {
    raiz.render(<Panel cargar={cargar} cadaMs={60_000} />);
  });

  return {
    contenedor,
    desmontar: () => {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

test("muestra Cargando mientras la API no responde y luego las filas", async () => {
  let responder: (reporte: ReportePublico) => void = () => {};
  const cargar: Cargar = () =>
    new Promise((resolve) => {
      responder = resolve;
    });

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(contenedor.querySelector("[role=status]")?.textContent, "Cargando…");

  await act(async () => {
    responder(reporte);
  });

  const filas = [...contenedor.querySelectorAll("li")].map((fila) => fila.textContent);
  assert.deepEqual(filas, [
    "catálogo: disponible (HTTP 200, 42 ms)",
    "pagos: falla (<img src=x onerror=alert(1)>)",
  ]);
  desmontar();
});

test("un detalle con HTML se muestra como texto y no crea elementos", async () => {
  const { contenedor, desmontar } = await montar(async () => reporte);

  assert.equal(contenedor.querySelector("img"), null);
  assert.match(contenedor.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  desmontar();
});

test("muestra el error y se recupera al pulsar Actualizar", async () => {
  let intentos = 0;
  const cargar: Cargar = async () => {
    intentos += 1;

    if (intentos === 1) {
      throw new Error("la API respondió 503");
    }

    return reporte;
  };

  const { contenedor, desmontar } = await montar(cargar);
  assert.equal(
    contenedor.querySelector("[role=alert]")?.textContent,
    "No se pudo cargar el reporte: la API respondió 503",
  );

  await act(async () => {
    contenedor.querySelector("button")?.click();
  });

  assert.equal(contenedor.querySelector("[role=alert]"), null);
  assert.equal(contenedor.querySelectorAll("li").length, 2);
  assert.equal(intentos, 2);
  desmontar();
});

test("al desmontar cancela la solicitud en curso", async () => {
  let senalRecibida: AbortSignal | undefined;
  const cargar: Cargar = (senal) => {
    senalRecibida = senal;
    return new Promise(() => {});
  };

  const { desmontar } = await montar(cargar);
  assert.equal(senalRecibida?.aborted, false);
  desmontar();
  assert.equal(senalRecibida?.aborted, true);
});
```
```ts
// fig09_05/src/panel/cargar.test.ts
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { cerrar, escuchar, puertoDe } from "../servidor.js";
import { cargarReporte } from "./cargar.js";

async function servirRespuesta(
  codigo: number,
  cuerpo: string,
): Promise<{ readonly servidor: Server; readonly base: string }> {
  const servidor = createServer((_solicitud, respuesta) => {
    respuesta.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
    respuesta.end(cuerpo);
  });

  await escuchar(servidor, 0);
  return { servidor, base: `http://127.0.0.1:${puertoDe(servidor)}` };
}

const casos = [
  {
    nombre: "devuelve el reporte cuando la API responde con el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos","tipo":"falla","detalle":"HTTP 503"}]}',
    esperado: undefined,
  },
  {
    nombre: "rechaza un código HTTP que no es 2xx",
    codigo: 503,
    cuerpo: '{"detalle":"error interno"}',
    esperado: "la API respondió 503",
  },
  {
    nombre: "rechaza un JSON que no cumple el contrato",
    codigo: 200,
    cuerpo: '{"estados":[{"nombre":"pagos"}]}',
    esperado: "la API no entregó un reporte válido",
  },
] as const;

for (const caso of casos) {
  test(`cargarReporte: ${caso.nombre}`, async () => {
    const { servidor, base } = await servirRespuesta(caso.codigo, caso.cuerpo);

    try {
      const senal = new AbortController().signal;

      if (caso.esperado === undefined) {
        const reporte = await cargarReporte(senal, base);
        assert.equal(reporte.estados[0]?.nombre, "pagos");
      } else {
        await assert.rejects(cargarReporte(senal, base), { message: caso.esperado });
      }
    } finally {
      await cerrar(servidor);
    }
  });
}
```
```ts
// fig09_05/src/panel/paquete.test.ts
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { aReportePublico } from "../reporte.js";
import { cerrar, crearServidor, escuchar, puertoDe, type Activo } from "../servidor.js";

async function empaquetar(): Promise<Map<string, string>> {
  const resultado = await build({
    entryPoints: [
      fileURLToPath(new URL("../../src/panel/cliente.tsx", import.meta.url)),
      fileURLToPath(new URL("../../src/panel/panel.css", import.meta.url)),
    ],
    bundle: true,
    minify: true,
    format: "iife",
    outdir: "salida",
    write: false,
    logLevel: "silent",
  });

  return new Map(
    resultado.outputFiles.map((archivo) => [archivo.path.split("/").pop() ?? "", archivo.text]),
  );
}

async function esperar(condicion: () => boolean): Promise<void> {
  for (let intento = 0; intento < 100; intento += 1) {
    if (condicion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("la condición no se cumplió a tiempo");
}

test("el paquete que sirve el servidor pinta el reporte en una página real", async () => {
  const archivos = await empaquetar();
  const api = crearServidor({
    obtenerReporte: async () =>
      aReportePublico([
        {
          servicio: { nombre: "catálogo", url: "https://catalogo.example", timeoutMs: 1500 },
          tipo: "falla",
          detalle: "<b>negrita</b>",
        },
      ]),
    leerActivo: async (activo: Activo) => archivos.get(activo) ?? "",
    registrar: () => {},
  });
  await escuchar(api, 0);
  const base = `http://127.0.0.1:${puertoDe(api)}`;

  try {
    const pagina = await fetch(`${base}/`);
    const politica = pagina.headers.get("content-security-policy") ?? "";
    assert.equal(
      politica,
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    assert.doesNotMatch(politica, /unsafe-/);

    const script = await (await fetch(`${base}/cliente.js`)).text();
    const ventana = new JSDOM(await pagina.text(), { runScripts: "outside-only", url: base })
      .window;
    Object.assign(ventana, { fetch: (ruta: string) => fetch(new URL(ruta, base)) });
    ventana.eval(script);

    await esperar(() => ventana.document.querySelector("li") !== null);
    assert.equal(
      ventana.document.querySelector("li")?.textContent,
      "catálogo: falla (<b>negrita</b>)",
    );
    assert.equal(ventana.document.querySelector("b"), null);
    ventana.close();
  } finally {
    await cerrar(api);
  }
});
```
```ts
// fig09_05/src/servidor.test.ts
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
    leerActivo: async () => "",
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
    leerActivo: async () => "",
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
    leerActivo: async () => "",
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
```ts
// fig09_05/src/contrato.test.ts
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
// fig09_05/src/configuracion.test.ts
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
// fig09_05/src/reporte.test.ts
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
Et les fichiers de la leçon 8 qui restent identiques : le journal, la requête avec `fetch`, le lecteur du fichier de services, la configuration, le rapport, le modèle, le coordinateur `revisarTodos`, `.prettierrc` et `servicios.json`.

```ts
// fig09_05/src/bitacora.ts
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
// fig09_05/src/consulta.ts
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
// fig09_05/src/archivo.ts
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
// fig09_05/src/configuracion.ts
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
// fig09_05/src/reporte.ts
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
```ts
// fig09_05/src/modelo.ts
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
// fig09_05/src/revisar.ts
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
```json fig09_05/.prettierrc
{
  "singleQuote": false,
  "printWidth": 100
}
```
```json fig09_05/servicios.json
[
  { "nombre": "ejemplo", "url": "https://example.com", "timeoutMs": 3000 },
  { "nombre": "node", "url": "https://nodejs.org", "timeoutMs": 3000 },
  { "nombre": "local-apagado", "url": "http://127.0.0.1:8099", "timeoutMs": 1000 }
]
```
```bash
$ cd fig09_05
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

✔ leerPuerto: sin variable usa 3000 (0.5965ms)
✔ leerPuerto: un puerto válido (0.069125ms)
✔ leerPuerto: 65535 es el límite (0.053416ms)
✔ leerPuerto: 65536 se pasa del límite (0.111167ms)
✔ leerPuerto: 0 no es un puerto (0.076833ms)
✔ leerPuerto: un decimal se rechaza (0.056958ms)
✔ leerPuerto: texto se rechaza (0.077583ms)
✔ leerPuerto: la cadena vacía se rechaza (0.061083ms)
✔ esReportePublico: un reporte con las dos variantes (0.642125ms)
✔ esReportePublico: null (0.076959ms)
✔ esReportePublico: estados no es un arreglo (0.1285ms)
✔ esReportePublico: un estado con un tipo desconocido (0.741875ms)
✔ esReportePublico: codigoHttp llega como texto (0.060958ms)
✔ muestra Cargando mientras la API no responde y luego las filas (18.194375ms)
✔ un detalle con HTML se muestra como texto y no crea elementos (3.132041ms)
✔ muestra el error y se recupera al pulsar Actualizar (4.856ms)
✔ al desmontar cancela la solicitud en curso (1.096125ms)
✔ cargarReporte: devuelve el reporte cuando la API responde con el contrato (21.967625ms)
✔ cargarReporte: rechaza un código HTTP que no es 2xx (8.867708ms)
✔ cargarReporte: rechaza un JSON que no cumple el contrato (3.011083ms)
✔ el paquete que sirve el servidor pinta el reporte en una página real (142.25275ms)
✔ disponible conserva código y duración (0.3745ms)
✔ falla conserva detalle (0.051708ms)
✔ el reporte público no publica la URL ni el tiempo límite (0.32275ms)
✔ GET /api/estados revisa destinos reales y publica el reporte (178.837542ms)
✔ las rutas desconocidas, los métodos y los errores internos responden con su código (10.282458ms)
✔ una ruta que no se puede analizar responde 404 y no derriba el servidor (5.185333ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 532.285292
$ npm run empaquetar
> empaquetar
> esbuild src/panel/cliente.tsx src/panel/panel.css --bundle --minify --format=iife --log-level=warning --outdir=dist/publico
```

Pour voir le panneau dans un vrai navigateur, construis et démarre. `npm run empaquetar` dépose le panneau dans `dist/publico/` :

```text
$ npm run compilar
$ npm run empaquetar
$ wc -c dist/publico/*
  225635 dist/publico/cliente.js
     249 dist/publico/panel.css
  225884 total
$ PUERTO=3100 npm run arrancar
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

Ouvre `http://127.0.0.1:3100/` dans ton navigateur. Tu dois voir le titre « Revisor », un « Cargando… » qui dure moins d'une seconde et une liste avec un service par ligne, avec une bordure verte pour les disponibles et rouge pour ceux qui échouent ; toutes les dix secondes, la liste se met à jour toute seule et le bouton « Actualizar » la recharge aussitôt. Ouvre les outils de développement (F12), l'onglet réseau, et confirme une requête `GET /api/estados` avec le statut 200 à chaque fois ; dans l'onglet console, il ne doit y avoir aucune erreur, et dans les en-têtes de la réponse de `/` doit apparaître `content-security-policy`. Si quelque chose échoue là, le journal du serveur, dans le premier terminal, a une ligne par requête.

Avec le serveur en marche, voici comment répond chaque route de la page :

```text
$ curl -i http://127.0.0.1:3100/
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
x-content-type-options: nosniff
content-security-policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
...
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/cliente.js
200 text/javascript; charset=utf-8
$ curl -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:3100/etc/passwd
404 application/json; charset=utf-8
```

Cette dernière ligne est la preuve de la traversée de chemin : demander un fichier que le programme n'a jamais promis de remettre donne un `404`, pas un fichier.

### Compiler et publier : un artefact connu

« Publier » signifie des choses différentes selon les organisations, il n'existe donc pas de commande universelle honnête. Ce qui est universel, en revanche, c'est l'ordre : construire un artefact connu, l'inspecter, n'installer que le nécessaire pour l'exécuter, configurer l'environnement en dehors du dépôt et démarrer ce qui a été construit. Un **artefact** est la sortie identifiable que l'on livre pour l'exécuter. Cette leçon prépare et vérifie cet artefact ; le déploiement sur ton infrastructure sort de ce qui peut se dire de façon générale.

L'artefact du `revisor` est un dossier de quatre éléments : `dist/` (le serveur compilé et `dist/publico/` avec le panneau), `package.json` (dont Node a besoin pour savoir que les `.js` de `dist/` sont des modules ESM, grâce à son champ `"type": "module"`), `package-lock.json` (la résolution exacte des dépendances) et `servicios.json` (la configuration). Il ne porte ni `src/` ni le `node_modules/` du développement. `dist/` contient aussi les tests compilés, que personne n'exécute en production : ils ne gênent pas, et si tu veux un artefact plus strict, tu peux les exclure dans une configuration de compilation à part. Et comme le panneau est empaqueté dans `cliente.js` et que le serveur n'utilise que des modules de Node, l'artefact n'a besoin d'aucune dépendance : ce qui s'installe en production, c'est rien.

Pour le vérifier, ne te fie pas à la logique : construis-le et exécute-le dans un dossier propre, ce qui ressemble le plus à un nouveau serveur. Depuis la racine de `revisor/` :

```text
$ npm run compilar && npm run empaquetar
$ mkdir ../revisor-artefacto
$ cp -R dist package.json package-lock.json servicios.json ../revisor-artefacto/
$ cd ../revisor-artefacto
$ npm ci --omit=dev

up to date, audited 1 package in 113ms

found 0 vulnerabilities
$ PUERTO=3100 node dist/main.js
{"momento":"2026-10-02T21:48:15.755Z","evento":"escuchando","detalle":"http://127.0.0.1:3100"}
```

`npm ci` installe exactement ce que dit `package-lock.json`, échoue si le lock et `package.json` divergent et supprime `node_modules/` avant de commencer : c'est l'installation pensée pour les livraisons, à la différence de `npm install`, qui peut résoudre de nouvelles versions. `--omit=dev` saute les dépendances de développement. Le résultat, « audited 1 package », c'est le projet lui-même : aucune dépendance de production. Si tu avais mis `react` comme dépendance normale, il aurait été installé pour rien ; si le serveur importait quelque chose qui ne se trouve que dans `devDependencies`, c'est à cette étape que cela échouerait, et mieux vaut que cela échoue ici que sur le serveur de production.

Avant de livrer l'artefact, exécute les vérifications dans cet ordre, depuis une installation propre avec `npm ci` : `npm run verificar`, `npm run lint`, `npm run formato`, `npm run probar`, `npm run empaquetar`. Examine `package-lock.json` comme partie du changement, parce qu'il enregistre ce qui va être exécuté. Ne publie pas `node_modules/`, de fichiers `.env`, de journaux ni d'exemples avec de vraies adresses, mots de passe ou jetons ; et note que `servicios.json` est lu depuis le dossier où tu démarres le processus, donc le service doit être lancé avec ce dossier comme répertoire de travail.

Il y a quatre décisions que l'artefact ne prend pas à ta place. La première : le serveur n'écoute que sur `127.0.0.1`, l'interface locale, et c'est délibéré, parce qu'il ne doit pas être exposé directement à Internet. Ce qui est habituel, c'est de placer devant un **proxy inverse**, un processus qui reçoit les connexions publiques, termine le chiffrement HTTPS, le **TLS**, et retransmet la requête au `revisor` par l'interface locale ; c'est ce proxy, et non le programme, qui présente le certificat. La deuxième : un superviseur, qui démarre le processus, le relance s'il tombe et lui envoie `SIGTERM` pour l'arrêter, ce qui est la raison pour laquelle l'arrêt ordonné de la leçon 8 compte. La troisième : l'accès. Un panneau public peut l'être s'il ne montre que de l'information publique ; un panneau qui révèle quels systèmes tu as et comment ils échouent demande probablement une authentification, et cela ne se résout pas en cachant l'URL : une route ne devient pas privée parce qu'elle n'est pas liée. Définis la limite avant de publier et teste les réponses sans session valide. La quatrième : n'utilise rien qui soit de développement, comme le rechargement automatique ou les messages détaillés, comme s'il s'agissait du paquet final.

## L'erreur que tu vas voir

React n'invente pas une nouvelle classe d'erreurs de type ; les erreurs d'un composant sont celles de n'importe quel appel, avec la forme des propriétés. La première apparaît quand tu passes une propriété qui n'appartient pas à l'union du contrat, et la seconde quand tu oublies une propriété obligatoire. Avec TypeScript 7.0.2, `tsc` signale les deux dans un même fichier. Aucune des deux n'est un problème de React : l'état `"pendiente"` n'appartient pas à l'union que le panneau promet de traiter, et un `FilaEstado` sans son `estado` n'a rien à dessiner.

```tsx
// fig09_06.tsx
type EstadoPublico =
  | { readonly nombre: string; readonly tipo: "disponible"; readonly codigoHttp: number }
  | { readonly nombre: string; readonly tipo: "falla"; readonly detalle: string };

function FilaEstado({ estado }: { readonly estado: EstadoPublico }) {
  return <li>{estado.nombre}</li>;
}

export const pantalla = (
  <ul>
    <FilaEstado estado={{ nombre: "pagos", tipo: "pendiente" }} />
    <FilaEstado />
  </ul>
);
```
```bash
$ npx tsc --strict --target ES2022 --module nodenext --jsx react-jsx fig09_06.tsx
fig09_06.tsx(12,44): error TS2322: Type '"pendiente"' is not assignable to type '"disponible" | "falla"'.
fig09_06.tsx(13,6): error TS2741: Property 'estado' is missing in type '{}' but required in type '{ readonly estado: EstadoPublico; }'.
```

TS2322 dit qu'une valeur ne peut pas être affectée au type que la propriété attend : ici, que `"pendiente"` n'est aucune des deux valeurs de `tipo`. Ne le corrige pas avec `as EstadoPublico` : cette assertion ferait taire précisément l'avertissement qui t'évite de dessiner un état qu'aucun composant ne sait dessiner. Si « pendiente » est un véritable état du domaine, ajoute-le à l'union de `contrato.ts`, à la garde `esEstadoPublico`, au convertisseur du serveur et à `FilaEstado` ; le compilateur te dira où manque chaque pièce. TS2741 dit qu'une propriété obligatoire manque ; lis-le comme une question : cette ligne devrait-elle exister sans état ? Presque toujours, la réponse est que le composant a été mal appelé.

Il y a une erreur qui n'est pas celle du compilateur et que tu rencontreras : démarrer le serveur sans avoir empaqueté le panneau. Le serveur répond la page, mais `GET /cliente.js` renvoie `500` et le journal dit ce qui manque :

```text
$ curl -i http://127.0.0.1:3101/cliente.js
HTTP/1.1 500 Internal Server Error
...
{"detalle":"error interno"}
```

Et dans le terminal du serveur :

```text
{"momento":"2026-10-02T21:48:27.838Z","evento":"error","detalle":"ENOENT: no such file or directory, open '/home/tu-usuario/proyectos/revisor/dist/publico/cliente.js'"}
{"momento":"2026-10-02T21:48:27.839Z","evento":"solicitud","detalle":"GET /cliente.js 500 1 ms"}
```

`ENOENT` signifie « ce fichier n'existe pas ». La solution n'est pas de créer un fichier vide : c'est de lancer `npm run empaquetar`. L'écran, pendant ce temps, reste blanc, et les outils de développement montrent le script `/cliente.js` en échec en rouge. C'est un bon exemple de la raison pour laquelle l'erreur est enregistrée sur le serveur et pas seulement répondue : sans le journal, le navigateur dirait seulement « le chargement a échoué ».

Et un troisième cas, celui-ci du navigateur : si dans la console tu vois `Refused to execute inline script because it violates the following Content Security Policy directive`, la politique fait son travail. Quelque chose a tenté d'exécuter un script en ligne ou de charger une ressource d'une autre origine. Ne relâche pas la politique avec `'unsafe-inline'` pour que l'avertissement disparaisse : cherche ce qui a tenté de s'exécuter, ce qui est presque toujours le signe que quelque chose ne devrait pas être là.

## Ce qui se fait de travers

- **Insérer du HTML de l'extérieur sans l'assainir.** `dangerouslySetInnerHTML` ou `elemento.innerHTML = texto` avec un texte que tu ne contrôles pas transforment des données en instructions : c'est du XSS. Affiche le texte comme enfant de JSX, et si tu as vraiment besoin de HTML étranger, passe-le par un assainisseur maintenu, avant de dessiner. Le projet interdit les deux formes avec ESLint et limite ce qui peut s'exécuter avec une politique CSP.

- **Écrire une fonction maison pour « nettoyer » du HTML.** Remplacer `<script>` ou une liste de mots laisse passer les attributs d'événements, les URL `javascript:`, le SVG et d'autres encodages. Une liste de ce qui est interdit est toujours incomplète ; un assainisseur maintenu part d'une liste de ce qui est permis.

- **Traiter le JSON du réseau comme s'il était le type.** `(await respuesta.json()) as ReportePublico` compile et ne vérifie rien. Reçois `unknown`, valide avec la garde partagée et vérifie `respuesta.ok` avant d'analyser.

- **Convertir une erreur de l'API en liste vide.** Un panneau qui affiche « no hay servicios » alors que l'API a renvoyé un `503` cache la défaillance précisément là où quelqu'un regarde. L'état d'erreur existe pour que l'écran dise ce qui s'est passé.

- **Demander des données dans le corps du composant.** Un `fetch` en dehors de `useEffect` se répète à chaque rendu, et comme la réponse change l'état, il provoque un autre rendu : une boucle de requêtes. Les requêtes sont des effets et vont dans `useEffect`.

- **Oublier le nettoyage de l'effet.** Sans interrompre la requête ni arrêter le minuteur au démontage, les réponses en retard essaient de mettre à jour des composants qui n'existent plus et les intervalles continuent de tourner pour toujours.

- **Partager le modèle interne au lieu du contrat public.** Si le panneau importe `Estado`, l'URL de chaque service voyage vers le navigateur par commodité. Partage `contrato.ts` : ce qui franchit la frontière, pas ce qu'il y a dedans.

- **Importer du code de Node dans un fichier partagé.** Un `import "node:fs"` dans `contrato.ts` casse l'empaquetage du panneau, ou pire, amène au navigateur du code qui ne devait pas quitter le serveur. Ce qui est partagé ne contient que des types et des fonctions pures.

- **Confondre empaqueter et vérifier.** `esbuild` efface les types sans les vérifier. Un flux qui ne fait qu'empaqueter peut livrer un programme avec des erreurs de type ; `npm run verificar` reste obligatoire.

- **Servir des fichiers avec le chemin qu'écrit le client.** Construire `readFile("dist/publico" + url)` permet de demander `/../../secreto`. Avec une liste fermée d'actifs connus, comme `Activo`, cette attaque n'a aucune entrée.

- **Relâcher la politique CSP avec `'unsafe-inline'` au premier avertissement.** C'est l'équivalent d'éteindre une alarme parce qu'elle sonne : tu perds la défense juste au moment où elle fonctionnait. Découvre ce qui a tenté de s'exécuter.

- **Publier le répertoire de travail.** `node_modules/`, `src/`, `.env` et les journaux ne font pas partie de l'artefact. Construis, copie seulement le nécessaire et installe avec `npm ci --omit=dev`.

## Exercices

### Exercice 1 — Une troisième façon de voir le rapport

Ajoute au panneau un résumé au-dessus de la liste : « 2 de 3 servicios disponibles ». Calcule-le dans une fonction pure `resumir(reporte: ReportePublico): string` dans son propre fichier, teste-la avec une table de cas (aucun disponible, tous, mélange, liste vide) et utilise-la depuis `Contenido`. Confirme avec `npm run probar` que le test de `Panel` passe toujours et ajoute une assertion qui vérifie le résumé à l'écran.

### Exercice 2 — Examiner ce qui traverse l'API

Ajoute à `Servicio` un champ `responsable: string` (par exemple, une adresse de contact) et à `servicios.json` la valeur de chaque service, sans toucher à `contrato.ts`. Exécute `npm run verificar` et explique quels fichiers tu as dû modifier pour que cela compile. Ensuite, démarre le `revisor` et confirme avec `curl http://127.0.0.1:3100/api/estados` que le responsable n'apparaît pas dans la réponse. Explique ce qui se serait passé si l'API sérialisait directement l'`Estado`.

### Exercice 3 — Valider avant de dessiner

Ajoute au contrat un champ optionnel `detalle` aux états disponibles, par exemple pour signaler des réponses lentes, et mets à jour `esEstadoPublico` pour qu'il ne l'accepte que s'il est du texte. Écris deux nouveaux cas dans la table de `contrato.test.ts` : un valide et un avec un `detalle` numérique. Vérifie que le panneau affiche le détail d'un état disponible sans que `FilaEstado` utilise une assertion.

### Exercice 4 — Un panneau qui ne devient pas périmé en silence

Si l'API cesse de répondre, le panneau affiche l'erreur, mais perd la liste qu'il avait déjà. Modifie `useReporte` pour que, lorsqu'une mise à jour échoue et qu'il y avait déjà une liste, il conserve la dernière liste avec l'avertissement d'erreur. Réfléchis à l'alternative de `Carga` que tu dois ajouter, ajoute un test dans `Panel.test.tsx` qui le vérifie et confirme que le compilateur te signale le `switch` de `Contenido` tant que tu ne traites pas la nouvelle alternative.

## Solutions

### Solution 1

Le calcul est une fonction pure qui ne sait rien de React : elle reçoit le contrat et renvoie du texte. Cela permet de la tester avec des données construites en mémoire, et c'est ce qu'utilise `Contenido`, sans logique supplémentaire.

```ts
// src/panel/resumir.ts
import type { ReportePublico } from "../contrato.js";

export function resumir(reporte: ReportePublico): string {
  const disponibles = reporte.estados.filter((estado) => estado.tipo === "disponible").length;
  return `${disponibles} de ${reporte.estados.length} servicios disponibles`;
}
```

Dans `Contenido`, la branche `listo` dessine `<p>{resumir(carga.reporte)}</p>` avant la liste. Dans le test de composant, l'assertion est `assert.equal(contenedor.querySelector("p")?.textContent, "1 de 2 servicios disponibles")` avec le rapport d'exemple, qui a un service disponible et un en échec. La liste vide mérite son cas : `0 de 0 servicios disponibles` est une phrase correcte, mais décide si tu préfères un autre texte avant qu'une personne ne le voie.

### Solution 2

Ajouter `responsable` à `Servicio` fait échouer la compilation à chaque endroit qui construit un `Servicio` sans lui : `leerServicio` de `configuracion.ts`, qui doit lire et valider le champ avec les mêmes gardes que le reste, et les tests et figures qui écrivent des services à la main. `contrato.ts`, `aReportePublico` et le panneau ne changent pas, et c'est tout l'intérêt de l'exercice : comme `aEstadoPublico` construit l'objet champ par champ, le nouveau champ n'arrive pas dans la réponse. Si l'API sérialisait l'`Estado` avec `JSON.stringify`, `responsable` voyagerait vers chaque navigateur sans que personne l'ait décidé ; ce serait une fuite de données personnelles causée par l'ajout d'une colonne.

### Solution 3

Le champ est optionnel dans le type et la garde ne l'exige que lorsqu'il est présent : « optionnel » signifie qu'il peut manquer, pas qu'il puisse avoir n'importe quelle valeur.

```ts
// src/contrato.ts (fragmento)
| {
    readonly nombre: string;
    readonly tipo: "disponible";
    readonly codigoHttp: number;
    readonly duracionMs: number;
    readonly detalle?: string;
  }

// en esEstadoPublico, rama "disponible":
return (
  typeof valor.codigoHttp === "number" &&
  typeof valor.duracionMs === "number" &&
  (valor.detalle === undefined || typeof valor.detalle === "string")
);
```

Dans `FilaEstado`, la branche `disponible` ajoute `{estado.detalle === undefined ? null : ` — ${estado.detalle}`}` après la durée. C'est un affinage normal : dans la branche non-`undefined`, `estado.detalle` est `string`, sans aucune assertion. Les deux cas de la table sont un rapport avec `detalle: "lento"` dans un état disponible, qui doit être valide, et un autre avec `detalle: 7`, qui doit être rejeté.

### Solution 4

L'alternative manquante est un chargement avec liste et avertissement à la fois : `{ tipo: "obsoleto"; reporte: ReportePublico; detalle: string }`. C'est la seule façon de représenter « j'ai des données anciennes et la dernière tentative a échoué » sans inventer deux variables qui puissent se contredire.

```ts
// en useReporte, dentro de pedir():
} catch (error: unknown) {
  if (control.signal.aborted) {
    return;
  }

  const detalle = error instanceof Error ? error.message : "falló la carga";
  establecerCarga((actual) =>
    actual.tipo === "listo" || actual.tipo === "obsoleto"
      ? { tipo: "obsoleto", reporte: actual.reporte, detalle }
      : { tipo: "error", detalle },
  );
}
```

Deux détails. Quand la mise à jour suivante réussit, `establecerCarga({ tipo: "listo", reporte })` écarte l'avertissement. Et comme `Contenido` fait un `switch` avec la garde `never`, le compilateur te signale (TS2322) cette fonction tant que tu ne dessines pas la branche `obsoleto` : la liste et un `<p role="alert">` avec l'avertissement. C'est l'utilité de modéliser les états de l'écran sous forme d'union.

## Comment savoir que j'ai réussi

- [ ] `npx tsc --version` affiche `Version 7.0.2` dans `~/proyectos/revisor`.
- [ ] Dans `figuras/`, `fig09_02.tsx` affiche `primer render: <p>Cargando…</p>` puis `tras el efecto: <p>2 servicios</p>`.
- [ ] `fig09_03.tsx` affiche la balise échappée avec `&lt;` et `&gt;`, et `fig09_04.tsx`, avec `dangerouslySetInnerHTML`, l'affiche sans échappement.
- [ ] Dans le projet, `npm run verificar`, `npm run lint` et `npm run formato` se terminent sans avertissements, et `npm run probar` rapporte 27 tests réussis et 0 échoué.
- [ ] En ajoutant un fichier avec `dangerouslySetInnerHTML`, `npm run lint` échoue avec le message de la règle ; en le supprimant, il repasse.
- [ ] `npm run empaquetar` se termine sans sortie et dépose `cliente.js` et `panel.css` dans `dist/publico/`.
- [ ] Avec `PUERTO=3100 npm run arrancar`, ouvrir `http://127.0.0.1:3100/` dans un navigateur affiche la liste, « Actualizar » la recharge, et l'onglet réseau montre `GET /api/estados` avec le statut 200.
- [ ] `curl -i http://127.0.0.1:3100/` inclut l'en-tête `content-security-policy`, et `curl http://127.0.0.1:3100/etc/passwd` répond 404.
- [ ] Dans un dossier propre avec seulement `dist/`, `package.json`, `package-lock.json` et `servicios.json`, `npm ci --omit=dev` se termine bien et `node dist/main.js` démarre le même serveur.

## Pour aller plus loin

- [React : Démarrage rapide](https://fr.react.dev/learn) — documentation officielle sur les composants, les propriétés, l'état et les effets, avec une section sur TypeScript ; consulté le 2 octobre 2026.

- [React : Synchroniser grâce aux Effets](https://fr.react.dev/learn/synchronizing-with-effects) — documentation officielle de `useEffect` : quand l'utiliser, la liste de dépendances et la fonction de nettoyage ; consulté le 2 octobre 2026.

- [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — guide d'OWASP pour éviter le XSS, avec les règles selon le contexte de sortie ; consulté le 2 octobre 2026.

- [MDN : Content Security Policy (CSP)](https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CSP) — référence sur la politique de sécurité du contenu et ses directives ; consulté le 2 octobre 2026.
