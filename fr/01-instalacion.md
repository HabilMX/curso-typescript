# Leçon 1 — Installer TypeScript sur ton Linux Mint

**Durée :** 2 × 45 min

**Ce que tu construis :** l'environnement et ton premier programme

**Ce que tu apprends :** Node LTS, gestionnaire de paquets, `tsc`, éditeur, `tsconfig` strict, exécuter et déboguer

## À la fin, tu seras capable de

- Installer et vérifier Node.js 24 LTS, npm et le compilateur TypeScript sur Linux Mint.
- Créer un projet ESM avec `package.json`, une dépendance locale à TypeScript et un fichier de verrouillage reproductible.
- Compiler un programme avec `npx tsc --strict --target ES2022 --module nodenext` et exécuter le JavaScript obtenu avec Node.
- Configurer un projet avec un `tsconfig.json` strict, une sortie dans `dist/` et des cartes de code source (source maps).
- Distinguer l'exécution d'un `.ts` avec l'effacement des types de Node de sa vérification et de sa compilation avec `tsc`.
- Ouvrir le projet dans un éditeur, arrêter l'exécution avec un point d'arrêt et corriger un diagnostic `TSxxxx`.

## Le pourquoi avant le comment

Le `revisor` finira par être une application en deux parties qui doivent coïncider : une API qui interroge plusieurs services et un panneau web qui présente le rapport. Avant d'arriver à cette complexité, il faut résoudre une question moins spectaculaire mais décisive : comment ton ordinateur transforme-t-il le code que tu écris en un programme qu'il peut exécuter ?

JavaScript répond déjà à une partie de cette question. Node exécute des fichiers `.js` ; il comprend la syntaxe de JavaScript, crée le processus, charge les modules, donne accès aux fichiers et au réseau, et termine le processus quand le travail est fini. Depuis Node 22.18, il peut aussi exécuter certains fichiers `.ts` en effaçant leur syntaxe de types. TypeScript ajoute une autre étape, distincte : `tsc` vérifie le programme et produit du JavaScript. Il ne remplace pas Node et ne devient pas un système d'exploitation à part. C'est l'outil qui trouve les contradictions dans ton code avant que Node ait l'occasion de l'exécuter.

Cette séparation compte dès le premier jour. Imagine que, dans quelques leçons, le `revisor` reçoive une liste de services et que chaque élément ait besoin d'un nom, d'une URL et d'une politique de délai d'attente (timeout). Si tu confonds un nombre avec du texte, ou si tu appelles une propriété qui n'existe pas, mieux vaut recevoir une explication à la compilation que le découvrir après avoir déployé une API. Le compilateur ne vérifie pas si une URL répond réellement et ne peut pas garantir qu'un JSON externe ait la forme attendue ; ces frontières seront validées plus tard. Mais il peut vérifier que le code que tu as écrit est cohérent avec les règles que tu as déclarées.

En Go, `go run` réunit compilation et exécution en une seule commande et peut donner l'impression que les deux ne forment qu'une seule opération. TypeScript rend la frontière plus visible : `tsc` transforme et vérifie ; `node` exécute. Au début, cela ressemble à deux étapes de trop. En pratique, ce sont deux responsabilités différentes et il faut savoir laquelle a échoué. Si `tsc` signale `TS2322`, il n'existe pas encore de programme fiable à lancer. Si `tsc` se termine sans message et que Node échoue, le problème se trouve dans le comportement à l'exécution, un import qui n'existe pas sur le disque, une variable d'environnement ou une réponse externe.

Le bon outil évite aussi des problèmes qui mettent du temps à apparaître. Linux Mint 22.x hérite de la base d'Ubuntu 24.04 et ses paquets privilégient la stabilité ; LMDE, en revanche, repose sur Debian. C'est raisonnable pour les composants du système, mais un cours a besoin d'une ligne de Node et d'une version de TypeScript explicites. Ici, tu utiliseras Node 24 LTS et TypeScript 7.0.2. Tu n'as pas besoin de mémoriser une révision mineure de Node ni une version particulière de npm : vérifie que `node -v` commence par `v24`, que npm répond et que le compilateur local affiche `Version 7.0.2`.

La première décision du cours est d'installer TypeScript dans le projet, et non comme un outil global de ton utilisateur. Une installation globale répond à la question « quel compilateur ai-je aujourd'hui sur cet ordinateur portable ? ». Une dépendance locale répond à une question plus utile : « avec quel compilateur faut-il construire ce projet, ici et sur un autre ordinateur ? ». `package.json` conserve cette décision ; `package-lock.json` enregistre les versions résolues. Ainsi, quand quelqu'un d'autre clonera le `revisor`, il ne dépendra pas de ce qu'il a installé par hasard.

Nous commencerons aussi avec ESM, les modules standard de JavaScript. Cela évite d'adopter une ancienne syntaxe de modules uniquement parce qu'elle apparaît encore dans de vieux exemples. Dans le `revisor`, `package.json` déclare `"type": "module"` et les imports relatifs écrivent l'extension que le fichier aura à l'exécution : `.js`, même si le fichier source est un `.ts`. Cela paraît étrange la première fois, mais c'est une conséquence directe du fait que `tsc` émet du JavaScript et que Node le charge depuis `dist/`.

