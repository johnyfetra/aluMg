# Architecture

## Stack

- Next.js 16 (App Router, Cache Components), React 19, TypeScript strict
- Tailwind CSS 4 avec jetons de design (variables CSS), lucide-react pour les icônes
- Postgres via Drizzle ORM : PGlite (embarqué) en développement, `DATABASE_URL` (Neon, Supabase…) en production
- zod pour valider tout ce qui entre par l'API, SWR côté client
- jsPDF pour le PDF, généré dans le navigateur
- vitest (tests), tsx (scripts)

## Rôles et frontière navigateur / serveur

- Trois rôles : `client`, `menuisier`, `admin`. Le rôle est choisi à l'inscription (client ou menuisier) ; l'admin se crée avec `npm run admin:create`.
- **Chaque route d'API vérifie la session et le rôle** (`requireRole`). Les pages ont aussi un garde d'affichage (`RoleGuard`) qui renvoie vers le bon espace, mais ce n'est qu'un confort : les droits réels sont dans l'API.
- **Modules serveur** (jamais importés par le navigateur, sauf `import type`) : `lib/db`, `repo`, `profiles`, `workflow`, `auth`, `password`, `api`. Les constantes partagées vivent dans `lib/model.ts`. Une règle ESLint (`no-restricted-imports`) le vérifie : importer une constante depuis un module serveur casse le bundle du navigateur.
- Les pages publiques (`/`, `/menuisiers…`) sondent la session avec `GET /api/session` (toujours 200, `null` si visiteur), jamais avec `/api/me`.

## Organisation

```
app/(auth)/            connexion, inscription (sans barre de navigation)
app/(app)/             tableau-de-bord, devis, reglages, compte (avec Shell)
app/api/               auth/*, me, session, settings, quotes, quotes/[id], quotes/[id]/{events,actions},
                       profile, portfolio, requests, client/quotes, public/menuisiers
proxy.ts               redirige vers /connexion sans cookie de session
components/            Shell (nav selon le rôle), PublicShell, Controls, Menu, QuoteEditor, RequestForm, ClientQuoteView,
                       NeedsPage, ProfileNeeds, Viewer3D, MenuisierCard, MenuisierProfile, Timeline, Lightbox,
                       RoleGuard, AuthForm, SignaturePad, ui (Choice, FinishPicker, StatusBadge, Stars, Progress…)
lib/model.ts           catalogues d'options, schémas zod, types, majorations, valeurs par défaut
lib/calc.ts            métier pur : débit, plan de coupe, prix (testé)
lib/drawing.ts         schéma SVG (couleur du profilé et du verre respectées) et conversion PNG
lib/pdf.ts             mise en page du devis PDF
lib/db/                schéma Drizzle et connexion (getDb)
lib/repo.ts            accès aux données, toujours borné à un utilisateur
lib/auth.ts, password.ts   sessions et hachage scrypt
lib/profiles.ts        profil public, portfolio, annuaire et avis (public)
lib/workflow.ts        demandes de clients, machine d'états des devis, historique, évaluations, signalements
lib/procure.ts         plan d'achat des profilés selon le marché (longueurs et prix)
lib/client.ts          hooks SWR (useSettings, useQuotes, useMe)
lib/i18n.tsx, messages/    langues
scripts/create-admin.ts    création du compte administrateur
drizzle/               migrations SQL (générées, à versionner)
e2e/                   test de l'API réelle
```

Règle : `lib/calc.ts` ne dépend ni de React ni du navigateur. Toute règle métier s'y ajoute avec un test.

## Données

Tables : `users` (e-mail unique, téléphone, rôle), `sessions`, `settings` (JSON par menuisier + compteur de numéros), `quotes` (numéro, statut, `client_id`, `progress` + document JSON complet), `quote_events` (historique), `reviews` (une seule par devis), `reports` (signalements, confidentiels), `menuisier_profiles` (profil public, publié ou non, vérifié), `portfolio_items` (photos).

- Un devis garde ses `terms` (TVA, acompte, validité) et le prix unitaire de chaque ligne **figés** : changer les réglages ne modifie pas un devis déjà émis.
- Le numéro `DV-AAAA-NNNN` est attribué par le serveur, de façon atomique. Le client de l'API ne choisit jamais numéro, client lié, demande ni avancement (le serveur les ignore).
- Toute requête du menuisier filtre par `userId`, celles du client par `clientId` : un compte ne voit que ses données (testé).

## Cycle de vie d'un devis lié à un client

```
requested ─(menuisier prépare)→ draft ─send→ sent ─accept→ accepted ─progress→ in_progress ─100 %→ completed ─review→ (évalué)
    │                              ▲            │  └request_change→ negotiation ─(modifie)→ send ─┘
    └──────── decline ─────────────┴────────────┴────────reject──────→ rejected
```

