# Komorebi — Vision

> Ce document constitue la vision fondatrice du projet Komorebi.
>
> Il décrit l'intention du projet, sa philosophie et les grandes directions imaginées avant le cadrage technique.
>
> Les décisions plus récentes et plus précises sont consignées dans `PROJECT_CONTEXT.md`. Le périmètre du premier prototype est défini séparément dans `MVP_01_CRE.md`.

---

## 1. Vision

**Komorebi** est un petit jeu sandbox contemplatif centré sur un environnement naturel vivant que le joueur peut progressivement restaurer, transformer et s'approprier.

Le cœur de l'expérience n'est pas de terminer des objectifs, gagner des niveaux ou optimiser une économie.

Le plaisir recherché vient plutôt de :

- transformer progressivement un environnement ;
- créer un lieu qui correspond réellement au joueur ;
- voir la faune et la flore réagir à ses choix ;
- découvrir naturellement de nouvelles espèces, interactions et possibilités ;
- observer son environnement ;
- prendre plaisir à simplement habiter et regarder le lieu que l'on a construit.

Le jeu doit progressivement provoquer un sentiment simple :

> **« C'est mon endroit. »**

Le jardin constitue actuellement l'incarnation principale de cette idée, sans nécessairement définir toutes les possibilités futures de Komorebi.

---

# 2. Philosophie générale

## Liberté avant progression

Komorebi ne doit pas donner au joueur une liste de choses qu'il doit accomplir.

Le joueur peut décider de consacrer son temps à :

- restaurer un étang ;
- créer un verger ;
- aménager un jardin très végétal ;
- créer quelque chose de beaucoup plus minéral ;
- observer les animaux ;
- découvrir les espèces ;
- décorer ;
- s'occuper principalement des plantes ;
- ou simplement regarder son environnement vivre.

Ces façons de jouer doivent toutes être valides.

Il n'existe pas de « bonne manière » de jouer.

Un joueur qui transforme une grande partie de son terrain en verger ne doit pas avoir l'impression d'avoir ignoré le jeu.

**Son verger est sa partie.**

---

# 3. Pas d'obligation

Komorebi ne doit pas générer de sentiment de retard, de dette ou de devoir.

À éviter notamment :

- quêtes quotidiennes ;
- objectifs obligatoires ;
- séries de connexion ;
- événements définitivement ratables ;
- farming forcé ;
- grind destiné uniquement à ralentir la progression ;
- tâches artificielles destinées à remplir le temps de jeu ;
- entretien quotidien obligatoire ;
- sanctions liées à l'absence du joueur.

Le joueur doit pouvoir quitter Komorebi plusieurs semaines puis revenir sans avoir l'impression d'avoir mal joué.

Le jeu doit :

> **donner envie de revenir, jamais obliger à revenir.**

---

# 4. Un sandbox plutôt qu'une liste d'objectifs

Komorebi doit fournir au joueur des **possibilités** plutôt que des objectifs imposés.

Minecraft constitue une référence importante sur ce point : le jeu fournit suffisamment de systèmes et d'outils pour que le joueur invente ses propres projets.

Komorebi cherche une philosophie similaire à une échelle beaucoup plus contemplative.

Le jeu ne dit pas nécessairement :

> Construis un étang.

Le joueur peut simplement regarder un endroit et penser :

> J'aimerais avoir un étang ici.

Le système doit ensuite lui donner les moyens de réaliser cette intention.

La progression doit donc principalement enrichir le **vocabulaire créatif** du joueur plutôt que lui donner une succession de tâches.

---

# 5. Restauration

Le lieu initial peut être partiellement abandonné, envahi ou dégradé.

Il ne doit cependant pas ressembler à un environnement mort ou détruit.

La nature y a plutôt repris ses droits.

Le joueur peut trouver :

- végétation dense ;
- étang envahi ;
- chemins recouverts ;
- zones temporairement inaccessibles ;
- vieux éléments décoratifs ;
- structures anciennes ;
- traces d'une occupation passée.

La restauration ne doit jamais devenir une checklist.

Éviter :

> Étang : 42 % restauré  
> Retirer 7 branches  
> Récompense : 200 pièces

Le joueur restaure un endroit principalement parce qu'il souhaite le transformer.

Et surtout :

> **restaurer ne signifie pas nettoyer toute la nature.**

Une souche, des feuilles mortes, une zone sauvage ou un tas de bois peuvent parfaitement avoir une valeur écologique.

---

# 6. Conséquences plutôt que récompenses

Les actions du joueur doivent principalement provoquer **des conséquences dans le monde** plutôt que distribuer des récompenses abstraites.

Exemple :

étang réaménagé  
→ végétation aquatique  
→ insectes  
→ conditions favorables  
→ arrivée potentielle de grenouilles

La grenouille n'est pas la récompense distribuée par un système.

**Sa présence est une conséquence du jardin créé par le joueur.**

Le joueur ne doit pas nécessairement connaître toute la chaîne à l'avance.

Le mystère et la découverte font partie de l'expérience.

---

# 7. Réponse Contextuelle de l'Environnement — CRE