Enfin, activer `strict` n'est pas une cérémonie. C'est choisir que le compilateur signale les incertitudes dès que le projet est petit. Si tu commences en mode relâché et que tu durcis les règles quand tu as vingt fichiers, les diagnostics s'accumulent et il devient difficile de distinguer une décision de conception d'une correction mécanique. Le `revisor` aura des services qui échouent, des réponses absentes et des données externes ; le construire avec une vérification stricte dès la première ligne rend visibles ces possibilités au lieu de les cacher.

## Les concepts

### Node.js, npm et la dépendance locale

Node.js est l'environnement qui exécutera le JavaScript du `revisor`. npm est le gestionnaire de paquets fourni avec Node : il télécharge les dépendances, conserve leurs versions et propose des commandes définies par le projet. TypeScript est l'une de ces dépendances de développement : il est nécessaire pour convertir le code source, mais pas pour exécuter le JavaScript déjà compilé.

Commence par installer Node 24 LTS. `nvm` est un gestionnaire de versions de Node : il permet d'installer et de sélectionner des lignes de Node sans utiliser le paquet du système. La documentation officielle de `nvm` publie cet installateur pour sa version 0.40.8 :

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Ouvre un nouveau terminal après l'installation. Si ton terminal utilise `bash` et ne trouve toujours pas la commande, charge sa configuration avec `source ~/.bashrc` ; l'installateur modifie le fichier de démarrage adéquat parmi `.bashrc`, `.bash_profile`, `.zshrc` et `.profile`. Installe et sélectionne maintenant la ligne 24 :

```bash
nvm install 24
nvm alias default 24
nvm use 24
nvm --version
node -v
npm -v
```

`nvm --version` et `npm -v` doivent afficher une version. `node -v` doit commencer par `v24` ; `nvm install 24` peut choisir une révision mineure plus récente au sein de cette ligne LTS. Si `nvm` dit qu'il n'existe pas, ouvre un nouveau terminal ou charge le fichier de démarrage indiqué par l'installateur. Avant de chercher des solutions au hasard, exécute `echo "$SHELL"` pour savoir si tu utilises `bash`, `zsh` ou un autre shell ; une modification placée dans `.bashrc` ne se charge pas automatiquement dans une session `zsh`. Sous Linux Mint, si tu n'as pas encore `curl`, installe-le avec `sudo apt install curl` et répète la commande de l'installateur.

Crée maintenant un dossier pour le projet. Son nom n'a pas de signification technique particulière pour l'instant : ce sera la racine du `revisor`, où vivront `package.json`, `tsconfig.json`, le code source et la sortie compilée.

