# AluMg — Identité et composants

## Direction

« La précision, en confiance. » Un outil de travail chaleureux : vert atelier, surfaces ivoire, accents bois, formes d'assemblage orthogonales. Conserver le positionnement menuiserie aluminium et le nom AluMg.

## Source de vérité

`app/globals.css` : couleurs sémantiques clair/sombre, focus, contrôles, cartes, skeletons. Geist est conservée pour sa lisibilité et pour éviter une seconde police distante. Titres 24–32 px, corps 14–16 px, légendes 12 px, interlignage généreux, chiffres tabulaires lorsque pertinent. Échelle d'espacement Tailwind par multiples de 4 px ; contrôles environ 40 px, connexion 48 px ; cartes rayon 16 px, contrôles 8–10 px. Ombre de carte très légère, ombre de panneau réservée aux menus et modales.

| Usage | Composant / classe |
| --- | --- |
| Identité | LogoMark, Brand ; SVG `public/brand/alumg-*`, alias `logo*` et `mark*`, `app/icon.svg` |
| Boutons | btn-primary, btn-secondary, btn-ghost, btn-danger, btn-accent |
| Champs | input, Field, PasswordField, Choice, Switch, Select |
| Conteneurs | card, page-heading, eyebrow |
| Statuts métier | StatusBadge : icône + texte ; Progress : pourcentage réel et ARIA |
| Attente / erreur / vide | LoadingState, ErrorState, EmptyState dans Feedback.tsx |
| Confirmation | ConfirmProvider avec dialog natif et focus géré |
| Menus | Menu et Select ; conserver leurs interactions clavier |
| Navigation | Shell selon le rôle, PublicShell ; menu mobile avec inert et Échap |
| Notifications | NotificationBell, erreurs annoncées, opération en cours désactivée |

Ne pas utiliser les couleurs catégorielles des graphiques pour du texte de statut. Réserver le rouge au danger ; ne pas déduire un paiement d'un montant de devis accepté. Toujours distinguer attente, absence de données et erreur. Ne pas remplacer les tokens par des couleurs ponctuelles dans les pages métier.

## Image d'accès

Fichier : `public/brand/atelier.webp`. Source : génération originale via l'outil intégré Imagegen, le 29 octobre 2026. Il s'agit d'un visuel photoréaliste généré, pas de la photographie documentaire d'un atelier partenaire. Aucun téléchargement de photographie tierce, aucun témoignage ni client implicite. Le fond vert reste visible si l'image est indisponible. L'image décorative ne porte aucune information indispensable.

Prompt final utilisé (outil intégré, sans CLI) :

> Use case: photorealistic-natural. Asset type: portrait editorial photograph for AluMg joinery SaaS login. Contemporary artisanal woodworking workshop, close detail of a beautifully precise oak window frame corner joint on a workbench, warm natural oak grain and brushed dark green metal clamps, softly blurred tall workshop windows behind, natural side daylight, refined quiet craftsmanship, credible construction and realistic materials. Portrait 2:3 framing, subject in middle, calm darker upper and lower areas for UI overlay. No people, no text, no logo, no watermark, no computer office, no illustration. Save the generated asset for use in this project if file output is supported.

Le fichier source généré reste à son emplacement d'origine ; le projet référence uniquement la copie WebP locale.
