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
lib/chat.ts            messagerie : conversations client/menuisier, messages, non-lus
lib/notifications.ts   notifications des devis (liste, lu)
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

Tables : `users` (e-mail unique, téléphone, rôle), `sessions`, `settings` (JSON par menuisier + compteur de numéros), `quotes` (numéro, statut, `client_id`, `progress` + document JSON complet), `quote_events` (historique), `reviews` (une seule par devis), `reports` (signalements, confidentiels), `menuisier_profiles` (profil public, publié ou non, vérifié), `portfolio_items` (photos), `logins` et `admin_audit` (administration, voir plus bas).

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
- Tant que le devis est `requested` ou `draft`, le client ne voit **aucun prix** (lignes, remise et prestations mis à zéro par `clientView`).
- **Révisions** : voir « Modifier un devis selon son statut » ci-dessous. Chaque modification de contenu d'un devis déjà montré au client fait `rev + 1` ; accepter, refuser ou demander une modification porte sur une `rev` précise (`quote_changed` si elle est périmée).
- **Envoi à un client** : un devis créé par le menuisier porte l'e-mail du client (`client.email`) ; l'action `send` retrouve le compte client correspondant et lie le devis (`no_client_account` sinon).
- **Commentaires par ouvrage** : événements `line_comment` (`data.lineId`), lus/écrits via `/api/quotes/[id]/comments`, absents de l'historique général. Chaque événement notable crée une **notification** (`notifications`, `/api/notifications`) pour l'autre partie ; un clic mène au devis et à l'ouvrage (`?ligne=`).
- Un devis déjà remis à un client ne peut plus être supprimé.
- Une évaluation n'existe qu'après `completed`, une seule par devis ; l'annuaire n'affiche que le prénom du client.
- Un signalement n'apparaît pas dans l'historique que voit le menuisier.
- Un devis sans compte client (saisi par le menuisier) se gère par son statut libre, comme avant.

## Mode MVP

`lib/mvp.ts` : `NEXT_PUBLIC_MVP` (actif par défaut ; `0` pour tout réafficher). En MVP l'app se limite au devis, côté menuisier (tableau de bord, devis, fournisseurs, réglages, compte) et côté client (devis reçus, décisions, ouvrages détaillés avec plan/3D et commentaires, devis imprimable), avec messagerie et notifications. L'annuaire, les profils publics, les réalisations, les chantiers et la liste de clients sont masqués (redirection par `proxy.ts`, menus filtrés). Le client écrit au menuisier d'un de ses devis via `{ menuisierId }`, sans profil public.

## Carnet de clients et envoi ciblé