```bash
mkdir -p ~/proyectos/revisor/src
cd ~/proyectos/revisor
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

`npm init -y` crée un `package.json` de base. `npm install --save-dev` ajoute les outils nécessaires au développement, écrit leurs versions dans `package.json` et génère `package-lock.json`. `--save-exact` empêche npm d'écrire le préfixe `^` : le projet conserve exactement TypeScript 7.0.2 et la révision de `@types/node` qu'il a résolue dans la ligne 24. L'option `--save-dev` exprime que TypeScript et les déclarations de Node sont nécessaires pour construire et vérifier le projet, pas pour exécuter le résultat final en production.

Ajuste le fichier `package.json` pour déclarer ESM et donner des noms utiles aux commandes du projet :

```json
{
  "name": "revisor",
  "private": true,
  "type": "module",
  "scripts": {
    "compilar": "tsc",
    "verificar": "tsc --noEmit",
    "arrancar": "node dist/main.js"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

`"private": true` évite une publication accidentelle dans le registre public de npm. `"type": "module"` fait que Node interprète les fichiers `.js` du projet comme des modules ESM. Les commandes sous `"scripts"` s'exécutent avec `npm run compilar`, `npm run verificar` et `npm run arrancar` ; npm trouve automatiquement les exécutables installés dans `node_modules/.bin/`, tu ne dois donc pas ajouter ce dossier au `PATH`. La révision exacte de `@types/node` peut être une autre de la ligne 24 si tu installes le cours plus tard ; conserve celle qu'a écrite ton installation avec `--save-exact`.

Comme exemple minimal, ce programme confirme seulement que le compilateur et Node sont coordonnés. La première ligne identifie le fichier de la figure ; elle ne fait pas partie de la syntaxe nécessaire à ton projet.

```ts
// fig01_01.ts
const nombrePrograma = "revisor";

console.log(`Hola, ${nombrePrograma}: TypeScript ya compila.`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_01.ts
$ node fig01_01.js
Hola, revisor: TypeScript ya compila.
```

Dans le `revisor`, la même idée apparaît à plus grande échelle. La dépendance locale permet à `npm run compilar` d'utiliser le compilateur choisi par le projet, et non une version globale que quelqu'un a installée il y a des mois. Conserve `package-lock.json` dans Git avec `package.json` : le premier n'est pas un déchet généré, mais l'enregistrement précis des paquets que npm a résolus. En revanche, `node_modules/` s'exclut bien avec `.gitignore`, car on peut le reconstruire avec `npm install` à partir de ces deux fichiers.

Une confusion fréquente est de penser que `npx tsc` installe TypeScript globalement. Ce n'est pas le cas quand le paquet est déjà dans le projet : `npx` trouve d'abord l'exécutable local. Tu peux vérifier quelle version est associée au projet avec cette commande :

```bash
npx tsc --version
```

Elle doit répondre `Version 7.0.2`. Si elle répond une autre version, ne continue pas comme si de rien n'était. Vérifie que tu es bien dans `~/proyectos/revisor`, que `node_modules/` existe et que `package.json` contient la bonne dépendance. Le nom de l'outil, `tsc`, est conservé même si son implémentation actuelle est native ; tu n'as pas à changer les commandes du cours pour cela.

Les figures du cours ont aussi besoin de leur propre contexte ESM et de leur compilateur local. Crée un dossier voisin du projet pour expérimenter sans mélanger les JavaScript générés avec `src/` :

```bash
mkdir -p ~/proyectos/figuras
cd ~/proyectos/figuras
npm init -y
npm install --save-dev --save-exact typescript@7.0.2 @types/node@24
```

Ouvre son `package.json` et ajoute `"type": "module"` (et `"private": true`) à côté de ce que npm a écrit, sans supprimer `devDependencies` : si tu les perds, TypeScript n'est plus installé. Le numéro de `@types/node` peut être un autre de la ligne 24. Ne mets pas de `tsconfig.json` dans ce dossier : les figures d'un seul fichier utilisent leurs options explicites avec `npx tsc`. Quand l'une d'elles utilisera `await` au niveau supérieur, ce `package.json` ESM évitera `TS1309`. `npx tsc` cherche d'abord l'exécutable local de `~/proyectos/figuras/node_modules/.bin/` ; il n'installe pas TypeScript globalement.

```json
{
  "name": "figuras",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@types/node": "24.19.1",
    "typescript": "7.0.2"
  }
}
```

### Compiler, émettre et exécuter

Node 24 peut exécuter directement un `.ts` grâce au *type stripping*, l'effacement de la syntaxe de types avant d'exécuter le JavaScript. Cette capacité est disponible sans option depuis Node 22.18 et stable depuis Node 24.12. Ce n'est pas une compilation : Node remplace les types par des espaces et ne fait aucune vérification de types. C'est pourquoi `node src/main.ts` peut être utile pour un script d'un seul fichier, mais ne prouve pas que le programme soit correct ; c'est `tsc` qui vérifie et émet la sortie que le `revisor` exécutera.

L'effacement des types n'accepte que la syntaxe effaçable. Node n'accepte pas `.tsx`, ni les constructions qui génèrent du JavaScript comme `enum`, `namespace` avec des valeurs ou les propriétés de paramètre dans les constructeurs, sauf si tu actives l'option expérimentale `--experimental-transform-types`. Il ne lit pas non plus `tsconfig.json`, `paths` ni les fichiers `.ts` situés dans `node_modules`. Si tu n'importes qu'un type, écris-le avec `import type` pour que cela corresponde à ce que Node peut effacer. `erasableSyntaxOnly` est une option de TypeScript qui avertit des constructions que Node ne peut pas effacer.

Les imports montrent pourquoi le flux du cours compile les projets avant de les lancer. En exécutant un `.ts` directement, Node exige l'extension source littérale : `import "./arranque.ts"` fonctionne ; `import "./arranque.js"` cherche précisément un fichier `.js` à côté de la source et échoue s'il n'existe que `arranque.ts`. Le `revisor` utilise `.js` dans ses imports parce que ce sera le chemin des fichiers émis dans `dist/`. Par conséquent, utilise `node archivo.ts` seulement pour une expérience d'un seul fichier, et utilise `npm run compilar` puis `npm run arrancar` pour le projet à plusieurs fichiers.

`tsc` lit le programme, le vérifie et émet des `.js`. Cette transformation reçoit parfois le nom de transpilation parce que la source et le résultat sont des langages proches, mais pour ton flux quotidien il suffit de retenir deux verbes : vérifier et compiler avec `tsc` ; exécuter la sortie avec `node`.

Observe ce programme. L'annotation `: string` sert à ce que TypeScript vérifie la valeur de `estado` ; elle n'est pas destinée à arriver jusqu'à Node. Les types seront étudiés en profondeur dans la leçon suivante. Pour l'instant, vois-y la preuve que le compilateur vérifie une couche qui ne fait pas partie du programme exécutable.

```ts
// fig01_02.ts
const estado: string = "entorno listo";
const serviciosPendientes = 3;

console.log(`revisor: ${estado}; ${serviciosPendientes} servicios pendientes.`);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_02.ts
$ node fig01_02.js
revisor: entorno listo; 3 servicios pendientes.
```

Après la compilation, ouvre `fig01_02.js`. Tu verras qu'il contient `const estado = "entorno listo";`, sans `: string`. TypeScript efface les annotations de types lorsqu'il émet le JavaScript. C'est une différence importante avec Go : Go compile vers un binaire qui porte des instructions machine ; TypeScript émet du JavaScript et demande que Node, un navigateur ou un autre environnement JavaScript exécute ce résultat.

Cela établit aussi une limite claire. Si quelqu'un modifie le fichier JavaScript émis, ou si un client envoie un JSON avec de fausses données, les annotations TypeScript n'apparaîtront pas pendant l'exécution pour l'arrêter. Les types protègent le code que tu compiles ; ils ne valident pas à eux seuls ce qui arrive du réseau. Dans la leçon sur les données externes, le `revisor` validera explicitement ses frontières avant de transformer une information inconnue en valeurs fiables.

N'exécute pas les fichiers que TypeScript laisse à côté de la source dans un vrai projet. Dans les figures, c'est utile parce que cela réduit les étapes, mais mélanger `.ts` et `.js` dans `src/` finit par brouiller la distinction entre le fichier à modifier et celui à publier. Le `revisor` séparera les sources de la sortie : `src/` contiendra ce que tu écris ; `dist/` contiendra ce que produit `tsc`.

Dans le projet, le programme de démarrage initial peut être délibérément très petit. Ne déclare pas encore `Servicio` ni `Estado` : ces noms auront un modèle précis dans la leçon 3. À ce stade, le bon progrès est de disposer d'un projet qui se construit de façon répétable, pas d'anticiper des types qui n'ont pas encore de règles claires.

La relation entre les commandes du projet sera toujours la même :

```bash
npm run compilar
npm run arrancar
```

La première vérifie le projet et produit les fichiers sous `dist/`. La seconde exécute exactement la sortie construite. Si tu modifies `src/main.ts` et oublies de recompiler, `npm run arrancar` exécutera l'ancienne version de `dist/main.js`. Cette séparation paraît gênante jusqu'à ce que tu débogues une panne : tu sais si tu regardes le code actuel ou un artefact périmé.

### `tsconfig.json` et le mode strict

Écrire toutes les options de compilation dans chaque commande fonctionne pour une figure, mais pas pour un projet. `tsconfig.json` est le contrat de compilation : il identifie les fichiers sources, définit la sortie et conserve les décisions qui doivent être identiques pour chaque membre du projet et pour l'intégration continue.

Crée ce `tsconfig.json` à la racine de `revisor/` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true,
    "noEmitOnError": true
  },
  "include": ["src"]
}
```

`target` déclare la version de JavaScript que TypeScript émettra. `ES2022` convient à Node 24 : il n'oblige pas le compilateur à transformer des fonctionnalités modernes en équivalents plus longs. `module` et `moduleResolution` avec `NodeNext` font que TypeScript suit les règles de modules que Node applique à un projet moderne. Le couple compte : choisir une autre résolution peut autoriser des imports que Node ne saura ensuite pas résoudre.

`rootDir` et `outDir` rendent visible la limite entre ce que tu écris et ce qui est généré. Le point d'entrée fixe du cours, `src/main.ts`, devient `dist/main.js` ; un dossier `src/reporte/tabla.ts` devient `dist/reporte/tabla.js`. Cette correspondance permettra plus tard au backend de publier un répertoire propre, sans sources ni dépendances de développement mélangées.

`strict: true` active une famille de vérifications, dont `strictNullChecks`, `noImplicitAny` et des vérifications d'initialisation et de fonctions. Depuis TypeScript 6, la valeur par défaut est déjà `true` ; l'écrire rend explicite une décision que celui qui la désactive devra changer exprès. Cela ne veut pas dire que « TypeScript devient pénible » ; cela veut dire que le compilateur cesse de supposer que toute valeur existe, que toute variable a une forme évidente ou qu'une donnée ambiguë est sûre. Tu pourras activer des options encore plus exigeantes à l'avenir, mais `strict` est le point de départ non négociable du cours.

`types: ["node"]` indique à TypeScript de charger les déclarations de types de Node installées via `@types/node`, y compris celles de modules comme `node:fs/promises`. Depuis TypeScript 6, l'option `types` ne charge plus par défaut tous les paquets `@types` installés ; la déclarer est donc nécessaire même si `@types/node` est dans `devDependencies` : sans elle, un import de Node peut échouer avec `TS2591`.

`noEmitOnError` empêche de laisser un nouveau JavaScript lorsque le projet a des erreurs. Sans cette option, il est possible que TypeScript trouve une contradiction et émette quand même des fichiers ; ensuite tu exécutes un `dist/` partiellement mis à jour et tu diagnostiques le mauvais problème. Dans un projet de services, produire une sortie connue et complète vaut mieux que produire une sortie douteuse.

`sourceMap: true` crée des cartes qui relient chaque fichier JavaScript émis à sa source TypeScript. Elles ne changent pas par elles-mêmes le comportement en production. Leur utilité se voit au débogage : l'éditeur peut s'arrêter sur la ligne `.ts` que tu as écrite, au lieu de t'envoyer vers une ligne de JavaScript émis qui ne contient pas les annotations d'origine.

Dans le `revisor`, le premier `src/main.ts` peut réutiliser le schéma de la figure précédente. Copie-le dans `src/main.ts`, lance `npm run compilar` et vérifie que `dist/main.js` apparaît avec `dist/main.js.map`. À partir de ce moment, tu n'as plus besoin de répéter de longues options : `npm run compilar` prend ses décisions dans `tsconfig.json`.

Il y a une nuance qui évite beaucoup de confusions : avec TypeScript 7.0.2, si tu exécutes `npx tsc src/main.ts` dans un dossier qui contient `tsconfig.json`, le compilateur ne l'ignore pas : il s'arrête avec `TS5112` et te demande de choisir. Pour compiler un fichier isolé, utilise `npx tsc --ignoreConfig src/main.ts` et fournis les options dont tu as besoin ; pour compiler le projet selon sa configuration, utilise `npx tsc` sans fichiers, ou `npx tsc --project tsconfig.json`. Dans ce cours, `npm run compilar` équivaut au second cas parce que le script ne contient que `tsc`.

Ce projet minimal montre les deux décisions. La première commande échoue parce qu'un fichier a été nommé alors que `tsconfig.json` existe ; la deuxième lit la configuration complète et la troisième exécute le JavaScript émis.

```json fig01_05/package.json
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

