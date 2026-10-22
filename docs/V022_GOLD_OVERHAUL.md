# V0.22 — GOLD OVERHAUL

Base : `f6534442d6ec2b8b6c91a85316c95f867c9cb1f3` (V0.21).

## Choix graphiques

- Éclairage de jour commun au jardin et à l’atelier, tone mapping Neutral, lumière principale légèrement chaude et ambiance neutre. Les conifères gardent un vert plus profond ; les feuillus et buissons ont des accents jaune-vert.
- Couleurs de facettes en espace linéaire, léger gradient de valeur sous les couronnes, variation contenue. Un seul matériau vertex-color permet de fusionner les teintes d’une même plante.
- Ombres de feuillage réelles, masque de contact radial partagé, ombres calculées seulement à la reconstruction de la scène.
- Mare avec profondeur chromatique, hauts-fonds, reflets brisés et anneaux animés. Un matériau et une surface, sans postprocessing ni texture externe. Le mouvement réduit est respecté.
- Berges conformées au terrain et creux sous chaque mare. Chemin, petites pierres et fougères décoratives se reconstruisent en fonction de toutes les mares.
- Tranche de terre suivant exactement le terrain. Le sommet de l’ancien socle traversait les creux et formait de grandes taches sombres.
- Petites fougères instanciées à partir du vrai modèle botanique, avec frondes en rosette plus basse et ouverte. Le cadrage de l’atelier respecte les dimensions de chaque spécimen. Commandes SVG lisibles sans police d’icônes externe.

## Compatibilité et corrections

Aucun changement du format ni de la clé de sauvegarde. La densification retire uniquement ses propres ajouts de session : elle ne supprime plus les plantes personnelles dont le seed dépasse 100. Les matériaux sont partagés ; les géométries remplacées sont libérées. Le rendu du jardin est suspendu pendant l’ouverture de l’atelier.

## Vérification

`npm run build` vérifie TypeScript strict et le bundle Vite. La revue ouvre le build de production et fait échouer le processus en cas d’erreur console, de compilation shader ou d’assertion.

Huit contrôles couvrent placement et sauvegarde/rechargement, suppression, densification réversible, atelier/variantes/choix d’espèce, contemplation, stabilité des ressources GPU, ajout d’une mare ailleurs et animation/mouvement réduit.

Les captures fixent l’horloge de l’eau à quatre secondes pour faciliter les comparaisons. Les contrôles vérifient aussi l’horloge normale. Le manifeste donne les appels GPU et triangles de chaque vue, hors reconstruction initiale des ombres. La compilation conserve l’avertissement Vite du bundle principal > 500 kB, déjà présent avant cette itération.

## Limites à examiner

- Validation visuelle réalisée sous Chromium avec SwiftShader : la fluidité sur le GPU de l’utilisateur reste à vérifier.
- Les mares voisines ne fusionnent pas leurs contours. Les plantes placées manuellement peuvent toujours se chevaucher : cette passe adapte le décor automatique et n’impose pas de nouvelle règle de placement.
- Chaque modification reconstruit encore le jardin complet. Les appels GPU baissent, mais l’édition de très grandes scènes devra être profilée séparément.
- Les reflets de l’eau sont stylisés, sans reflet réel des objets. La lumière reste fixe en plein jour.
- L’objectif reste une progression visuelle du prototype ; le niveau de finition artistique doit être jugé sur les images, sans prétendre égaler Townscaper.

## Script de migration

Exécuter `bash ~/Téléchargements/komorebi-v022-gold-overhaul.sh` depuis le dépôt propre sur `main` à la version de base. Le script vérifie l’origine et le commit, installe les dépendances du lockfile, construit la V0.21, applique un patch Git vérifié, capture la référence, construit et teste la V0.22, puis commit et push sans force.

Les références se trouvent dans `reviews/before-v022/`, les nouvelles vues à la racine de `reviews/`. Elles seront remplacées lors d’une prochaine revue. `--check-only` exécute la même migration et ses vérifications sans fetch, commit ni push ; à utiliser dans une copie de travail dédiée. Ce mode modifie quand même les fichiers.

En cas d’échec, les modifications restent disponibles pour diagnostic ; aucun reset, stash ou nettoyage des fichiers personnels n’est effectué. Si seul le push échoue, le commit local reste présent.