- `contacts` (nom, téléphone, e-mail, note, `client_user_id`) : le carnet du menuisier, toujours borné à son `userId`. Le compte client est retrouvé par l'e-mail (jamais choisi par l'appelant). Un client entre automatiquement dans le carnet quand il demande un devis ou reçoit un devis (`ensureContact`).
- Page `/clients` : liste, recherche, ajout/modification, « Nouveau devis » (préremplit nom, téléphone, e-mail via `?contact=`), « Écrire », invitation à copier pour un client sans compte, et **lien de demande** (`/espace-client/nouvelle?menuisier=<slug>`) à envoyer à un client.
- Le lien de demande vaut invitation : `createRequest` accepte un profil **non publié** désigné par son slug (le slug n'est pas un secret : au pire, un client inscrit peut envoyer une demande à un menuisier, qui est notifié). `GET /api/requests/target` ne renvoie que nom et logo.
- Chaque devis peut porter son propre modèle (`Quote.docStyle`, choisi dans l'éditeur) ; sans lui, c'est le modèle des réglages (`/modele-devis`).

## Chiffrage et modèles de document

- **Chiffrage** (`lib/costing.ts`) : mode `m2` (tarif × surface × majorations) ou `cost` (matière via l'achat optimisé + main-d'œuvre par minutes + frais généraux + marge). La marge d'un ouvrage s'affiche dans l'éditeur ; le budget déduit main-d'œuvre et frais. Valeurs par défaut à calibrer avec l'atelier.
- **Modèles de devis** (`Settings.docStyle`, `DOC_PRESETS`) : en-tête, tableau, police, densité, schémas, pied libre. Personnalisation cadrée : les mentions obligatoires (identité, NIF/STAT, numéro, date, validité, client, détail, totaux HT/TVA/TTC, conditions, signatures) sont toujours imprimées, testé pour chaque modèle (`lib/pdf.test.ts`). `missingMentions` signale ce qu'il faut renseigner.
- **Volets** : coffre (apparent/encastré/tunnel), lames, moustiquaire intégrée, avec majorations réglables et débit adapté.

## Annuaire public

`GET /api/public/menuisiers` (filtres : texte, ville ou zone, spécialité, note minimale, vérifiés, tri ; `limit` plafonné à 100 et `offset`) et `/[slug]` ne renvoient que les profils publiés et **jamais de coordonnées**. Les coordonnées du menuisier ne sont visibles que dans le suivi d'un devis, par le client concerné. Un profil ne peut être publié qu'avec nom et ville.

Filtre, tri et pagination se font **en SQL** (`listPublicMenuisiers`, `lib/profiles.ts`) : seule la page demandée quitte la base, et les images (logo, couverture, photo) ne voyagent jamais dans une liste, seulement une adresse mise en cache. `GET /api/public/directory` donne les chiffres de l'annuaire (total, villes, nombre par spécialité, réalisations, chantiers terminés) calculés en SQL : les facettes des filtres et la bande de chiffres de l'accueil n'ont pas besoin de la liste. Les deux réponses sont publiques et mises en cache quelques dizaines de secondes (`PUBLIC_CACHE`, `lib/api.ts`). Index : `reviews(menuisier_id)`, `quotes(user_id, status)`.

shortcut: la recherche texte est un `LIKE '%mot%'` sur les profils publiés (suffisant jusqu'à quelques dizaines de milliers) ; passer à `pg_trgm` (index GIN, déjà activé pour l'administration) au-delà. Les images des réalisations restent en base (data URL) : les déplacer vers un stockage de fichiers avant la montée en charge.

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
- **À ajouter avant l'ouverture au public** : mot de passe oublié, modération des signalements, stockage de fichiers pour les photos.

## Administration (`/admin`, `lib/admin.ts`)

- **Couches** : route `/api/admin/*` fine (`requireAdmin()` de `lib/api.ts` : session valide en base, rôle `admin`, compte non suspendu ; zod ; `limited()`) → service `lib/admin.ts` (règles, journal) → requêtes drizzle. Les pages (`app/(admin)/`, `components/admin/`) n'ont aucune règle métier ; les types (`AdminStats`, `AdminUserRow`, `AuditRow`, `PageOf`) sont importés en `import type`, les hooks SWR sont dans `lib/client.ts`.
- **Tables** : `users.suspended_at`, `sessions.last_seen_at` (présence), `logins` (une ligne par connexion réussie, les sessions disparaissant à la déconnexion), `admin_audit` (acteur, action, cible recopiée en id + libellé pour survivre à la suppression, détails ; jamais de mot de passe).
- **Statistiques** : tout est compté en SQL. Une requête `count(*) filter (…)` pour les comptes par rôle et suspendus ; chaque série (inscriptions, connexions, devis créés, chantiers terminés = événement `completed`) est un `generate_series` (30 jours, 12 mois, 5 ans, heure de Madagascar) joint par intervalle à la colonne de date indexée : les périodes vides valent 0.
- **Présence** : « connecté » = session non expirée active depuis moins de `ONLINE_MINUTES` (5). `currentUser` ne réécrit `last_seen_at` que si la valeur a plus d'une minute (`SEEN_EVERY_MS`) : au plus une écriture par minute et par session, sans verrou.
- **Actions** : création (mot de passe temporaire affiché une seule fois), réinitialisation (nouveau hachage + révocation de toutes les sessions), suspension (sessions révoquées ; `currentUser` ignore un compte suspendu, la connexion répond `suspended`), rôle, badge Vérifié, suppression (l'administrateur retape l'e-mail ou le téléphone). Chacune s'exécute en **une transaction** avec sa ligne de journal, la ligne du compte verrouillée (`FOR UPDATE`) ; suspendre, réactiver, changer de rôle et le badge sont idempotents (rien n'est écrit si l'état ne change pas). Création et réinitialisation sont limitées par administrateur (`limited`).
- **Garde-fous** : un administrateur ne peut ni se supprimer, ni se suspendre, ni changer son propre rôle ; les comptes de `PROTECTED` (`lib/admin.ts`) ne sont jamais supprimés, réinitialisés, suspendus ni changés de rôle, y compris par `npm run admin:create` et par les tests.
- **Listes** : pagination côté serveur, 25 par page, offset plafonné à `MAX_PAGE` (400 pages, 10 000 lignes), tri `created_at desc` indexé ; la dernière activité est une sous-requête corrélée servie par `sessions(user_id)` (une requête pour toute la page, pas de N+1).
- **Devis et configuration (lecture seule)** : `listAllQuotes` (tous les devis, filtres texte, statut, menuisier, client, compte), `getAdminQuote` (devis complet + totaux de `lib/totals.ts`) et `getAccountConfig` (réglages, profil public, compteurs ; logo et signature réduits à un booléen) alimentent `/admin/devis`, `/admin/devis/[id]` et la fiche de compte. Aucune écriture : modifier un devis reste réservé à son menuisier.

### Recherche : Postgres, pas Elasticsearch

La recherche de comptes (nom, e-mail, téléphone en chiffres) est un `LIKE '%…%'` sur `lower(name || ' ' || coalesce(email, '') || ' ' || chiffres du téléphone)`, servi par un **index GIN trigrammes** (`pg_trgm`, `users_search_idx`). `pg_trgm` est chargé par PGlite (`lib/db/index.ts`) et disponible sur Neon et Supabase ; la migration `0014_admin` fait `CREATE EXTENSION IF NOT EXISTS pg_trgm` (il faut donc ce droit sur la base de production). Les jokers saisis (`%`, `_`) sont neutralisés.

Elasticsearch n'est pas utilisé : c'est un service de plus à héberger, sécuriser et synchroniser avec Postgres, inutile pour des dizaines de milliers de comptes, et impossible à embarquer en local (PGlite). Seuil pour passer à un moteur dédié (Elasticsearch, Meilisearch, Typesense) : recherche plein texte sur les **devis** ou les messages (millions de lignes, pertinence, fautes de frappe, facettes), ou recherche de comptes au-delà d'environ un million de lignes avec des temps > 200 ms malgré l'index. Avant cela, `tsvector` + GIN dans Postgres suffit.

shortcut: pagination par offset (plafonnée à 10 000 lignes), à remplacer par un curseur (`created_at`, `id`) si l'on doit parcourir des listes plus longues.
shortcut: le total exact (`count(*)`) est recalculé à chaque page ; au-delà de quelques centaines de milliers de comptes, afficher une estimation ou le mettre en cache.

## Thème

La page principale occupe toute la largeur disponible (jusqu'à 110 rem) ; l'éditeur passe en deux colonnes sur grand écran (formulaire + synthèse fixe). Tous les styles utilisent des jetons (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-primary`…) définis dans `app/globals.css`. `:root` porte le thème clair, `[data-theme="dark"]` le sombre. La barre latérale utilise ses propres jetons `--side-*`, volontairement identiques dans les deux thèmes. Le tableau de bord utilise la palette catégorielle `--c1..--c4` (bleu, aqua, orange, violet) et les couleurs de statut avec icône et texte. Un script dans `<head>` applique le thème avant le premier rendu.

## Internationalisation

- `lib/messages/fr.ts` est la référence : `en.ts` et `mg.ts` sont typés `Messages` et ne compilent que s'ils ont exactement les mêmes clés.
- **Ajouter un texte** : clé dans `fr.ts`, puis `en.ts` et `mg.ts`, puis `t("ma.cle")`.
- **Ajouter une langue** : créer `lib/messages/xx.ts`, l'ajouter dans `LOCALES`, `DICTS` et `DATE_LOCALE` de `lib/i18n.tsx`.
- Le PDF est généré dans la langue de l'interface.

## Accessibilité

Lien d'évitement, un `h1` par page, champs avec `label`, cibles tactiles de 44 px minimum, focus visible, `aria-current` sur la navigation, menus déroulants au clavier (flèches, Échap), choix en radios natifs, erreurs en `role="alert"`, confirmations en `role="status"`, statuts avec icône et texte (jamais la couleur seule), graphique avec alternative textuelle, `prefers-reduced-motion` respecté.

## Déploiement (Vercel + Supabase)

1. Base Postgres : l'intégration Supabase du Marketplace Vercel fournit `POSTGRES_URL` (pooler) ; `DATABASE_URL` reste prioritaire si on le définit (Neon ou autre Postgres fonctionnent aussi). `lib/db/index.ts` n'utilise Supabase que comme **hôte Postgres** (aucune API Supabase : ni Storage, ni Auth) ; `max: 3` connexions par instance.
2. Les migrations du dossier `drizzle/` s'appliquent au premier accès en production (au démarrage en local, et en développement dès que le journal change). La migration 0014 active `pg_trgm` : la base doit l'autoriser.
3. Créer l'administrateur : `DATABASE_URL=… npm run admin:create -- --email …` (voir README).
4. **Vérification des comptes : non exigée pour l'instant.** Un compte neuf est utilisable tout de suite (`verificationRequired()` dans `lib/verify.ts`), sans preuve de possession du numéro ni de l'e-mail ; les numéros restent uniques par compte. Pour la rétablir, définir `ALUMG_REQUIRE_VERIFICATION=1` **après** avoir configuré un canal d'envoi réel : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (SMS et appel) et/ou `RESEND_API_KEY`, `MAIL_FROM` (e-mail, pour les comptes qui en ont un) ; sans canal, un compte neuf resterait bloqué sur l'écran de vérification (`channels: []`, `403 unverified`). Pistes étudiées pour un canal gratuit ou peu coûteux : WhatsApp « inversé » (l'utilisateur envoie un code, le serveur lit son numéro), SMS « inversé » via un téléphone Android avec une SIM locale (sans internet côté utilisateur), e-mail Brevo (300/jour), validation manuelle par l'équipe. Tant que la vérification n'est pas exigée, un numéro supplémentaire s'ajoute sans code.
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

## Chiffrage et marge

- **Une seule base de marge : le prix de revient.** `marginPct` (marge visée), `minMarginPct` (alerte) et la marge du devis (`quoteMargin` dans `lib/costing.ts`) se lisent tous en % du coût complet ; le % du prix de vente est donné à côté. Le coût complet = achats (profilés, accessoires, verre, panneaux pleins) + main-d'œuvre + frais généraux + coût interne des prestations ; le prix est celui **après remise**.
- `Service.cost` (coût interne) n'est jamais envoyé au client : `clientView` le retire, un test le vérifie.
- Le verre et les panneaux se commandent en plaques : `Market.glassWaste` (%) s'ajoute à la surface achetée. `Market.panel` : prix du panneau plein au m².
- `Quote.lostReason` : posé par le serveur, motif de refus du client (`LOSS_REASONS`) ou `declined` (demande écartée par le menuisier, exclue du taux d'acceptation et des devis perdus).
- `calibration(settings)` signale les prix d'exemple et les prix fournisseurs non datés ou de plus de 90 jours.
- Le carnet de clients reste actif en MVP (la liste « masqués » plus haut ne le concerne pas).

## Données de test locales

- `npm run dev:local` : serveur sur la base embarquée `.data/pglite` (port 3200). Il vide `DATABASE_URL` / `POSTGRES_URL` : `npm run dev` lit `.env.local` et vise donc Supabase.
- `npm run seed:local` : démarre ce serveur, crée les comptes (`seed-demo.mjs`), 18 devis réalistes du menuisier `test@alumada.mg` avec leurs clients et conversations (`seed-quotes.mts`, tout par l'API), puis étale les dates (`backdate-demo.ts`, écriture directe, serveur arrêté). Pour repartir de zéro : déplacer `.data/pglite` avant de relancer.
- Mot de passe de tous les comptes : `scripts/demo-data.mjs` ; clients `hery@`, `noro@`, `toky@`, `lalao@client.mg`.

## Modifier un devis selon son statut

Source unique : `editMode(status, linked)` dans `lib/model.ts`, appliquée par `updateQuote` (serveur) et lue par l'éditeur.

| Statut | Mode | Une modification du menuisier… |
| --- | --- | --- |
| demande, brouillon | `free` | est libre ; une demande modifiée passe en préparation |
| négociation | `negotiate` | ajuste le devis (révision) ; `send` le renvoie, statut « envoyé » |
| envoyé | `revise` | crée une révision ; le client est notifié et voit la bannière « mis à jour » |
| refusé | `reopen` | adapte le devis (révision, statut inchangé, motif conservé) ; `send` le renvoie : statut « envoyé », motif effacé |
| accepté (avancement 0) | `reconfirm` | **annule l'acceptation** : statut « envoyé », révision, client notifié, il doit valider la nouvelle version (l'ancienne `rev` est refusée) |
| en cours | `amend` | avenant : révision notifiée, statut et avancement conservés |
| terminé | `locked` | impossible : le devis fait foi (nouvelle version à créer) |

Enregistrer sans changer le contenu ne change ni le statut ni la révision. Un devis sans compte client n'a personne à prévenir : modifiable librement sauf terminé. Chaque modification d'un devis montré écrit un événement `revised` (`data.from` = statut d'origine).

## Assistant de demande de devis (`lib/intake.ts`)

Le client décrit son besoin avec ses mots (« 3 fenêtres coulissantes 150x120 anthracite pour les chambres, un volet roulant motorisé… ») ; `analyze(texte)` en tire des ouvrages : découpage par ouvrage cité (fenêtre, porte, porte-fenêtre, baie, vitrine, naco, volet roulant ou rideau, garde-corps, cloison), quantité (chiffres ou lettres), cotes (`150x120`, `1,5 m par 1,2 m`, `2m x 1m20`, largeur/hauteur nommées, bornées à 200–6000 mm), ouverture, vantaux, couleur, verre, options, pièce, lieu et urgence. Ce qui n'est pas dit est **supposé et signalé** (`assumptions`), jamais chiffré en silence ; les ouvrages hors catalogue (portail, véranda…) sont listés à part. Déterministe, sans réseau ni IA externe, testé (`lib/intake.test.ts`).

- **Client** (`RequestForm`) : l'assistant montre ce qu'il a compris et les questions à lever ; sans ouvrage saisi à la main, la demande part avec `lines: []` et le serveur (`createRequest`) déduit les ouvrages du texte, les chiffre avec les tarifs du menuisier et mémorise `request.intake` (points à vérifier). Rien de compréhensible : `422 intake_empty`.
- **Menuisier** : pas d'outil d'analyse de texte. La description et l'analyse appartiennent au client qui fait la demande ; le menuisier reçoit des ouvrages déjà chiffrés avec ses tarifs (et lit le message du client, sans pouvoir le modifier), qu'il ajuste ouvrage par ouvrage.
- Limite assumée : règles et mots-clés, pas de compréhension générale ; une phrase atypique donne moins d'ouvrages ou une fiabilité basse.

## Interface

Toasts personnalisés (`components/Toast.tsx`, `useToast()`) pour chaque action côté client et menuisier ; « Mes tarifs » (`TariffsPanel`, tarifs au m², prix et coût des prestations, remise habituelle par client) accessible de partout.

## Avis du client par ouvrage

`Quote.lineReviews` (posé par le serveur) : par ouvrage, `approved` (avis facultatif) ou `request` (objet prix / détail / infos + texte). Actions du client sur un devis « envoyé » : `review_line` (valider, demander, retirer) et `approve_all` (tout valider d'un coup), toutes deux liées à la `rev` vue. Accepter le devis valide les ouvrages restants et garde les demandes non traitées ; modifier un ouvrage efface son avis (les autres restent) ; renvoyer le devis traite les demandes. Les demandes en attente se regroupent en une seule demande de modification (« Envoyer mes demandes »). Le menuisier voit l'état de chaque ouvrage dans l'éditeur.

## Listes déroulantes et couleurs

`Select` accepte des options riches (`leading` logo ou pastille, `description` lieu · numéro, `meta`, `group`) et une recherche au-delà de 9 options. Les couleurs de profilé s'affichent en échantillons (`Swatch.tsx`) : laqué avec reflet, anodisé brossé, effet bois veiné.

## Performance (mesures et choix)

Mesures en production (`next start`), CPU ralenti ×4 comme un téléphone d'entrée de gamme : premier affichage 120–240 ms, aucune tâche longue notable, frappe dans l'assistant ≈ 33 ms (médiane). Le calcul métier est négligeable : 50 ouvrages se chiffrent en ≈ 2 ms, le texte d'une demande de 1,4 Ko s'analyse en < 1 ms.

- Les images de profil (logo, couverture, photo) ne sont plus embarquées dans chaque liste : `lib/logo.ts` donne une adresse (`/api/public/menuisiers/<slug>/img?k=…&v=…`) servie avec cache. La page de demande de devis est passée de 658 Ko à 148 Ko transférés.
- La liste des devis du client n'embarque plus le logo ni la signature de l'entreprise (ils restent sur la fiche d'un devis).
- L'analyse du texte suit la frappe via `useDeferredValue` : elle ne bloque jamais la saisie.
- Mauvaises pistes évitées : ne pas répéter des images en data URL dans des listes ; ne pas recalculer l'analyse sur une valeur non différée.

## Ouvrages en attente (client)

Le client peut mettre un ouvrage « en attente » (`lineReviews[id].state = "hold"`). Il reste visible au devis, mais une fois le devis accepté il sort du total, de l'acompte, de la matière et de la marge (`activeLines`, `lib/totals.ts`). « Tout valider » n'y touche pas ; accepter avec tous les ouvrages en attente est refusé (`nothing_to_accept`). Modifier l'ouvrage (menuisier) efface son avis, donc le remet dans le devis.

## Assistant : fautes de frappe et couleurs

`analyze` corrige d'abord les mots proches du vocabulaire connu (« blan », « europpern », « coullisante ») avec une distance d'édition bornée (mots tronqués ou ≥ 5 lettres, mêmes premières lettres, liste de mots courants jamais corrigés). Plusieurs couleurs pour un même ouvrage se répartissent : « 2 fenêtres, une marron et une blanche », « 3 fenêtres, 2 blanches et 1 marron », « 2 fenêtres marron et blanche » (une de chaque). Un second morceau avec ses propres cotes (« … 120x100 et 2 marron 150x120 ») devient une variante de l'ouvrage. Corpus de référence : `lib/intake.corpus.test.ts`.

## Aide, discussion de devis, envoi à plusieurs professionnels

- **Infobulles « i »** (`InfoTip`, glossaire `help.*` en trois langues) : à côté des libellés du métier (catégorie, ouverture, vantaux, gamme, couleur, verre, épaisseur, dimensions…), dans l'éditeur, la demande et la fiche client d'un ouvrage. Survol, clavier (Échap ferme) ou toucher ; une seule bulle à la fois ; elle ne change pas la hauteur des lignes.
- **Discussion du devis** (`QuoteDiscussion`) : les messages `message` du devis, côté client et menuisier, avec historique, rafraîchis toutes les 6 s ; l'autre partie est notifiée. L'historique des étapes (`Timeline`) reste à part.
- **Envoi à plusieurs professionnels** (`RecipientsPicker`, `MultiSelect`) : jusqu'à 5 ; une demande par professionnel (chacun répond par son devis) ; un échec n'annule pas les autres.

## Fil unique d'un devis, détails de configuration

- **Discussion et historique** (`QuoteDiscussion`) : un seul fil par devis. Les messages sont des bulles ; les étapes (envoi, acceptation, révision, avis par ouvrage, avancement, évaluation) sont des lignes centrées, dans l'ordre. Il remplace l'ancienne chronologie séparée, y compris sur la page des chantiers.
- **Assistant de demande** : en plus du type, des cotes, de l'ouverture, des vantaux, de la couleur, de la gamme et du verre, il lit le motif du verre, le sens d'ouverture (gauche, droite, les deux), les vantaux fixes et mobiles dans l'ordre écrit (`leafCfg`), les lames et le coffre des volets. Tout détail non compris est gardé tel quel (accents restitués) dans la précision de l'ouvrage (`note`), jamais perdu.

## Vitrine publique

Accessible sans session, y compris en mode MVP : `/`, `/application`, `/menuisiers`, `/menuisiers/[slug]`, `/realisations-menuiserie` (voir `proxy.ts`, test `lib/public-routing.test.ts`). Les écrans d'administration restent protégés. Le logo mène à `/` depuis la barre latérale, l'écran de connexion et l'inscription.

- **Illustrations du produit** : `components/marketing/ProductShowcase.tsx` affiche de vraies captures de l'application (tableau de bord, devis du menuisier, validation par le client, téléphone), en clair et en sombre selon le thème, dans `public/marketing/*.webp`. Elles viennent de `npm run seed:local` (données d'exemple). Pour les refaire : relancer l'application locale puis le script de capture.
- **Photos de réalisations** : celles que publient les menuisiers ; un traitement commun (`.photo-grade`) assagit les couleurs pour que des clichés de sources différentes forment un ensemble. Les visuels d'inspiration générés sont signalés comme tels.
- **Hero** : `HeroSlider` (photo plein cadre qui défile) sous un volet roulant (`RollerShutter`, variable CSS `--p`, aucun rendu React pendant le glissé) ; le texte reste derrière le volet tant qu'il n'est pas entièrement fermé. Une fenêtre coulissante à vitres transparentes s'ouvre derrière quand le volet est levé, puis s'efface. Sans JavaScript ou avec moins d'animations, le volet n'est pas affiché et le hero reste lisible. Les apparitions au défilement passent par `Reveal` (une observation partagée, contenu visible si l'animation échoue).
- **Pages d'erreur** : `app/not-found.tsx` (404, avec la barre et le pied de la vitrine), `app/error.tsx` (erreur inattendue, volontairement sans la barre de navigation) et `app/global-error.tsx` (dernier filet, autonome). `proxy.ts` ne renvoie vers la connexion que les sections privées (`PRIVATE`) : une adresse inconnue donne un vrai 404. Les messages d'erreur d'API (réseau coupé, session expirée, accès refusé, introuvable, trop de tentatives, panne) viennent de `lib/errors.ts`.

## Numéros de téléphone d'un compte

Le numéro principal (`users.phone`, obligatoire à l'inscription) identifie le compte. D'autres numéros (`user_phones`, 4 au plus, `MAX_EXTRA_PHONES`) s'ajoutent dans « Mon compte » (`PhonesCard`) : un code SMS est envoyé au **nouveau** numéro (`sendPhoneCode`, `confirmPhoneCode` dans `lib/verify.ts`) et le numéro n'est rattaché qu'après confirmation, pour que personne ne s'attribue le numéro d'un autre. Ce code (`verifications.purpose = 'phone'`) ne vérifie jamais le compte, et inversement.

**Un numéro = un seul compte**, principal ou supplémentaire : `phoneOwner()` (`lib/phones.ts`) répond clairement (« déjà utilisé ») à l'inscription, à la création par l'admin, au changement du numéro principal et à l'ajout ; la base le garantit en plus (index unique sur chaque table et déclencheurs de la migration 0017 qui comparent les deux tables sous un verrou par numéro, donc même pour deux écritures simultanées). La connexion par téléphone et la recherche d'un client par numéro (`lib/contacts.ts`) acceptent n'importe quel numéro du compte. Un numéro retiré redevient libre.

shortcut: la recherche de l'administration (`USER_SEARCH`) ne porte que sur le numéro principal ; y ajouter les numéros supplémentaires si le support en a besoin.

## Retours des utilisateurs (`lib/feedback.ts`)

Tout compte connecté signale un problème, propose une idée ou laisse une remarque (bouton de la barre du haut, `FeedbackDialog`) : `POST /api/feedback`, 5 par 10 minutes, message de 10 à 2000 caractères, écran d'origine joint (chemin seul). L'administration les lit dans `/admin/retours` (filtres type et statut, `new` → `seen` → `done`). Le message reste, signé du nom d'alors, si le compte est supprimé.

## Où sont stockées les données en production

Tout est dans la base Postgres, rien sur un stockage de fichiers : devis (`quotes.data`, JSON : lignes, prix, schémas), comptes, messages, **et les images**, enregistrées en data URL / base64 : logo et signature (`settings`), photo de profil (`users.avatar`), logo du profil (`menuisier_profiles.logo`), réalisations (`portfolio_items.images`, `thumb`, `before`), pièces jointes et vocaux de la messagerie (`message_attachments.data`, 3 Mo au plus chacune). Mesure sur la base de démonstration : 37 réalisations ≈ 10,5 Mo (≈ 280 Ko l'une), 56 devis ≈ 0,1 Mo. Les listes publiques ne transportent jamais ces images (adresses mises en cache, voir « Annuaire public »).

shortcut: images et pièces jointes en base. À déplacer vers Supabase Storage (déjà dans l'abonnement) ou Vercel Blob, en ne gardant que l'adresse en base, avant d'approcher la limite de la formule (500 Mo en gratuit) : l'envoi en base64 dans le JSON est aussi plafonné à 4,5 Mo par requête sur Vercel.


## Application Android (`mobile/`)

Coque Capacitor qui ouvre le site dans un WebView : même backend, même API, même session par cookie, rien à dupliquer. L'écran de démarrage embarqué (`mobile/www/index.html`) gère l'absence de réseau et un WebView trop ancien. L'APK signé est servi par `public/downloads/AluMg.apk` et présenté sur `/telecharger` (lien dans le menu et le pied de page de la vitrine). La clé de signature n'est jamais versionnée ; procédure de build, de version et de restauration de la clé : `mobile/README.md`. Le sous-projet est exclu d'ESLint et de `tsc`.
