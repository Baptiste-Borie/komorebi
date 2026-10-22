# V0.23 — Townscaper Rendering Study

Base inspectée : `main`, `f8f7345bc0c29e00faa53074d9787196f5b03501` (V0.22).

## Étude des références

| Référence examinée | Observation vérifiable | Adaptation à Komorebi |
| --- | --- | --- |
| [Reinder Nijhoff, article WebGL](https://reindernijhoff.net/2021/11/townscapers-rendering-style-in-webgl/) et [démonstration](https://renderqueue.dev/townscaper) | Les exports OBJ et trois textures transportent des conventions de matériaux ; l'article décrit notamment les lignes liées aux coordonnées de texture et les ouvertures booléennes avec Carmack's reverse. | Séparer pigment, motif et réponse à la lumière. Ni import OBJ Townscaper, ni fenêtres booléennes : aucun intérêt pour nos végétaux. L'article et la démonstration ont été consultés ; le code complet du moteur n'a pas été audité. |
| [Pretty Fly Games, projet Unity URP](https://www.patreon.com/prettyflygames/posts/import-models-59674406) | Archive publique téléchargée et inspectée : graphes Houses, Plants, EvenOddUV, PaletteMaterialLookup, TileLookUp et AnimatePlants. Propriétés distinctes de palette, couleur, matériau, occlusion, rugosité et vent. Le fichier Outline utilise des différences de profondeur et de normales. | Une petite texture de données originale, découplée des palettes et de l'éclairage Three.js. Implémentation GLSL indépendante ; ni ShaderGraph ni code HLSL importé. |
| [Townscaper TextureManager](https://github.com/mokojm/Townscaper-TextureManager) | Le README distingue les thèmes TownColor/TownMaterial de TownPalette. Le dépôt fournit une licence Apache-2.0 ; elle ne donne pas de droits sur les textures originales du jeu. | Les pigments restent définis par les espèces ; les détails de surface sont partagés. Pas d'affirmation sur une signification exacte des canaux propriétaires non documentée dans le README. |
| [Oskar Stålberg, fil du 10 novembre 2022](https://threadreaderapp.com/scrolly/1590669875869286400) | Recherche sur des billboards d'herbe : texture de contraste, échantillonnage à la base et raycast dans le vertex shader pour le fond ; suppression du contour herbe contre herbe. Ce fil ne prouve pas le pipeline livré de Townscaper. | Même principe de sélection par contraste, mais méthode différente : couleur et profondeur de l'image rendue. Aucun raycast par brin ni texture de contraste du monde. |

Aucune licence explicite de réutilisation du moteur WebGL ou de l'archive Unity n'a été établie. Aucun code ni asset provenant de ces projets n'est distribué ici. La texture RGBA 128×128 de Komorebi est générée par notre propre code déterministe ; aucun téléchargement à l'exécution.

## Rendu retenu

- **Surfaces** : `SurfaceTexture.ts` génère des variations lentes, des petites formes de feuilles, des nervures et un grain, dans quatre canaux indépendants. `SurfaceShader.ts` les projette dans le monde par la face dominante, avec une seule lecture plutôt que trois échantillons triplanaires, sans UV additionnels. Les détails fins s'estompent avec leur taille à l'écran ; les lumières, ombres et conversions colorimétriques de Three.js sont conservées.
- **Volumes** : variations arbitraires par triangle atténuées ; assombrissement de proximité entre lobes de couronne calculé une fois à la reconstruction et stocké dans les couleurs de sommet. C'est une approximation par ellipsoïdes, pas une occlusion physique. Les dessous conservent une légère lumière verte/bleue.
- **Terrain** : variations à plusieurs échelles, empreintes végétales, zones plus humides près de toutes les mares, usure légère au voisinage du chemin. Ces transitions suivent les placements et suppressions. Pas de pics d'herbe ni de géométrie supplémentaire.
- **Contours expérimentaux, non activés par défaut** : `Contours.ts` effectue une seule passe de résolution, après le rendu habituel. Quatre voisins couleur/profondeur détectent uniquement les bords intérieurs présentant un contraste suffisant. Le pigment s'assombrit au maximum de 20 %, sans trait noir uniforme. Profondeur orthographique du jardin et perspective de l'atelier traitées séparément. Activer avec `?contours=1` (ou `&contours=1` si d’autres paramètres sont présents). Le gain visuel est trop discret pour imposer le surcoût mesuré ; le rendu normal reste direct.
- **Eau** : dégradé existant et anneaux conservés, avec filtrage des lignes fines, variations du fond, fragments de caustiques, reflet de ciel dépendant de l'angle et liseré de rive. Il s'agit d'indices graphiques de profondeur et de reflets analytiques ; ni profondeur réelle du fond ni réflexion des arbres.
- **Lumière** : soleil légèrement moins fort, remplissage plus présent et ombres moins dures ; aucune augmentation globale de saturation, aucune LUT orange.

## Coût et limites

La texture de données représente environ 85 Kio avec mipmaps. Les matériaux partagés et le regroupement des géométries de V0.22 sont conservés. Les détails n'ajoutent aucun triangle. Lorsqu'il est activé, le contour ajoute un triangle plein écran et un draw call, ainsi qu'une cible HDR couleur/profondeur multisamplée, redimensionnée et libérée avec le renderer. Le coût mémoire dépend de la résolution et le coût GPU est réel malgré le faible nombre de draw calls. Si `EXT_color_buffer_float` manque, le rendu direct est utilisé automatiquement.

L'ombrage interne n'est pas du SSAO. Les motifs ne changent pas les silhouettes géométriques : cette version enrichit leurs surfaces, elle ne résout pas à elle seule tout l'écart artistique avec Townscaper. Les contours restent volontairement discrets et peuvent disparaître entre objets proches en couleur ou en profondeur. L'eau ne reflète pas le jardin. Pas de nouvelles dépendances.

## Validation et reproduction

`npm run build` compile TypeScript strict puis le bundle Vite. `npm run review` vérifie les interactions, les sauvegardes, l'atelier, les reconstructions et l'animation, puis capture neuf vues à 1440×900, DPR 1, temps d'eau fixé à 4. Toute erreur console ou shader invalide la revue. Les contrôles activent temporairement les contours, puis reviennent au rendu direct avant les captures. Les captures et leurs fragments Base64 sont vérifiés avant publication du manifeste.

Le script de migration produit quatre vues **avant** sur le build V0.22, puis neuf **après** sur V0.23. Les cadrages communs sont identiques ; `reviews/before-v023/` conserve la référence. `--check-only` applique et teste dans le dépôt courant sans commit ni push : l'utiliser dans une copie propre si l'on souhaite garder son checkout intact.

Les validations de cette livraison utilisent Chromium et SwiftShader. Elles établissent le fonctionnement WebGL et permettent la comparaison visuelle, mais ne certifient pas une cadence sur GPU réel. L'avertissement Vite sur la taille du bundle principal est hérité de la version précédente.

Mesures du rendu par défaut dans les vues de revue, hors recalcul ponctuel des shadow maps :

| Vue | V0.22 : appels / triangles | V0.23 : appels / triangles |
| --- | --- | --- |
| Jardin simple, 23 éléments | 71 / 73 464 | 71 / 73 464 |
| Jardin dense, 133 éléments | 298 / 203 820 | 298 / 203 820 |

La revue ajoute deux contrôles de rendu aux huit contrôles existants : comparaison des pixels avec et sans détails, chemin direct et surcoût exact d'une passe lorsque le contour est disponible ; redimensionnement aller-retour sans accumulation de textures ni de géométries. Le crochet de diagnostic est uniquement exposé avec `?review=1` et ne change pas les sauvegardes.

### Décision de coût

Sur SwiftShader à 1440×900, une mesure synchronisée avec `gl.finish()` (40 images, 12 de chauffe exclues) donnait des intervalles médians de 146/262 ms en V0.22 et 301/424 ms avec les contours expérimentaux en V0.23, pour les scènes simple/dense. Ce test logiciel, volontairement bloquant, n’est pas une mesure de FPS sur GPU réel. Il révèle néanmoins un coût suffisant pour rejeter l’activation par défaut de cette passe. Le nombre de draw calls seul aurait masqué ce problème.

Avec le rendu direct retenu et les matériaux optimisés, la même procédure a mesuré 139/263 ms en V0.22 contre 160/303 ms en V0.23 : environ +15 % dans cet environnement logiciel. Le coût n’est donc pas nul. Les appels et triangles restent identiques ; la scène normale utilise trois textures GPU contre deux auparavant. Une validation sur le GPU du joueur reste nécessaire pour chiffrer l’impact réel en jeu.
