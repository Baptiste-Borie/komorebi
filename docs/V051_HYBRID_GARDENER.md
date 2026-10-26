# V0.51 — VRAI hybride V0.44 / V0.47

Reprise de véritables maillages GLB (pas des surfaces superposées au Ranger).
- Visage / bouche / yeux / sourcils : KayKit V0.47, cheveux Ranger supprimés.
- Cheveux et chapeau : ancien `gardener-v044.glb`.
- Tee-shirt, bavette, bretelles, poche et coutures : maillages V0.44.
- Bras et manches : V0.44 repositionnés en T-pose puis pesés pour `upperarm`,
  `lowerarm`, `wrist`, `hand` natifs KayKit.
- Jambes et chaussures : les *maillages* `Ranger_LegLeft` et `Ranger_LegRight`
  de V0.47 restent inchangés. La teinte du pantalon correspond à l'ancien.
- La jonction de taille conserve le haut de salopette V0.44 et découpe proprement
  la partie sous y=.505 pour laisser les nouvelles jambes.
- Pelle : outil V0.47 réutilisé ; placement et geste NON encore validés.

## Revue humaine requise

Vérifier en PRIORITÉ : proportions de la tête et du chapeau, couture cou,
épaule, intérieur du coude, poignets/mains, croisement du tissu à la taille,
rotation du poignet et pelle pendant `Digging` à 20/45/80 %.

Les GLB V0.44 et V0.47 ne sont pas écrasés. Le fichier de travail est
`public/assets/kaykit-v045/gardener-v051.glb`, et le ZIP de revue inclut
les trois modèles et des captures de leurs poses.

**Statut : implémentation géométrique, pas validation de la direction artistique.**