```json fig01_05/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src"]
}
```

```ts
// fig01_05/src/main.ts
const estado: string = "entorno listo";

console.log(`revisor: ${estado}`);
```

```bash
$ cd fig01_05
$ npx tsc src/main.ts
error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.
$ npx tsc --project tsconfig.json
$ node dist/main.js
revisor: entorno listo
```

### Modules ESM et extensions `.js`

Un module permet de répartir le programme en fichiers qui exportent des valeurs et en fichiers qui les importent. Le `revisor` aura besoin de cette séparation : le modèle partagé, la logique qui interroge les services, le serveur et le panneau ne doivent pas vivre dans un fichier interminable. ESM est le système de modules standard de JavaScript et c'est celui que nous utiliserons désormais.

La première surprise est qu'un fichier TypeScript importe l'extension `.js`. Ce n'est pas une faute de frappe. TypeScript voit `./arranque.js`, comprend que la source correspondante est `arranque.ts` et émet un `import "./arranque.js"` que Node peut résoudre à l'exécution dans `dist/`.

```ts
// fig01_03/arranque.ts
export function mensajeDeArranque(): string {
  return "revisor: entorno listo";
}
```

```ts
// fig01_03.ts
import { mensajeDeArranque } from "./fig01_03/arranque.js";

console.log(mensajeDeArranque());
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_03.ts
$ node fig01_03.js
revisor: entorno listo
```

