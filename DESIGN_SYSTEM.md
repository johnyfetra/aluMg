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

Fichier : `public/brand/realisation-aluminium.webp`. Source : outil intégré Imagegen, le 30 octobre 2026. Visuel photoréaliste généré : un artisan ajuste une baie coulissante en aluminium dans un intérieur achevé. Il ne représente pas un chantier client documenté.

Le cadrage laisse le geste professionnel visible au-dessus du texte. Le fond uni conserve la lisibilité si l'image ne charge pas. L'ancienne image reste disponible dans `public/brand/atelier.webp`.

Prompt complet et provenance : [realisation-source.md](public/brand/realisation-source.md). Génération par l'outil intégré, sans CLI ; fichier WebP local optimisé pour le site.
