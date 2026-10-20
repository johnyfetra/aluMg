# Architecture

## Stack

- Next.js 16 (App Router, Cache Components), React 19, TypeScript strict
- Tailwind CSS 4 avec jetons de design (variables CSS), lucide-react pour les icônes
- Postgres via Drizzle ORM : PGlite (embarqué) en développement, `DATABASE_URL` (Neon, Supabase…) en production
- zod pour valider tout ce qui entre par l'API, SWR côté client
- jsPDF pour le PDF, généré dans le navigateur
- vitest (tests), tsx (scripts)

## Organisation

```
app/(auth)/            connexion, inscription (sans barre de navigation)
app/(app)/             tableau-de-bord, devis, reglages, compte (avec Shell)
app/api/               auth/{signup,login,logout}, me, settings, quotes, quotes/[id]
proxy.ts               redirige vers /connexion sans cookie de session
components/            Shell, Controls (ThemeSwitch, LangMenu, UserMenu), Menu, QuoteEditor, ProfileNeeds,
                       AuthForm, SignaturePad, ui (Choice, FinishPicker, StatusBadge…)
lib/model.ts           catalogues d'options, schémas zod, types, majorations, valeurs par défaut
lib/calc.ts            métier pur : débit, plan de coupe, prix (testé)
lib/drawing.ts         schéma SVG (couleur du profilé et du verre respectées) et conversion PNG
lib/pdf.ts             mise en page du devis PDF
lib/db/                schéma Drizzle et connexion (getDb)
lib/repo.ts            accès aux données, toujours borné à un utilisateur
lib/auth.ts, password.ts   sessions et hachage scrypt
lib/client.ts          hooks SWR (useSettings, useQuotes, useMe)
lib/i18n.tsx, messages/    langues
scripts/create-admin.ts    création du compte administrateur
drizzle/               migrations SQL (générées, à versionner)
e2e/                   test de l'API réelle
```

Règle : `lib/calc.ts` ne dépend ni de React ni du navigateur. Toute règle métier s'y ajoute avec un test.

## Données

Tables : `users` (e-mail unique, rôle `user` ou `admin`), `sessions` (empreinte SHA-256 du jeton), `settings` (JSON par utilisateur + compteur de numéros), `quotes` (colonnes numéro, statut, date + document JSON complet).

- Un devis garde ses `terms` (TVA, acompte, validité) et le prix unitaire de chaque ligne **figés** : changer les réglages ne modifie pas un devis émis.
- Le numéro `DV-AAAA-NNNN` est attribué par le serveur, de façon atomique (`UPDATE … RETURNING`). Le client ne le choisit jamais et un numéro supprimé n'est pas réutilisé.
- Toute requête de `lib/repo.ts` filtre par `userId` : un compte ne peut ni lire, ni modifier, ni supprimer les données d'un autre (testé).

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

## Sécurité

- Mots de passe hachés avec scrypt (sel aléatoire, comparaison à temps constant). Connexion sans fuite sur l'existence d'un e-mail.
- Cookie de session `httpOnly`, `sameSite=lax`, `secure` en production, 30 jours. La base ne stocke que l'empreinte du jeton.
- Chaque route d'API vérifie la session en base, puis valide le corps avec zod (bornes, listes fermées, images en `data:image/` uniquement).
- `proxy.ts` n'est qu'un contrôle optimiste (présence du cookie) ; la vraie vérification est dans l'API.
- **À ajouter avant l'ouverture au public** : limitation des tentatives de connexion, vérification d'e-mail, mot de passe oublié, journal d'audit.

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

## Conventions

- Composants client uniquement quand nécessaire (`"use client"`).
- Pas de texte en dur dans l'interface : tout passe par `t()`. Pas de couleur en dur : utiliser les jetons.
- `npm run lint`, `npm test`, `npm run build` (et `npm run test:e2e` si l'API change) doivent passer avant de fusionner.

## Risques connus

- Pas de limitation des tentatives de connexion (voir Sécurité).
- Formules de débit non calibrées ; listes d'options à valider avec des menuisiers.
- Le graphique du tableau de bord range les montants par date de création du devis (la date d'acceptation n'est pas encore enregistrée).
- Pas de contrôle de concurrence : deux onglets qui modifient le même devis, le dernier enregistrement l'emporte.