L'exemple a deux fichiers à dessein. `arranque.ts` offre une fonction avec `export` ; le fichier principal la reçoit au moyen de `import`. Dans un projet ESM, n'écris pas `require`, n'omets pas l'extension dans les imports relatifs et ne remplace pas `.js` par `.ts` simplement parce que tu lis la source. Ces trois décisions mélangent des règles d'époques différentes et produisent souvent des erreurs qui ressemblent à des problèmes du compilateur alors que ce sont en réalité des règles de chargement de Node.

Dans le `revisor`, ce schéma permettra une frontière claire. Plus tard, `src/modelo/servicio.ts` exportera le vocabulaire partagé ; `src/revisar/` utilisera ce vocabulaire pour interroger ; et le panneau importera les mêmes contrats compilés ou publiés depuis un paquet partagé. Aujourd'hui, il suffit de s'exercer à la mécanique : un fichier exporte, un autre importe, et Node exécute la sortie `.js`.

N'utilise pas de chemins absolus du disque comme imports, ni d'alias inventés, dès la première leçon. Un alias comme `@/modelo` peut être pratique dans un éditeur, mais il exige de configurer en même temps TypeScript, Node, les tests et le bundler web. Les imports relatifs explicites sont moins spectaculaires et plus transparents tant que tu apprends quel fichier dépend duquel.

### Éditeur, diagnostic et débogage

Tu peux écrire du TypeScript avec n'importe quel éditeur de texte, mais un éditeur qui prend en charge le langage réduit le temps entre la faute et sa compréhension. Visual Studio Code reconnaît `tsconfig.json`, affiche les diagnostics de TypeScript, permet d'aller à une définition et débogue Node. Ouvre le dossier complet du projet, pas seulement `src/main.ts`, pour que l'éditeur détecte `package.json`, `tsconfig.json` et la structure des modules.