La mécanique fondamentale envisagée pour Komorebi est la :

## **CRE — Réponse Contextuelle de l'Environnement**

Principe :

> **Le joueur place. Le monde interprète. L'environnement répond.**

Lorsqu'un élément est ajouté, déplacé ou retiré, son environnement peut être réévalué localement.

La réponse peut être immédiate :

- snapping ;
- raccords ;
- choix d'une variante graphique ;
- repositionnement subtil ;
- fusion visuelle de plusieurs éléments ;
- adaptation des cases voisines.

Elle peut également devenir progressive :

- apparition de mousse ;
- propagation végétale ;
- évolution d'un massif ;
- changement d'habitat ;
- arrivée de certaines espèces.

Exemples :

- plusieurs fleurs proches peuvent progressivement former visuellement un massif ;
- un rocher proche d'une zone humide peut développer de la mousse ;
- les bordures d'un étang se recomposent automatiquement ;
- certaines plantes peuvent s'intégrer aux éléments adjacents ;
- un environnement suffisamment favorable peut attirer une espèce animale.

L'objectif est que la grille et les objets individuels disparaissent progressivement derrière la perception d'un **environnement cohérent et vivant**.

---

# 8. Écosystème

Komorebi possède une simulation écologique simplifiée.

L'objectif n'est pas de reproduire exhaustivement la nature.

Le jeu doit simplement simuler suffisamment de relations pour donner l'impression d'un environnement cohérent.

Certaines données internes pourront éventuellement représenter :

- humidité ;
- présence d'eau ;
- lumière ;
- ombre ;
- type de végétation ;
- densité végétale ;
- présence de fleurs ;
- présence de fruits ;
- type de sol ;
- biodiversité locale.

Ces informations ne doivent pas nécessairement être exposées sous forme de statistiques.

Le joueur doit idéalement apprendre à **lire son environnement visuellement**.

---

# 9. Faune

Les animaux doivent principalement apparaître parce que l'environnement leur convient.

Ils ne sont pas des objets décoratifs directement placés par le joueur.

L'architecture devra privilégier des comportements mutualisés.

Exemple conceptuel :

Animal  
→ Oiseau  
→ Insecte  
→ Petit mammifère  
→ Amphibien

Des comportements génériques peuvent être partagés :

- déplacement ;
- repos ;
- fuite ;
- alimentation ;
- boisson ;
- interaction avec certains éléments.

Chaque espèce possède ensuite quelques particularités.

Le but est de créer :

> **l'illusion d'un monde riche sans programmer une simulation biologique complète pour chaque espèce.**

---

# 10. Plantes

Les plantes ont une importance comparable à la faune.

Elles ne doivent pas simplement servir de décoration.

Selon le scope futur, elles pourront posséder :

- croissance ;
- floraison ;
- préférences environnementales ;
- interactions avec certaines espèces ;
- propagation ;
- réactions aux saisons.

Ces systèmes devront rester légers et non punitifs.

Une plante ne doit pas devenir une obligation quotidienne.

---

# 11. Observation et carnet

L'observation constitue une activité facultative.

Un carnet naturaliste pourrait progressivement conserver les espèces rencontrées.

Il ne doit pas fonctionner comme une checklist obligatoire.

Une première observation pourrait identifier une espèce.

Des observations supplémentaires pourraient enrichir sa fiche :

- croquis ;
- comportements ;
- préférences ;
- relations écologiques ;
- informations réelles simples.

Une légère dimension éducative peut émerger de ces observations.

Cependant :

> **ne jamais ouvrir le carnet doit rester une manière parfaitement valide de jouer.**

---

# 12. Dimension éducative

Lorsque Komorebi représente une relation écologique réelle, il doit essayer d'être crédible.

Il n'est pas nécessaire d'être scientifiquement exhaustif.

Mais lorsqu'une information peut facilement être correcte, elle devrait l'être.

Le joueur peut ainsi apprendre accidentellement quelques éléments concernant :

- plantes ;
- animaux ;
- insectes ;
- habitats ;
- saisons ;
- relations écologiques simples.

Komorebi ne doit cependant jamais devenir un logiciel éducatif.

L'apprentissage doit rester discret.

---

# 13. Temps et absence

Le monde peut évoluer entre deux sessions.

Le serveur n'étant pas destiné à fonctionner 24 h/24, cette évolution peut être calculée à partir de la dernière sauvegarde lors du retour du joueur.

Il n'est pas nécessaire de simuler chaque seconde écoulée.

Les évolutions peuvent être calculées de manière agrégée.

Principe fondamental :

> **L'absence du joueur ne doit jamais être punie.**

Pas de centaines de mauvaises herbes parce que le joueur n'est pas venu.

Pas d'animaux perdus parce qu'il n'a pas entretenu une zone quotidiennement.

L'évolution hors ligne doit être positive ou neutre.

Des conséquences négatives importantes peuvent exister lorsqu'elles découlent d'une décision réelle du joueur, mais pas simplement de son absence.

---

# 14. Temps et exploitation

Komorebi ne cherche pas spécialement à protéger son économie ou sa progression contre le joueur.

