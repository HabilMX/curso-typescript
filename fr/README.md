# Cours de TypeScript — de zéro à un programme qui tient debout

**Par Dorian Chávez, fondateur de Hábil et architecte d'intégration.**

**Pour qui :** celui qui a déjà suivi le cours de Go de cette maison, ou celui qui programme en JavaScript et veut cesser de découvrir les erreurs en production. On ne suppose aucune expérience préalable des types : chaque concept est expliqué quand il apparaît, et on explique pourquoi il existe, pas seulement comment on l'écrit.

**Ce que tu sauras à la fin :** écrire un programme complet avec des types, comprendre ce que tu as écrit et pouvoir l'expliquer à quelqu'un d'autre.

**Ce dont tu as besoin avant de commencer :** un ordinateur sous Linux Mint et savoir ouvrir un terminal. La [Leçon 1](01-instalacion.md) installe tout depuis zéro.

## Le projet que tu vas construire

Le **`revisor`** : une API qui interroge une liste de services **en même temps** et un panneau web qui affiche le rapport, avec les types partagés entre les deux. C'est le même problème que dans le cours de Go, résolu cette fois en TypeScript.

## Les dix leçons

| Leçon | | Ce que tu construis | Ce que tu apprends |
|---|---|---|---|
| 0 | [Qu'est-ce que TypeScript, et ce qu'il n'est PAS](00-que-es-typescript.md) | rien pour l'instant (lecture) | JS vs TS ; les types sont effacés à l'exécution ; ce qui est protégé et ce qui ne l'est pas ; pourquoi `strict` |
| 1 | [Installer TypeScript sur ton Linux Mint](01-instalacion.md) | l'environnement et ton premier programme | Node LTS, `tsc`, éditeur, `tsconfig` strict, exécuter et déboguer |
| 2 | [Types, fonctions et inférence](02-tipos-funciones-inferencia.md) | les fonctions de base du `revisor` | primitifs, inférence, unions et littéraux, *narrowing* (affinage de type), `null` et `undefined` |
| 3 | [Objets et modèle de données](03-objetos-modelo-datos.md) | le modèle `Servicio` / `Estado` | `type` vs `interface`, typage structurel, `readonly`, unions discriminées |
| 4 | [Collections, génériques et erreurs](04-colecciones-genericos-errores.md) | la liste de services et le rapport | tableaux, `Map`/`Set`, génériques, types utilitaires, erreurs |
| 5 | [Asynchronisme : qu'il vérifie tout à la fois](05-asincronia.md) | le `revisor` concurrent | boucle d'événements (*event loop*), promesses, `async/await`, `Promise.all` vs `allSettled`, `AbortController` |
| 6 | [Les données qui viennent de l'extérieur](06-datos-de-fuera.md) | validation de la configuration et des réponses | valider à la frontière ; types dérivés du schéma |
| 7 | [Modules, tests et qualité](07-modulos-pruebas-calidad.md) | le vrai projet, avec des tests | modules ESM, tests pilotés par table de cas, lint et formatage |
| 8 | [Le serveur](08-el-servidor.md) | l'API HTTP du `revisor` | serveur HTTP, routes typées, JSON, configuration, arrêt propre |
| 9 | [L'écran et le programme terminé](09-la-pantalla.md) | le panneau web et le paquet final | React avec TypeScript et hooks, types partagés, XSS, compiler et publier |

À la fin de chaque leçon, il y a des exercices avec leurs solutions. Et le [journal de bord](bitacora.md) est à toi : note-y ce qui t'a coûté.