Sous Linux Mint 22.x, tu peux télécharger le paquet `.deb` pour Debian/Ubuntu depuis la [page de téléchargement de VS Code](https://code.visualstudio.com/Download) et, depuis le dossier où tu l'as enregistré, l'installer ainsi. Le paquet propose de configurer le dépôt de Microsoft pour recevoir les mises à jour automatiques :

```bash
sudo apt install ./<archivo>.deb
code --version
```

Tu peux aussi configurer ce dépôt manuellement. La liste des architectures est celle que publie Microsoft : `amd64`, `arm64` et `armhf`.

```bash
sudo apt install wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft.gpg
sudo tee /etc/apt/sources.list.d/vscode.sources > /dev/null <<'EOF'
Types: deb
URIs: https://packages.microsoft.com/repos/code
Suites: stable
Components: main
Architectures: amd64,arm64,armhf
Signed-By: /usr/share/keyrings/microsoft.gpg
EOF
sudo apt update
sudo apt install code
code --version
```

Ce sont des procédures d'installation du système : lis-les et exécute-les sur ton Mint, pas dans le projet. Pour LMDE, utilise le paquet `.deb` téléchargé ; ne suppose pas que ses sources de paquets sont celles d'Ubuntu.

```bash
cd ~/proyectos/revisor
code .
```

Le terminal n'a pas besoin que la commande `code` existe pour que TypeScript fonctionne. Si ton installation de Visual Studio Code ne l'a pas ajoutée au `PATH`, ouvre l'application depuis le menu et utilise « Ouvrir le dossier » pour sélectionner `~/proyectos/revisor`. L'important est d'ouvrir la racine du projet, car c'est là que se trouve le fichier de configuration qui définit comment les fichiers source sont vérifiés.

Configure le débogage pour qu'il compile d'abord avec le script du projet. Crée le dossier `.vscode/` et enregistre ces deux fichiers JSON valides. Une tâche est une instruction que VS Code peut exécuter avant de démarrer le débogueur.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "compilar revisor",
      "type": "shell",
      "command": "npm",
      "args": ["run", "compilar"],
      "problemMatcher": "$tsc"
    }
  ]
}
```

Enregistre-le sous `.vscode/tasks.json`. Crée maintenant `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Depurar revisor",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/main.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "compilar revisor",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

`preLaunchTask` relie les deux configurations : avant d'exécuter Node, VS Code lance `npm run compilar` ; il n'utilise pas une tâche TypeScript installée par l'éditeur qui pourrait pointer vers une autre version. `outFiles` indique où se trouvent les JavaScript et les cartes qui correspondent au TypeScript source.

Compile avant de déboguer si tu veux vérifier le résultat séparément :

```bash
npm run compilar
```

Ouvre ensuite `src/main.ts`, clique à gauche du numéro d'une ligne contenant `console.log` pour poser un point rouge et appuie sur `F5`. Choisis la configuration « Depurar revisor ». Grâce à `sourceMap: true`, le débogueur doit s'arrêter sur la ligne TypeScript d'origine. De là, tu peux inspecter les variables, avancer d'une ligne, entrer dans une fonction ou continuer.

Comme alternative rapide, ouvre la palette de commandes, choisis « Debug: Create JavaScript Debug Terminal » (« Déboguer : Créer un terminal de débogage JavaScript » dans une interface en français) et exécute `node dist/main.js` dans ce terminal. Ce mode débogue n'importe quel processus Node que tu lances là ; avec les cartes de source actives, les points d'arrêt se posent dans les `.ts`. Le `launch.json` est préférable quand tu veux répéter le même démarrage avec `F5` ; le terminal de débogage sert à explorer une commande ponctuelle.

Un point d'arrêt ne répare pas le programme et ne remplace pas un test. Il sert à observer l'état réel juste avant une opération. Plus tard, il sera utile pour arrêter le `revisor` avant d'interpréter une réponse HTTP et comparer ce que tu supposais arrivé avec la valeur réellement arrivée. Si une valeur peut être `undefined`, ne suppose pas que le débogueur prouve qu'elle le sera toujours simplement parce que, lors d'une exécution précise, elle avait une valeur ; utilise-le pour formuler une explication, puis écris une validation ou un test reproductible.

La console de l'éditeur et le terminal jouent des rôles distincts. Les diagnostics `TSxxxx` te disent que le programme contredit ses types avant l'exécution. La console de débogage montre ce qui s'est passé lors d'une exécution particulière. Les deux sont précieux, mais ils répondent à des questions différentes. Commencer par le diagnostic du compilateur fait en général gagner du temps : cela n'a pas de sens de poursuivre dans le débogueur une branche d'un programme que TypeScript sait déjà impossible à construire correctement.

## L'erreur que tu vas voir

Le programme suivant contient une erreur intentionnelle. TypeScript 7.0.2 le rejette avant d'émettre du JavaScript : `limite` a été déclaré comme nombre, mais la valeur écrite est du texte.

```ts
// fig01_04.ts
const limite: number = "30";

console.log(limite);
```

