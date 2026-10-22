# Komorebi — Project Context

> **Document historique.** Depuis V0.22, le périmètre courant est le diorama botanique 3D low-poly sans progression décrit dans `../README.md` et `V022_GOLD_OVERHAUL.md`. Les décisions Phaser/pixel-art et progression ci-dessous ne sont plus la référence de la V1.

> Document de référence actuel du projet.
>
> Ce fichier décrit les décisions prises à ce jour et doit servir de contexte commun aux développeurs et aux assistants IA travaillant sur Komorebi.
>
> `VISION.md` conserve la philosophie générale et l'historique conceptuel.
>
> `MVP_01_CRE.md` définit strictement le premier prototype.

---

# 1. Identité du projet

**Nom : Komorebi**

Le mot japonais *komorebi* évoque la lumière du soleil filtrant à travers les feuilles des arbres.

Le nom a été retenu car il rassemble plusieurs dimensions centrales du projet :

- nature ;
- lumière ;
- contemplation ;
- calme ;
- sensation d'être bien dans un lieu.

Komorebi est actuellement développé comme projet indépendant de DAWN-01, même s'il appartient au même univers de projets personnels.

---

# 2. Objectif général

Créer un sandbox contemplatif dans lequel le joueur s'approprie progressivement un petit environnement naturel.

Komorebi doit principalement fournir des systèmes et possibilités permettant au joueur de créer ses propres projets.

Le jeu ne doit pas être construit autour d'une boucle :

> tâche → récompense → nouvelle tâche.

La progression doit principalement augmenter les possibilités d'expression et les réactions possibles du monde.

---

# 3. Mécanique centrale : CRE

## CRE — Réponse Contextuelle de l'Environnement

Le CRE constitue actuellement la mécanique phare de Komorebi.

Principe :

> **Le joueur place. Le monde interprète. L'environnement répond.**

Le monde ne doit pas donner l'impression d'être constitué d'objets indépendants posés sur une grille.

Lorsqu'un élément est ajouté, supprimé ou modifié, le système peut analyser son voisinage et adapter localement le résultat.

Le CRE peut produire :

### Réponses immédiates

- snapping ;
- autotiling ;
- raccords ;
- sélection de variantes ;
- offsets ;
- fusion visuelle ;
- modification de voisins ;
- décoration contextuelle.

### Réponses progressives

À terme :

- mousse ;
- propagation végétale ;
- évolution d'un massif ;
- modification des conditions locales ;
- apparition de microéléments ;
- attraction d'espèces.

Le CRE doit permettre de combiner l'aspect satisfaisant de Tiny Glade/Townscaper avec un environnement réactif inspiré notamment de Terra Nil.

---

# 4. Technologie

## Plateforme

Komorebi reste un projet web.

Le jeu doit fonctionner depuis un navigateur et pouvoir être hébergé sur l'infrastructure HomeLab.

## Stack retenue pour le prototype

- **TypeScript**
- **Phaser**
- **Vite**
- **npm**

Le projet a été initialisé à partir du template Phaser minimal avec une seule scène.

## React

React n'est pas retenu pour le MVP.

Phaser gère directement le rendu et la logique du prototype.

React pourra éventuellement être réévalué plus tard pour certaines interfaces complexes, mais il ne doit pas être introduit sans besoin concret.

## Backend

Aucun backend n'est nécessaire pour le MVP.

Une persistance plus avancée sera étudiée ultérieurement.

Une base légère telle que SQLite pourra être envisagée si un backend devient nécessaire.

---

# 5. Perspective

La perspective retenue est une :

## **projection dimétrique 2:1**

La vue trois-quarts plate de type Stardew Valley a été explicitement écartée pour des raisons principalement visuelles.

Komorebi doit donner davantage de volume et de profondeur à son environnement.

La projection doit rester fixe afin de limiter fortement le nombre d'assets nécessaires.

Pas de rotation libre de caméra prévue.

---

# 6. Grille

Référence logique actuelle :

## **tile 64 × 32 px**

Cette taille correspond à la grille dimétrique et non à la taille obligatoire des sprites.

Une grenouille, une fleur ou un autre petit élément peut être largement plus petit qu'une tile.

La tile représente une unité spatiale logique.

---

# 7. Placement

Le système retenu est **hybride**.

La grille constitue la vérité logique du monde, mais elle ne doit pas être visuellement dominante.

## Terrain

Terrain et structures fondamentales :

