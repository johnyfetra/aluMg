@AGENTS.md

# Mémoire du projet AluMg

## Commits (consigne de l'utilisateur)
Ne commiter et ne pousser que sur demande explicite. Plusieurs commits courts par sujet, en français (`feat:`, `fix:`, `docs:`…), sans ligne `Co-Authored-By`. Quand un fichier touche deux sujets, séparer par morceaux.

## Moteur 3D : reste à faire (décision et détail : docs/moteur-3d.md)
Three.js est conservé (Babylon.js écarté après comparaison). Déjà fait : profilés à sections réelles (`lib/joinery`), vitrage physique, profils de qualité éco / équilibré / élevé.
À faire :
- Environnement « studio » HDR procédural pour le mode produit (boîtes à lumière, ombres de contact).
- Vues prédéfinies : face, arrière, côtés, trois quarts, réinitialisation.
- Export d'image du rendu.
- Joints, parcloses et accessoires à section réelle sur tous les ouvrages (portes, ouvrants, volets, garde-corps, cloisons) ; aujourd'hui seuls dormant et vantaux utilisent `lib/joinery`.
- Mise en situation : ouverture du mur aux dimensions exactes de l'ouvrage, épaisseur et position du mur réglables.
- Aluminium : finitions anodisé, thermolaqué, noir mat, anthracite, blanc, gris métallisé avec réponse lumineuse propre ; matériaux extensibles (bois, PVC, acier).
- Mesurer FPS, mémoire et temps de chargement sur de vrais appareils (les mesures faites étaient en rendu logiciel).
- Image de référence de la qualité visée : à redemander à l'utilisateur (non jointe à la demande).
