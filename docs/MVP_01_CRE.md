# Komorebi — MVP 01 : CRE Proof of Concept

> Premier jalon technique de Komorebi.
>
> Ce MVP n'est pas une petite version du jeu complet.
>
> Il constitue une **Proof of Concept de la Réponse Contextuelle de l'Environnement (CRE)**.

---

# 1. Question à laquelle le MVP doit répondre

> **Peut-on créer un système de placement sur grille dans lequel les éléments réagissent suffisamment bien à leur contexte pour que le résultat cesse rapidement de ressembler à une simple juxtaposition de tiles ?**

Si la réponse est oui, le cœur technique de Komorebi est validé.

---

# 2. Objectif

Construire un petit sandbox technique dans lequel le joueur peut :

1. sélectionner un élément ;
2. le placer sur une petite grille dimétrique ;
3. retirer ou modifier un élément ;
4. observer le système analyser localement le contexte ;
5. voir les éléments concernés adapter automatiquement leur rendu.

Le prototype doit devenir suffisamment satisfaisant pour donner envie de placer et retirer des éléments simplement pour observer les compositions obtenues.

---

# 3. Stack

- TypeScript
- Phaser
- Vite
- npm

Pas de React.

Pas de backend.

Pas de base de données.

---

# 4. Projection

Projection :

**dimétrique 2:1**

Tile logique de référence :

**64 × 32 px**

Les sprites ne sont pas obligatoirement limités à 64 × 32.

---

# 5. Taille du terrain

Utiliser une petite grille de test.

Ordre de grandeur envisagé :

- `10 × 10` ;
- éventuellement `15 × 15` si nécessaire.

La taille exacte n'est pas importante.

Le terrain doit simplement être assez grand pour expérimenter le CRE sans introduire les problématiques d'un monde complet.

---

# 6. Éléments du MVP

Limiter volontairement le prototype à environ **quatre familles d'éléments**.

Candidats actuels :

## Sol / herbe

Base du terrain.

## Eau

Élément idéal pour tester :

- voisinage ;
- raccords ;
- coins ;
- bordures ;
- autotiling.

## Roche

Permet de tester :

- placement d'objet ;
- variantes ;
- snapping ;
- relation avec le terrain ou l'eau.

## Fleur / petite plante

Permet de tester :

- plusieurs éléments sur une zone ;
- offsets ;
- regroupements ;
- variations ;
- création visuelle d'un petit massif.

Ces choix peuvent évoluer si un autre élément permet de mieux tester le CRE.

---

# 7. CRE minimum

Le système doit au minimum être capable de :

## Lire le voisinage

Lorsqu'un élément change, inspecter les tiles pertinentes autour de lui.

Première approche probable :

- tile modifiée ;
- voisins directs ;
- éventuellement diagonales si nécessaire.

Éviter de recalculer toute la map lorsqu'une modification locale suffit.

## Recalculer les éléments concernés

Un placement ou retrait peut modifier :

- l'élément placé ;
- les voisins immédiats ;
- leurs variantes graphiques.

## Choisir une représentation contextuelle

Exemple eau :

une tile isolée ne possède pas le même rendu qu'une tile entourée d'eau.

## Gérer le retrait

Le CRE doit fonctionner dans les deux sens.

Ajouter un élément peut créer un raccord.

Le retirer doit correctement restaurer les variantes des éléments restants.

---

# 8. Expériences CRE visées

Ces comportements servent de cibles de recherche et non de contrat technique définitif.

## Eau

Plusieurs tiles d'eau adjacentes doivent progressivement être perçues comme une seule mare plutôt que comme plusieurs losanges indépendants.

## Fleurs

Plusieurs fleurs proches peuvent :

- utiliser différents offsets ;
- sélectionner différentes variantes ;
- éviter les alignements trop parfaits ;
- éventuellement former visuellement un petit massif.

## Roche

Une roche peut :

- être légèrement repositionnée dans son espace autorisé ;
- utiliser une variante adaptée ;
- réagir à la proximité d'eau ou de végétation.

Pour le MVP, la réaction peut être purement graphique.

Il n'est pas nécessaire d'implémenter une véritable évolution écologique.

---

# 9. Ce que le CRE du MVP n'est PAS

Le MVP ne doit pas essayer de résoudre immédiatement :

- croissance des plantes ;
- propagation temporelle ;
- biodiversité ;
- arrivée d'animaux ;
- simulation d'humidité ;
- saisons ;
- météo ;
- évolution hors ligne ;
- véritable simulation écologique.

Ces éléments pourront plus tard utiliser le CRE.

Le MVP doit uniquement prouver que **la réponse contextuelle immédiate au placement fonctionne**.

---

# 10. Interface

L'interface doit rester minimale.

Besoin uniquement de pouvoir :

- choisir l'élément actif ;
- placer ;
- retirer ;
- éventuellement réinitialiser la grille.

Aucune interface définitive n'est nécessaire.

Les outils de debug sont autorisés et même encouragés.

Il peut être utile de pouvoir afficher temporairement :

- coordonnées des tiles ;
- voisins ;
- type de tile ;
- état CRE ;
- bounding boxes.

Ces informations sont destinées au développement, pas à la direction artistique finale.

---

# 11. Assets

Le MVP n'a pas besoin de posséder la direction artistique définitive.