- grille stricte ;
- raccords ;
- autotiling potentiel.

## Gros objets

Exemples :

- arbre ;
- maison ;
- pont ;
- grosses structures.

Ils possèdent une empreinte logique et des collisions.

Un léger offset graphique peut être autorisé.

## Petits éléments

Exemples :

- fleurs ;
- champignons ;
- petites pierres ;
- végétation décorative.

Le placement peut être beaucoup plus libre à l'intérieur de la structure logique.

Plusieurs petits éléments peuvent partager une même tile.

## Principe

> **La grille est une contrainte pour le moteur, pas pour l'œil du joueur.**

Le CRE doit notamment contribuer à faire disparaître visuellement les frontières entre tiles.

---

# 8. Occupation et densité

L'idée initiale d'un simple poids `0 → 1` par tile n'est pas retenue comme unique système de collision.

Une valeur scalaire ne permet pas de représenter correctement l'occupation physique.

En revanche, une notion de densité peut rester pertinente pour la simulation écologique.

Il faut distinguer :

- occupation physique ;
- collision ;
- densité végétale ;
- données écologiques éventuelles.

Une plante peut par exemple augmenter progressivement la densité végétale locale ou se propager aux tiles voisines.

---

# 9. Monde

Komorebi doit utiliser un **monde unique et continu**.

Pas de succession de rooms avec chargements entre :

- forêt ;
- étang ;
- verger ;
- jardin ;
- etc.

Le joueur peut organiser lui-même son territoire comme il le souhaite.

## Échelle

Référence principale : l'île d'Animal Crossing plutôt qu'une grande map de RPG.

Le monde doit être :

- suffisamment grand pour nécessiter un déplacement ;
- suffisamment petit pour être rapidement mémorisable ;
- familier après relativement peu de temps.

L'objectif conceptuel est qu'après une quinzaine de minutes d'exploration, le joueur possède déjà une bonne représentation mentale du lieu.

---

# 10. Expansion et soft locks

Tout le territoire n'a pas besoin d'être accessible immédiatement.

Des obstacles naturels peuvent temporairement limiter l'accès :

- rivière ;
- pont détruit ;
- végétation dense ;
- chemin envahi ;
- relief ;
- autres obstacles cohérents.

Ces limites doivent être des **soft locks intégrés au monde**, pas des écrans de sélection de zone.

Une fois supprimée, la frontière disparaît réellement et la nouvelle partie du terrain appartient au même espace continu.

---

# 11. Limites du monde

La grille technique peut être rectangulaire.

La géographie visible ne doit pas l'être nécessairement.

Les frontières extérieures doivent être naturelles et irrégulières.

Possibilités :

- mer ;
- montagne ;
- falaise ;
- rivière ;
- forêt dense ;
- vieux murs ;
- combinaison de plusieurs éléments.

Principe :

> **limite du gameplay ≠ limite visuelle du monde.**

Le décor peut continuer au-delà de la zone physiquement accessible afin d'éviter l'impression d'un plateau flottant.

---

# 12. Caméra et zoom

Trois niveaux conceptuels de zoom sont envisagés :

## Proche

Observation des animaux, plantes et petits détails.

## Normal

Déplacement et aménagement.

## Éloigné

Observation globale et contemplation du lieu.

Le comportement exact reste à tester.

Modifier réellement l'angle de projection selon le zoom est une idée intéressante mais non validée, car cela peut être incompatible avec des sprites conçus pour une projection fixe.

---

# 13. Mode contemplation

Komorebi peut progressivement effacer son interface lorsque le joueur reste inactif.

Exemple envisagé :

- environ 10 secondes sans interaction ;
- disparition douce de l'UI ;
- environnement toujours vivant ;
- retour de l'interface dès que le joueur agit.

Ce comportement est préféré à un mode contemplation nécessairement activé par un bouton.

Il reste à expérimenter.

---

# 14. Avatar

La version finale envisagée possède un avatar physique contrôlé par le joueur.

Le joueur se déplace dans le monde à travers cet avatar plutôt que de contrôler uniquement une caméra abstraite.

Objectif :

> transformer Komorebi d'un simple éditeur de jardin en un **lieu habité**.

## V1 future

- avatar unique ;
- pas de personnalisation nécessaire ;
- déplacement ;
- idle ;
- interactions génériques.

## Plus tard

Une personnalisation d'avatar et éventuellement un système de compte pourront être envisagés.