- `lib/workflow.ts` : `transition(statut, action, rôle)` est une fonction pure (testée) ; `applyAction` l'applique en transaction et écrit l'historique.
- Le rôle sur un devis vient du devis lui-même (menuisier propriétaire ou client demandeur), jamais du corps de la requête. Un tiers reçoit « introuvable ».
- Tant que le devis est `requested` ou `draft`, le client ne voit **aucun prix**. Dès `sent`, le devis est **verrouillé** pour le menuisier (lignes, prix, remise figés) : le client voit toujours ce qu'il accepte. Seule la négociation rouvre l'édition.
- Un devis déjà remis à un client ne peut plus être supprimé.
- Une évaluation n'existe qu'après `completed`, une seule par devis ; l'annuaire n'affiche que le prénom du client.
- Un signalement n'apparaît pas dans l'historique que voit le menuisier.
- Un devis sans compte client (saisi par le menuisier) se gère par son statut libre, comme avant.

## Annuaire public

`GET /api/public/menuisiers` (filtres : texte, ville, spécialité, note minimale, vérifiés, tri) et `/[slug]` ne renvoient que les profils publiés et **jamais de coordonnées**. Les coordonnées du menuisier ne sont visibles que dans le suivi d'un devis, par le client concerné. Un profil ne peut être publié qu'avec nom et ville. Le filtrage se fait en mémoire (shortcut pour quelques centaines de profils) : à passer en SQL paginé ensuite.

## Configuration d'un ouvrage

Tout part de `lib/model.ts` : les catalogues (`FINISHES`, `GLASSES`, `THICKNESSES`, `PATTERNS`, `EXTRAS`…), le schéma `lineSchema` et les majorations `SURCHARGES`. Le formulaire, le calcul, le dessin, le PDF et la validation serveur lisent ces mêmes listes.

**Prix** = surface facturée × tarif de base au m² (`TARIFF_KEYS`) × (1 + somme des majorations en %). Les majorations sans objet sont ignorées (verre sur une porte pleine, moteur sur une fenêtre).

**Ajouter une option** (ex. un nouveau type de verre) :
1. Ajouter l'entrée dans le catalogue de `lib/model.ts` (et sa majoration dans `SURCHARGES` si elle coûte plus cher).
2. Ajouter les clés de traduction dans `fr.ts`, `en.ts`, `mg.ts` (le compilateur signale les oublis).
3. Si elle change le débit, adapter `cutList` dans `lib/calc.ts` et ajouter un test.