```bash
$ npx tsc --strict --target ES2022 --module nodenext fig01_04.ts
fig01_04.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

`TS2322` signifie que tu as essayé d'affecter une valeur d'un type à un emplacement qui en exige un autre. On ne la corrige ni en réduisant le compilateur au silence ni en convertissant tout en `any`. Décide d'abord quelle était l'intention. Si la limite représente des secondes, la valeur correcte peut être `30` sans guillemets. Si la donnée est arrivée sous forme de texte depuis une variable d'environnement, tu devras la valider et la convertir à la frontière ; cette situation sera traitée dans la leçon 6.

Il existe un autre diagnostic courant au démarrage d'un projet ESM. Si tu écris un import relatif sans extension :

```ts
import { mensajeDeArranque } from "./arranque";
```

avec `moduleResolution: "NodeNext"`, TypeScript 7.0.2 signale ce message :

```bash
$ npx tsc
src/main.ts(1,35): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './arranque.js'?
```

`TS2835` ne te demande pas de convertir le fichier source en JavaScript. Il te demande d'écrire le chemin que Node verra après la compilation : `./arranque.js`. TypeScript reliera ce chemin à `arranque.ts` pendant la compilation. Ce détail évite que `tsc` accepte un import que Node ne saurait pas localiser lors de l'exécution de `dist/main.js`.

Deux erreurs voisines expriment des problèmes différents. `TS2307` signifie que TypeScript ne trouve pas le module indiqué ; par exemple, si `src/arranque.ts` n'existe pas :

```bash
$ npx tsc
src/main.ts(1,35): error TS2307: Cannot find module './arranque.js' or its corresponding type declarations.
```

`TS2305` est différent : le fichier existe bien, mais il n'exporte pas le nom demandé. Si `arranque.ts` n'exporte pas `mensajeDeArranque`, l'import produit ce diagnostic :

```bash
$ npx tsc
src/main.ts(1,10): error TS2305: Module '"./arranque.js"' has no exported member 'mensajeDeArranque'.
```

Avant de réinstaller des paquets, vérifie le concret : que `src/arranque.ts` existe, que le chemin est relatif à `src/main.ts`, que le nom respecte les mêmes majuscules et minuscules, et que le fichier exporte réellement le symbole que tu essaies d'importer. Linux distingue `Arranque.ts` de `arranque.ts` ; un projet qui semblait fonctionner sur un autre système peut échouer en arrivant sur Mint à cause de cette différence.

Enfin, distingue une erreur de compilation d'une erreur de commande. Si tu tapes `tsc` et que le terminal répond `command not found`, ce n'est pas un diagnostic de TypeScript : le shell n'a pas trouvé d'exécutable global. Dans le projet, utilise `npx tsc --version` ou `npm run compilar`. Tu invoques ainsi la version locale déclarée dans `package.json` sans dépendre d'une installation globale.

## Ce qui se fait de travers

- **Installer TypeScript globalement et supposer que tout le monde utilisera la même version.** Un `npm install --global typescript` peut servir à expérimenter, mais il ne définit pas le compilateur du `revisor`. La dépendance locale et le fichier de verrouillage rendent le projet reproductible. Utilise `npx tsc` ou les scripts npm pour le construire.

- **Croire qu'exécuter `node src/main.ts` équivaut à vérifier.** Node 24 peut effacer les types et exécuter un `.ts` à la syntaxe effaçable, mais il n'exécute pas `tsc` et ne trouve pas les imports `.js` que le projet réserve à `dist/`. Utilise ce mode seulement pour un script isolé ; dans le `revisor`, compile vers `dist/` et exécute `node dist/main.js`.

- **Mélanger des fichiers générés avec des fichiers source.** Laisser `.js`, `.map` et `.ts` ensemble peut te faire modifier une sortie générée ou exécuter une ancienne version. `src/` est l'origine ; `dist/` est le résultat. Supprime et régénère `dist/` si tu soupçonnes qu'il est périmé, ne le modifie pas à la main.

- **Désactiver `strict` pour « avancer ».** Une configuration permissive n'élimine pas l'incertitude : elle la laisse seulement aller plus loin. Le coût se paie plus tard, quand une fonction accepte une valeur ambiguë et que l'erreur apparaît loin de sa cause. Corrige le diagnostic ou comprends quelle valeur peut manquer ; ne cache pas l'avertissement.

- **Écrire des imports ESM relatifs sans `.js`.** TypeScript peut trouver la source, mais Node doit résoudre le JavaScript émis. Avec `NodeNext`, l'extension `.js` fait partie du contrat d'exécution. Écris-la dès le début et tu n'auras pas à corriger tous les imports quand le projet grandira.

- **Utiliser un point d'arrêt comme preuve que le code fonctionne.** Le débogueur montre une exécution, avec des données concrètes. Un test doit exprimer le résultat que tu attends pour plusieurs cas et pouvoir se répéter. Utilise le débogueur pour découvrir ce qui se passe et les tests, qui arriveront dans la leçon 7, pour empêcher qu'une correction se perde.

## Exercices

### Exercice 1 — Ton environnement mesuré

Installe Node 24 LTS et crée le dossier `~/proyectos/revisor`. Initialise npm, installe `typescript@7.0.2` et `@types/node@24` comme dépendances de développement. Vérifie `node --version`, `npm --version` et `npx tsc --version`. Conserve le `package-lock.json` et ajoute `node_modules/` à `.gitignore`.

### Exercice 2 — Le premier démarrage du revisor

Crée `tsconfig.json` avec la configuration stricte de cette leçon, y compris l'option `"types": ["node"]`. Copie le programme de la figure 01.02 dans `src/main.ts`, ajuste le texte pour qu'il affiche `revisor: entorno listo`, compile avec `npm run compilar` et exécute-le avec `npm run arrancar`. Confirme que la sortie se trouve dans `dist/`, pas à côté du fichier source.

### Exercice 3 — Un module et un diagnostic

Sépare le message de démarrage dans `src/arranque.ts` et fais en sorte que `src/main.ts` l'importe avec l'extension `.js`. Compile et exécute. Retire ensuite temporairement l'extension de l'import, lance `npm run compilar`, copie le code `TSxxxx` qui apparaît et corrige l'import. Enfin, pose un point d'arrêt dans la fonction exportée et vérifie que le débogueur s'arrête dans le fichier `.ts`.

## Solutions

### Solution 1

Depuis la racine du projet, les trois vérifications doivent identifier Node 24, une version de npm et TypeScript 7.0.2. La version mineure exacte de Node peut changer au sein de la ligne 24 quand tu mettras à jour la LTS ; l'important est de ne pas exécuter Node 22, 23 ou une autre ligne.

```bash
node --version
npm --version
npx tsc --version
```

Le fichier `.gitignore` doit inclure, au minimum, cette ligne :

```text
node_modules/
```

N'inclus pas `package-lock.json` dans `.gitignore`. Il fait partie de la définition reproductible du projet.

### Solution 2

La structure attendue est la suivante :

```text
revisor/
  package.json
  package-lock.json
  tsconfig.json
  src/
    main.ts
  dist/
    main.js
    main.js.map