L'architecture graphique devra éviter de rendre cette évolution inutilement difficile.

## MVP

**Aucun avatar dans le premier MVP CRE.**

---

# 15. Actions et animations de l'avatar

Les animations doivent être mutualisées.

Éviter une animation unique pour chaque combinaison outil/cible.

Familles potentielles :

- DIG ;
- CUT ;
- PLANT ;
- PICK_UP ;
- WATER ;
- RAKE ;
- INTERACT ;
- SIT.

Le contexte, les particules, l'objet manipulé et la réaction de l'environnement peuvent différencier les actions.

---

# 16. Direction artistique

## Pixel art moderne

Komorebi utilise une direction **pixel-art moderne**.

Le but n'est pas de reproduire artificiellement les contraintes d'une console rétro.

Le pixel-art constitue le langage graphique.

Des techniques modernes peuvent être utilisées pour :

- lumière ;
- ombres ;
- shaders ;
- particules ;
- eau ;
- transitions ;
- effets atmosphériques.

Référence importante : Moonfrost.

## Objectif

Sprites relativement simples + présentation moderne et riche.

La lumière doit participer fortement à la beauté du jeu.

---

# 17. Palette

Pas de contrainte artificielle du type palette 8/16 couleurs.

Une palette directrice cohérente sera définie.

Les familles de couleurs devront rester compatibles entre les assets.

---

# 18. Lumière

La lumière est considérée comme une partie importante de la direction artistique et non comme un simple polish final.

Les sprites devront respecter une direction lumineuse cohérente.

Le moteur pourra ensuite appliquer :

- ambiance selon l'heure ;
- teinte globale ;
- sources lumineuses simples ;
- ombres ;
- shaders ciblés ;
- effets atmosphériques.

Le web et Phaser/WebGL sont considérés comme suffisamment capables pour explorer cette direction, à condition de rester raisonnable.

---

# 19. Assets

La production d'assets constitue l'un des risques majeurs.

Principes :

- modularité ;
- réutilisation ;
- variantes ;
- composition ;
- éviter les assets ultra-spécifiques.

Préférer plusieurs variantes simples à un unique asset extrêmement détaillé répété partout.

Exemple :

`rock_base + moss_overlay + grass_edge`

plutôt que :

`rock_near_water_with_moss_and_grass.png`

Le CRE doit permettre d'exploiter cette modularité.

---

# 20. Animation du monde

Le monde doit paraître vivant sans nécessiter une animation complexe permanente de chaque élément.

Principes actuels :

- micro-animations ;
- animations asynchrones ;
- timings légèrement variables ;
- comportements contextuels ;
- animations génériques réutilisées ;
- effets moteur lorsque cela évite des assets supplémentaires.

Important :

> **Le monde ne doit pas être constamment agité. Il doit sembler constamment vivant.**

Un système physique complexe de vent n'est pas retenu pour la V1.

Une impression occasionnelle de brise pourra éventuellement être simulée avec des animations existantes si cela apporte suffisamment de valeur.

---

# 21. Temps

Pas de synchronisation avec l'heure réelle.

Le modèle Animal Crossing est explicitement écarté.

Komorebi utilisera un temps fictif accéléré.

## Cycle jour/nuit

Décision actuelle :

- environ **66 % jour** ;
- environ **33 % nuit**.

Le cycle doit être continu :

- aube ;
- matin ;
- journée ;
- golden hour ;
- crépuscule ;
- nuit.

Le temps doit principalement produire des changements d'ambiance et de comportement.

Principe :

> **Le temps crée des choses à observer, pas des choses à rater.**

---

# 22. Météo

La météo dynamique est souhaitée mais non nécessaire pour la première version.

Cible actuelle :

## V1.5

Si son coût technique et graphique reste raisonnable.

Exemples potentiels :

- pluie ;
- couvert ;
- brume ;
- variations légères.

La météo ne doit pas devenir une contrainte d'entretien.

---

# 23. Saisons

Les saisons sont envisagées pour une :

## V2

Elles ne seront jamais liées strictement aux saisons réelles.

Elles utiliseront leur propre temporalité de jeu.

La principale difficulté identifiée est le coût en assets.

---

# 24. Évolution hors ligne

Le serveur HomeLab ne fonctionnera pas nécessairement en permanence.

L'évolution du monde peut donc utiliser :

- timestamp de dernière sauvegarde ;
- timestamp actuel ;
- calcul du delta ;
- application agrégée des évolutions.