**Débit** : `cutList()` renvoie les pièces (chacune rattachée à un *profilé* et à un *élément* de l'ouvrage), les vitrages et les panneaux pleins. `cuttingPlan()` regroupe par profilé et place les pièces dans des barres (first-fit decreasing) avec la longueur de barre et le trait de scie réglés dans les réglages (6000 mm et 5 mm par défaut). Pour chaque profilé il donne : éléments et ouvrages concernés, barres, plan de coupe barre par barre, longueur utilisée, perte (chutes + traits de scie). `planTotals()` totalise. L'éditeur et la fiche de débit du PDF utilisent les mêmes fonctions. Les déductions sont génériques (`shortcut:` dans le code) et à calibrer par série de profilés (US-1.10).

**Nombre de vantaux** : `leavesSpec()` (dans `lib/model.ts`) donne, par ouverture, les valeurs rapides et la plage acceptée (ex. coulissant 2 à 8, cloison 1 à 10 panneaux). `normalize()` ramène toute valeur dans la plage.

**Illustration** : `lib/drawing.ts` génère un SVG qui reflète gamme (épaisseur du profilé, rupture de pont thermique), couleur, nombre de vantaux, remplissage, type de verre, épaisseur (double vitrage, feuilleté, trempé), motif, moustiquaire, grille et motorisation. Chaque dessin reçoit un identifiant unique (`uid`) pour que plusieurs schémas sur une page ne se mélangent pas. Le test `drawing.test.ts` vérifie que le SVG est bien formé pour toutes les combinaisons : le PDF convertit le SVG en image, et un attribut en double fait échouer toute la génération.

## Marché des profilés et plan d'achat

`lib/procure.ts` regroupe les coupes par profilé, gamme et couleur (des barres de couleurs différentes ne se mélangent pas), puis choisit les barres à acheter parmi les offres du marché configurées dans `/reglages/profils` (longueur et prix par profilé ; majorations de gamme et de finition). Heuristique : pour chaque longueur de base, remplissage first-fit decreasing, puis chaque barre est ramenée à l'offre la moins chère qui contient ses coupes ; le plan le moins cher gagne. Le coût est réparti entre ouvrages au prorata de la longueur coupée. Ce n'est pas un optimum garanti (problème NP-difficile).

## Vue 3D

`components/Viewer3D.tsx` (three.js via react-three-fiber, chargé à la demande, jamais côté serveur). Le mouvement utilise un ressort critiquement amorti (`useSpring`) : accélération puis freinage sans rebond. Rendu à la demande (`frameloop="demand"`) : aucune image n'est calculée tant que rien ne bouge. `prefers-reduced-motion` supprime l'animation. Les pièces sont étiquetées par élément : survoler une ligne du besoin en profilés surligne les pièces correspondantes.

## Sécurité

- Mots de passe hachés avec scrypt (sel aléatoire, comparaison à temps constant). Connexion sans fuite sur l'existence d'un e-mail.
- Cookie de session `httpOnly`, `sameSite=lax`, `secure` en production, 30 jours. La base ne stocke que l'empreinte du jeton.
- Chaque route d'API vérifie la session en base, puis valide le corps avec zod (bornes, listes fermées, images en `data:image/` uniquement).
- `proxy.ts` n'est qu'un contrôle optimiste (présence du cookie) ; la vraie vérification est dans l'API.
- **À ajouter avant l'ouverture au public** : limitation des tentatives de connexion et des demandes de devis, vérification d'e-mail, mot de passe oublié, journal d'audit, modération des signalements, stockage de fichiers pour les photos.

## Thème

La page principale occupe toute la largeur disponible (jusqu'à 110 rem) ; l'éditeur passe en deux colonnes sur grand écran (formulaire + synthèse fixe). Tous les styles utilisent des jetons (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-primary`…) définis dans `app/globals.css`. `:root` porte le thème clair, `[data-theme="dark"]` le sombre. La barre latérale utilise ses propres jetons `--side-*`, volontairement identiques dans les deux thèmes. Le tableau de bord utilise la palette catégorielle `--c1..--c4` (bleu, aqua, orange, violet) et les couleurs de statut avec icône et texte. Un script dans `<head>` applique le thème avant le premier rendu.

## Internationalisation

- `lib/messages/fr.ts` est la référence : `en.ts` et `mg.ts` sont typés `Messages` et ne compilent que s'ils ont exactement les mêmes clés.
- **Ajouter un texte** : clé dans `fr.ts`, puis `en.ts` et `mg.ts`, puis `t("ma.cle")`.
- **Ajouter une langue** : créer `lib/messages/xx.ts`, l'ajouter dans `LOCALES`, `DICTS` et `DATE_LOCALE` de `lib/i18n.tsx`.
- Le PDF est généré dans la langue de l'interface.

## Accessibilité

Lien d'évitement, un `h1` par page, champs avec `label`, cibles tactiles de 44 px minimum, focus visible, `aria-current` sur la navigation, menus déroulants au clavier (flèches, Échap), choix en radios natifs, erreurs en `role="alert"`, confirmations en `role="status"`, statuts avec icône et texte (jamais la couleur seule), graphique avec alternative textuelle, `prefers-reduced-motion` respecté.

## Déploiement (Vercel + Neon)

1. Créer une base Postgres (Neon via le Marketplace Vercel) et définir `DATABASE_URL`.
2. Les migrations du dossier `drizzle/` s'appliquent au premier accès. Pour la production, mieux vaut les lancer en CI (`drizzle-kit migrate`) ; vérifier alors que le dossier `drizzle/` est bien inclus dans le déploiement.
3. Créer l'administrateur : `DATABASE_URL=… npm run admin:create`.
4. `.data/` n'est jamais versionné ni déployé : c'est la base de développement.

## Tests

- `npm test` : unitaires (calcul, prix, plan d'achat, dessin SVG) et accès base en mémoire (rôles, workflow, annuaire).
- `npm run test:e2e:fresh` : construit l'appli, la lance sur le port 3100 avec une base jetable, exécute l'API (droits, isolation, parcours complet) et le navigateur (Chrome : visiteur, inscription, garde de rôle, demande de devis, publication, langue/thème, mobile), puis nettoie. Variable `CHROME_PATH` pour un autre Chrome.
- Si l'affichage de développement semble obsolète (CSS ou routes introuvables après un déplacement de fichiers), supprimez `.next/` et relancez `npm run dev`.

## Conventions

- Composants client uniquement quand nécessaire (`"use client"`).
- Pas de texte en dur dans l'interface : tout passe par `t()`. Pas de couleur en dur : utiliser les jetons.
- `npm run lint`, `npm test`, `npm run build` (et `npm run test:e2e` si l'API change) doivent passer avant de fusionner.

## Risques connus

- Pas de limitation des tentatives de connexion (voir Sécurité).
- Formules de débit non calibrées ; listes d'options à valider avec des menuisiers.
- Le graphique du tableau de bord range les montants par date de création du devis (la date d'acceptation n'est pas encore enregistrée).
- Pas de contrôle de concurrence : deux onglets qui modifient le même devis, le dernier enregistrement l'emporte.