```

Le bloc `compilerOptions` de `tsconfig.json` doit inclure `"types": ["node"]`, pour que le projet charge les déclarations de `@types/node`. Après `npm run compilar`, `npm run arrancar` doit exécuter `dist/main.js`, pas `src/main.ts`. Si `dist/` n'apparaît pas, vérifie que tu as lancé `npm run compilar` ou `npx tsc` sans nommer de fichiers. Si tu nommes un fichier dans un dossier contenant `tsconfig.json`, TypeScript 7 affiche `TS5112` ; pour l'isoler, utilise `--ignoreConfig` et les options dont il a besoin.

### Solution 3

L'import correct dans `src/main.ts` porte `.js`, même si le fichier que tu as écrit s'appelle `arranque.ts` :

```ts
import { mensajeDeArranque } from "./arranque.js";
```

Le diagnostic attendu en omettant l'extension est `TS2835`. En la rétablissant, `npm run compilar` doit se terminer sans message d'erreur. Si le débogueur s'arrête dans `dist/arranque.js` au lieu de `src/arranque.ts`, confirme que `sourceMap` est toujours à `true`, recompile et relance la session de débogage.

## Comment savoir que j'ai réussi

- [ ] `node --version` commence par `v24` et `npx tsc --version` affiche `Version 7.0.2`.
- [ ] `package.json` déclare `"type": "module"` et TypeScript est dans `devDependencies`.
- [ ] `tsconfig.json` déclare `"types": ["node"]` et `npm run verificar` se termine sans diagnostics.
- [ ] `npm run compilar` crée `dist/main.js`.
- [ ] La commande suivante affiche exactement la ligne indiquée :

```bash
$ node dist/main.js
revisor: entorno listo
```

- [ ] Un import relatif du projet utilise `.js` et `npm run compilar` ne signale pas `TS2835`.
- [ ] En changeant un nombre en texte dans une variable déclarée comme `number`, le compilateur affiche `TS2322`.
- [ ] Un point d'arrêt dans `src/arranque.ts` s'arrête dans le code TypeScript lors de l'exécution de la sortie de Node.

## Pour aller plus loin

- [TypeScript : qu'est-ce qu'un `tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) — documentation officielle sur la racine du projet, les fichiers inclus et la façon dont le compilateur invoque la configuration. Consulté le 2 octobre 2026.

- [TypeScript : référence des options de TSConfig](https://www.typescriptlang.org/tsconfig/) — référence officielle de `strict`, `sourceMap`, `module`, `moduleResolution` et des autres options du compilateur. Consulté le 2 octobre 2026.

- [Node.js : téléchargement et installation](https://nodejs.org/fr/download) — page officielle pour choisir la ligne LTS et la méthode d'installation pour Linux. Consulté le 2 octobre 2026.

- [Visual Studio Code : transpiler du TypeScript](https://code.visualstudio.com/docs/typescript/typescript-transpiling) — documentation officielle de l'éditeur sur la compilation, la configuration et le travail avec TypeScript. Consulté le 2 octobre 2026.