Ne jamais rejouer chaque minute d'absence.

Le coût du chargement doit dépendre principalement de l'état du monde, pas directement de la durée de l'absence.

Principe absolu :

> **Aucune punition liée à l'absence.**

---

# 25. Progression

Komorebi ne doit pas être conçu autour d'une boucle de gameplay prescriptive.

Éviter :

> faire A → gagner B → débloquer C → recommencer.

Référence : Minecraft.

Le jeu doit fournir des clés permettant au joueur d'inventer ses propres projets.

La progression pourra notamment enrichir :

- espèces végétales ;
- possibilités d'aménagement ;
- éléments ;
- interactions ;
- zones accessibles ;
- connaissances.

Mais le joueur doit rester responsable de ses propres intentions.

---

# 26. Son

Le sound design devra participer au sentiment de monde vivant.

Pistes :

- eau ;
- oiseaux ;
- insectes ;
- pluie ;
- pas ;
- végétation ;
- animaux ;
- ambiance nocturne.

Les sons répétitifs doivent utiliser des timings suffisamment variables pour éviter l'impression de boucle mécanique.

Ce sujet reste à cadrer plus précisément.

---

# 27. Géographie / environnement

La première grande direction reste un environnement tempéré de type français/européen.

Cela fournit déjà suffisamment de diversité sans multiplier immédiatement les biomes.

Les autres climats ne constituent pas une priorité.

---

# 28. Intérieur

Une partie intérieure est souhaitée à long terme.

Elle est explicitement repoussée après le cœur du jeu.

Elle pourra devenir un second chantier lorsque l'extérieur sera suffisamment convaincant.

---

# 29. Principales choses explicitement rejetées

Komorebi ne doit pas dériver vers :

- tâches quotidiennes ;
- FOMO ;
- grind ;
- farming obligatoire ;
- punition liée à l'absence ;
- économie artificielle omniprésente ;
- durabilité d'outils ;
- arbre d'amélioration artificiel ;
- grande map vide ;
- succession de rooms chargées indépendamment ;
- temps réel ;
- simulation biologique exhaustive ;
- grille visuellement dominante ;
- avatar nécessaire au premier MVP ;
- saisons nécessaires à la première version ;
- météo nécessaire au premier MVP ;
- simulation complexe du vent ;
- multiplication des systèmes avant validation du CRE.

---

# 30. Méthode de développement

Komorebi doit également être un projet d'apprentissage.

Le développeur principal doit comprendre le code qu'il écrit.

Les assistants IA doivent principalement agir comme :

- professeur ;
- architecte ;
- reviewer ;
- aide au debugging ;
- aide à la réflexion ;
- chef de projet léger.

Éviter le workflow :

> génération massive de code → copier/coller → fonctionnement sans compréhension.

Le développeur principal doit idéalement écrire lui-même l'essentiel du code.

Si une solution n'est pas comprise, ralentir et l'expliquer avant d'empiler davantage de code.

---

# 31. Gestion de la motivation

Komorebi est un projet long.

Il ne doit pas devenir un tunnel.

Principes :

- produire régulièrement quelque chose de visible ;
- éviter plusieurs semaines de travail purement infrastructurel ;
- découper le projet en étapes terminables ;
- accepter d'alterner temporairement avec d'autres projets comme Pulse ou Heartbeat en cas de lassitude ;
- ne pas confondre lassitude avec difficulté technique.

Une difficulté doit idéalement être comprise et résolue.

Une vraie lassitude peut justifier un changement temporaire de contexte.

---

# 32. Grandes étapes envisagées

## Étape 1 — MVP / POC CRE

Valider la mécanique centrale.

## Étape 2 — Vertical Slice

Créer un petit morceau représentatif de l'expérience visuelle finale.

## Étape 3 — Prototype jouable

Avatar, déplacement, caméra et premières interactions.

## Étape 4 — Alpha personnelle

Première version suffisamment vivante pour être utilisée régulièrement.

## Étape 5 — V1

Version cohérente et suffisamment complète du cœur de Komorebi.

Les fonctionnalités futures comme météo avancée, saisons, intérieur ou personnalisation viennent ensuite selon leur intérêt réel.

---

# 33. Priorité actuelle

La priorité absolue est :

> **prouver que le CRE fonctionne et qu'il est satisfaisant.**

Aucune autre fonctionnalité ne doit détourner le premier prototype de cet objectif.