Les premiers assets peuvent être :

- temporaires ;
- simples ;
- dessinés spécifiquement pour comprendre le système.

Cependant, le prototype doit progressivement utiliser quelques assets suffisamment propres pour vérifier que le CRE fonctionne également visuellement.

Ne pas passer plusieurs semaines à produire des assets avant d'avoir un système fonctionnel.

---

# 12. Architecture

L'architecture doit rester simple et compréhensible.

Le projet constitue également un exercice d'apprentissage.

Le développeur principal doit comprendre notamment :

- fonctionnement d'une scène Phaser ;
- coordonnées monde ;
- coordonnées grille ;
- projection dimétrique ;
- gestion du clic ;
- modèle d'une tile ;
- voisinage ;
- règles CRE ;
- rendu d'un élément ;
- recalcul local.

Éviter les abstractions prématurées.

Ne pas construire une architecture capable de gérer 500 espèces avant d'en avoir besoin.

---

# 13. Méthode de développement

Le développeur principal écrit et comprend le code.

Les assistants IA servent principalement de :

- professeur ;
- aide à la conception ;
- reviewer ;
- aide au debugging.

Lorsqu'une notion nouvelle apparaît :

1. l'expliquer ;
2. construire une petite implémentation ;
3. vérifier qu'elle est comprise ;
4. seulement ensuite passer au système suivant.

Éviter le copier/coller massif de code généré.

---

# 14. Étapes proposées

## Étape A — Phaser minimal

Objectif :

- lancer le projet ;
- comprendre la scène initiale ;
- afficher quelque chose ;
- comprendre la boucle Phaser minimale.

## Étape B — Une tile dimétrique

Objectif :

- afficher une tile 64 × 32 ;
- comprendre sa géométrie ;
- comprendre son positionnement.

## Étape C — Grille

Objectif :

- générer une petite grille ;
- comprendre la conversion `grid → screen`.

## Étape D — Interaction

Objectif :

- détecter la tile sous la souris ;
- sélectionner une tile ;
- afficher clairement la sélection.

## Étape E — Placement

Objectif :

- créer un modèle de tile ;
- placer un premier type d'élément ;
- retirer cet élément.

## Étape F — Voisinage

Objectif :

- identifier correctement les voisins ;
- recalculer uniquement une zone locale.

## Étape G — Premier CRE

Commencer idéalement par l'eau.

Objectif :

- modifier automatiquement le rendu selon les voisins ;
- gérer ajout et retrait.

## Étape H — CRE multiéléments

Ajouter roche et végétation.

Objectif :

- tester plusieurs types de réponses contextuelles ;
- introduire variantes et offsets.

## Étape I — Polish POC

Objectif :

- améliorer les assets nécessaires ;
- supprimer les bugs importants ;
- rendre le petit sandbox agréable à manipuler.

---

# 15. Estimation

Première estimation :

**environ 20 à 30 heures de développement et d'apprentissage.**

Ordre de grandeur calendaire :

**environ 3 à 5 semaines**, selon le rythme, les expérimentations et les pauses entre projets.

Cette estimation comporte une incertitude importante liée au CRE, qui constitue précisément la partie de R&D du prototype.

Ce chiffre n'est pas une deadline.

---

# 16. Critères de réussite

Le MVP est considéré comme réussi si :

- la grille dimétrique fonctionne ;
- le placement est compris et maîtrisé ;
- plusieurs éléments peuvent être ajoutés et retirés ;
- les modifications déclenchent un recalcul contextuel local ;
- l'eau forme des raccords cohérents ;
- au moins un autre type d'élément possède une réaction contextuelle convaincante ;
- la grille devient moins perceptible grâce au rendu ;
- manipuler le prototype est déjà légèrement satisfaisant.

Critère subjectif mais important :

> **On doit avoir envie de jouer quelques minutes avec le système alors qu'il n'existe encore ni progression, ni avatar, ni véritable jeu.**

---

# 17. Hors scope absolu

Ne pas ajouter au MVP :

- avatar ;
- animaux ;
- carnet ;
- sauvegarde complexe ;
- backend ;
- comptes ;
- intérieur ;
- monde complet ;
- soft locks ;
- cycle jour/nuit ;
- shaders avancés ;
- météo ;
- saisons ;
- évolution hors ligne ;
- progression ;
- économie ;
- système d'outils complet ;
- quêtes ;
- tutoriel final ;
- sound design complet.

Une idée appartenant à cette liste peut être notée pour plus tard.

Elle ne doit pas être implémentée dans le MVP.

---

# 18. Condition de sortie

Le MVP doit être explicitement déclaré terminé avant de commencer la phase suivante.

Ne pas transformer progressivement le MVP en jeu complet.

Lorsque les critères de réussite sont atteints :

1. arrêter l'ajout de fonctionnalités ;
2. faire un bilan technique ;
3. documenter ce qui a été appris ;
4. identifier les limites du CRE ;
5. créer le scope de l'étape suivante.

Étape suivante :

## **Vertical Slice Komorebi**

Cette phase aura pour objectif de montrer pour la première fois **à quoi pourrait réellement ressembler Komorebi**, en ajoutant notamment une première direction artistique cohérente, davantage d'éléments et les premiers systèmes visuels représentatifs du jeu.