Si quelqu'un souhaite :

- faire passer beaucoup de temps ;
- déplacer constamment ses plantes ;
- accélérer certains cycles ;
- se concentrer exclusivement sur une mécanique ;

il peut être préférable de le laisser faire plutôt que d'introduire artificiellement :

- cooldowns ;
- monnaie ;
- durabilité ;
- timers ;
- restrictions.

Le plaisir du joueur est plus important que la protection d'un équilibre compétitif inexistant.

---

# 15. Intérieur

L'extérieur reste le cœur de Komorebi.

Ordre de grandeur conceptuel historique :

- environ 60–70 % extérieur ;
- environ 30–40 % intérieur et espaces complémentaires.

L'intérieur est cependant hors du scope initial.

À terme, il pourrait accueillir :

- décoration ;
- rangement ;
- atelier ;
- bureau ;
- plantes d'intérieur ;
- collections ;
- souvenirs liés au jardin.

L'intérieur pourrait devenir une mémoire de ce qui s'est produit dehors.

---

# 16. Outils

Les outils peuvent exister mais ne doivent jamais devenir une dette.

À éviter :

- durabilité ;
- réparations obligatoires ;
- multiples tiers artificiels ;
- arbres d'amélioration inutiles ;
- farming de matériaux nécessaire simplement pour continuer à jouer.

Une pelle peut simplement être une pelle.

L'intérêt vient de ce qu'elle permet de faire.

---

# 17. Contemplation

Komorebi doit être agréable même lorsque le joueur ne fait rien.

Regarder son environnement constitue une activité valide.

Le monde peut donner cette impression grâce à :

- eau ;
- animaux ;
- insectes ;
- végétation ;
- variations de lumière ;
- micro-animations ;
- météo future ;
- sons d'ambiance.

Le monde ne doit pas nécessairement être constamment agité.

> **Il doit sembler constamment vivant.**

---

# 18. Inspirations

Les références ne constituent pas des modèles à reproduire intégralement.

Chaque jeu sert de référence pour certains aspects précis.

## Animal Crossing

- attachement à un lieu personnel ;
- territoire relativement compact ;
- espace rapidement mémorisable ;
- environnement continu ;
- appropriation progressive.

À éviter :

- contraintes liées au temps réel ;
- obligations quotidiennes ;
- certaines frictions artificielles.

## Tiny Glade

- plaisir intrinsèque de construire ;
- interactions satisfaisantes ;
- éléments qui s'intègrent intelligemment ;
- création sans objectifs imposés.

## Terra Nil

- environnement qui répond aux interventions ;
- transformation écologique visible ;
- sensation de voir la nature reprendre vie.

## Minecraft

- liberté ;
- absence d'objectif réellement nécessaire à la majorité des parties ;
- outils permettant au joueur de créer ses propres projets.

## Moonfrost

Référence visuelle importante pour :

- pixel art moderne ;
- profondeur ;
- lumière ;
- ambiance chaleureuse.

## PokéRogue

Référence technique importante :

- jeu web à grande échelle ;
- utilisation de Phaser ;
- TypeScript ;
- preuve qu'un projet pixel-art conséquent peut fonctionner dans le navigateur.

## Townscaper

Référence pour :

- simplicité de l'interaction ;
- plaisir immédiat de placement ;
- transformation contextuelle du résultat.

---

# 19. Ce que Komorebi n'est pas

Komorebi n'a actuellement pas vocation à devenir :

- un farming game classique ;
- un jeu de survie ;
- un jeu de crafting intensif ;
- un city-builder ;
- un idle game ;
- un gacha ;
- un jeu de collection obligatoire ;
- une simulation biologique exhaustive ;
- un jeu compétitif ;
- un jeu centré sur l'optimisation ;
- un jeu demandant une présence quotidienne ;
- un jeu construit autour de quêtes et de tâches.

---

# 20. Risques principaux

## Explosion du scope

Le projet peut facilement devenir gigantesque à cause du nombre potentiel de :

- plantes ;
- animaux ;
- animations ;
- interactions ;
- états ;
- objets ;
- décors ;
- saisons ;
- comportements.

La richesse doit principalement venir de la **combinaison de systèmes simples**.

## Production d'assets

La création graphique peut devenir plus coûteuse que le développement.

La direction artistique doit être pensée autour de cette contrainte.

## CRE

La Réponse Contextuelle de l'Environnement constitue à la fois la mécanique la plus intéressante et l'une des plus grandes inconnues techniques.

Elle doit être validée très tôt par une preuve de concept.

## Trop de contenu avant le plaisir

Komorebi ne doit pas nécessiter cent espèces et mille objets avant de devenir intéressant.

Une petite version doit déjà produire :

> **plaisir de transformer + plaisir d'observer + attachement au lieu.**

---

# 21. Principe directeur

Lorsqu'une décision de game design est difficile, revenir à cette question :

> **Est-ce que cette mécanique aide le joueur à créer son endroit, à voir le monde lui répondre ou à prendre plaisir à simplement y être ?**

Si la réponse est non, sa présence dans Komorebi doit être remise en question.