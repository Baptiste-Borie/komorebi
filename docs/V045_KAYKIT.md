# V0.45 — KayKit Gardener Lab (validation avant intégration)

## Pourquoi

La V0.44 avec armature et animations Python reste intacte. On teste à côté une **base officielle KayKit gratuite**, avec son `Rig_Medium` et les animations d'origine. Aucun achat de `.blend` nécessaire : Blender sait importer FBX / glTF si on décide de retoucher le modèle ensuite.

### Télécharger les deux versions **FREE** (pas SOURCE)

1. **Adventurers — Free 2.0**, https://kaylousberg.itch.io/kaykit-adventurers
2. **Character Animations — Free 1.1**, https://kaylousberg.itch.io/kaykit-character-animations

Sur itch.io : « Download Now » → « No thanks, just take me to the downloads » → ZIP FREE. Ces archives ne sont pas téléchargeables automatiquement de manière fiable : l'installateur travaille **localement**, sans cookies ni scraping. Le pack d'animation **1.1** est indispensable pour `Dig` et `Digging`.

### Installation

Depuis la racine du dépôt Komorebi (sur Ubuntu) :

```bash
python3 scripts/import_kaykit_v045.py ~/Téléchargements/<adventurers-free.zip> ~/Téléchargements/<animations-free.zip>
npm run dev
```

Les chemins `<...>` sont à remplacer par les noms réels des ZIP. Les dossiers décompressés sont aussi acceptés. L'installateur sélectionne automatiquement le **Ranger** (sinon Rogue, Mage, Knight), lit les animations contenues dans les fichiers GLB/glTF, copie le strict nécessaire dans `public/assets/kaykit-v045`, puis écrit un manifeste. Pas besoin de Python Blender, ni de transformer les modèles à la main.

Ouvrir **http://localhost:5173/?kaykit=1** ou cliquer sur **Jardinier V0.45** dans la barre supérieure.

L'atelier permet de comparer le modèle original à une première tenue de jardinier réversible (plastron de salopette + bretelles + chapeau), puis de visualiser **Idle, Walking, Running, Dig, Digging, Working**, en scrubbing, rotation et zoom. Tout conserve le rig de KayKit.

### Vérifications

```bash
npm run build
npm run review:quick
node scripts/review_kaykit_v045.mjs  # démarre Vite automatiquement si nécessaire
```

Les captures, un diagnostic de maillages et le GLB Ranger original (si disponible) sont empaquetés dans `reviews/komorebi-v045b-review.zip` ; les PNG temporaires sont supprimés après vérification du ZIP. La revue automatique vérifie **le chargement et l'existence des clips**, mais **pas leur qualité artistique**. Vérifier manuellement de face, de profil et de 3/4 : pieds plantés, épaules, manches, passage de l'outil, déformation du buste, collisions vêtement/corps.

### Limites délibérées / suite

- La **première tentative de tenue a été retirée** : les accessoires basés sur une boîte englobante cachaient le visage et le costume RPG restait visible. On doit importer le vrai GLB dans Blender, modifier les maillages, transférer les poids de skinning et réexporter **en conservant le rig**. Le fichier `KayKit-diagnostic.json` dans le ZIP permet d’identifier les maillages. Pour aller au bout de la tenue, fournir le GLB de Ranger original, pas un screenshot seul.
- La pelle n'est **pas encore fixée aux mains** de la nouvelle animation. `Dig` et `Digging` servent d'abord à vérifier la gestuelle du squelette ; on fixera l'outil une fois le geste retenu. Ne pas confondre cette étape avec un personnage terminé.
- Les animations sont transférées **par correspondance des noms d'os** (`Rig_Medium`). Si le chargement indique des pistes absentes, ne pas faire de retargeting silencieux : contrôler versions et hiérarchie des os.
- Aucune modification à `src/gardener.ts`, au jardin, ou aux assets V0.44. L'étape de **bascule en jeu** sera un patch suivant, après validation visuelle.

### Licences

KayKit Adventurers Free 2.0 et KayKit Character Animations Free 1.1 sont publiés par Kay Lousberg sous **CC0 1.0**. Source officielle : les deux pages itch.io ci-dessus. Ne pas revendre les packs bruts ni les présenter comme son propre travail (demande explicite de l'auteur). Les assets installés restent locaux tant que tu ne les ajoutes pas volontairement au dépôt.

## V0.46 — Habillage sur vrai maillage GLB (après import V0.45b)

La revue V0.45b a confirmé 23 os et six animations utilisables dans l'atelier.
Le Ranger contient huit maillages skinnés distincts. Nous n'utilisons **plus**
les fausses boîtes 3D placées devant le visage : `scripts/build_gardener_v046.py`
travaille directement sur les triangles existants du Ranger, enlève la cape,
le carquois, la moustache/le bouc et le foulard, puis crée un plastron, des
bretelles et un tour de taille réels, liés au rig `Rig_Medium`.

```bash
python3 scripts/build_gardener_v046.py
npm run build
node scripts/review_kaykit_v045.mjs
```

Le fichier source KayKit reste **inchangé**. Le modèle personnalisé local est
`public/assets/kaykit-v045/gardener-v046.glb`. En atelier, le bouton
« Comparer : Ranger original » permet de comparer deux squelettes équivalents
au même moment de la même animation. La revue V0.46 contient les poses
comparées et les deux GLB, empaquetés dans `reviews/komorebi-v046-review.zip`.
Les captures temporaires sont nettoyées. Ne pas confondre ce jalon avec la
validation finale de la tenue : vérifier les déformations en marche/creusement.

**Limites connues :** les brassards du Ranger sont encore visibles (peuvent
être réinterprétés comme gants de travail). Les gestes `Dig` et `Digging`
restent sans pelle : l'outil doit être fixé et ajusté sur `handslot.r` au jalon
suivant. Pas de modification du jardin existant.
