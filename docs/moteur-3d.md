# Moteur 3D : audit, comparaison et décision

## Audit du rendu d'origine (constats sur captures et code)
- **Géométrie** : profilés en plaques plates (extrusion d'un rectangle), sans chambres, feuillure ni goutte d'eau ; les vantaux sont à plat dans le dormant.
- **Verre** : transparence par opacité (`transparent`, `depthWrite=false`) : le verre ressemble à un panneau teinté, sans réfraction ni transmission.
- **Lumière** : environnement RoomEnvironment (produit) ou ciel dessiné (mise en scène), ombres de base ; pas de profils de qualité.
- **Caméra, matériaux, interactions** : corrects (rotation, zoom, animations d'ouverture, mise en valeur d'un élément) ; ils sont conservés.

## Comparaison Three.js / Babylon.js (même fenêtre coulissante, mêmes données)
Les deux bancs consommaient la même géométrie neutre (`lib/joinery`) : fenêtre 1800 × 1200 mm, profilés à sections réelles, double vitrage 4/12/4, même studio, même caméra.
Mesures faites dans Chrome en rendu logiciel (SwiftShader) : les FPS d'un GPU réel ne sont donc **pas** mesurés, seules les tailles de livraison et l'effort d'intégration le sont.

| | Three.js (optimisé) | Babylon.js (cœur, arborescence réduite) |
|---|---|---|
| Poids du banc (minifié / gzip) | 573 Ko / 145 Ko | 2,6 Mo / 609 Ko |
| Déjà dans l'application | oui (`three`, R3F, drei) | non |
| Parité visuelle obtenue | au premier essai | non atteinte après plusieurs essais (main gauche, élimination des faces, sonde d'environnement) |
| Écriture de l'environnement studio | PMREM sur une scène | sonde de réflexion sans préfiltrage fiable |

## Décision
**On garde Three.js.** Les défauts constatés sont des défauts de géométrie, de matériaux et de profils de qualité, indépendants du moteur ; ils sont corrigés sur la base actuelle. Babylon.js livrerait ~4× plus de code, obligerait à réécrire les ~1000 lignes du visualiseur, ses interactions et la mise en scène, sans gain visuel démontré. Il n'est pas prouvé que Babylon ne ferait pas aussi bien avec plus de réglages : il n'est simplement pas justifié ici.

## Ce qui a été réalisé
- `lib/joinery/` : unités centralisées (mm → m), sections de profilés paramétriques (`profiles.ts`), cadres à onglets sur section réelle (`geometry.ts`, neutre vis-à-vis du moteur), profils de qualité (`quality.ts`), description d'une fenêtre coulissante en pièces neutres (`slidingWindow.ts`). Tests de dimensions et d'onglets.
- `Viewer3D` : dormants et vantaux construits sur ces sections ; vitrage physique (transmission, indice 1,5) au profil élevé, verre transparent simple sinon ; trois profils éco / équilibré / élevé (choix automatique, sélecteur, mémorisé ; `?q3d=` pour les essais).

## Reste à faire
Environnement « studio » HDR procédural pour le mode produit, vues prédéfinies (face, arrière, côtés, trois quarts), export d'image, joints et accessoires à section réelle sur tous les types d'ouvrages, mesures FPS sur de vrais appareils.
