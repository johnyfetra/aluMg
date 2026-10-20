# AluMg

Plateforme pour la menuiserie aluminium et les volets roulants à Madagascar. Vision complète : mettre en relation menuisiers vérifiés et clients (profils, avis, devis en ligne, suivi de chantier).

**Version actuelle** : une place de marché complète en deux espaces.

- **Public (sans compte)** : annuaire des menuisiers (recherche, filtres, notes, avis, badge vérifié) et profil détaillé avec réalisations en photos.
- **Menuisier** : devis configurables (fenêtres, portes, volets, garde-corps, cloisons) avec calcul du besoin en profilés, plan d'achat selon les prix et longueurs du marché, vue 3D animée, PDF professionnel ; réception des demandes des clients, négociation, suivi des chantiers en pourcentage, clients, portfolio, profil public.
- **Client** : demande de devis à un menuisier, suivi (demande, devis reçu, accepté, en cours, terminé), acceptation, refus ou demande de modification/remise, messages, évaluation en fin de chantier, signalement.

Le contact (e-mail **et** téléphone) est obligatoire à l'inscription, pour les deux types de compte.

## Démarrer

```bash
npm install --legacy-peer-deps   # contourne un bug npm avec les peer deps optionnelles
npm run dev                       # http://localhost:3000 → créez un compte sur /inscription
```

Node 20+. Aucune installation de base de données : en développement, une base Postgres embarquée (PGlite) est créée dans `.data/` au premier lancement.

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires du calcul et des accès base (base en mémoire) |
| `npm run test:e2e:fresh` | Tests de bout en bout (API + navigateur Chrome) sur une base jetable et un autre port : **recommandé** |
| `npm run test:e2e` | Mêmes tests contre le serveur déjà lancé (`npm run dev`) : ajoute des comptes de test à votre base locale |
| `npm run lint` · `npm run build` | Qualité et build de production |
| `npm run demo:photos` · `npm run demo:assets` · `npm run seed:demo` | Données de démonstration : vraies photos libres (Pexels, Internet requis), logos et portraits (SVG), puis 6 menuisiers, 4 clients et 15 devis à tous les stades (mot de passe `motdepasse123`) |
| `npm run admin:create` | Crée un compte **administrateur** avec mot de passe généré (voir ci-dessous) |
| `npx drizzle-kit generate` | Génère une migration après une modification de `lib/db/schema.ts` |

## Données de démonstration

```bash
npm run dev                 # dans un terminal
npm run seed:demo           # dans un autre (ADMIN_EMAIL / ADMIN_PASSWORD optionnels : accordent le badge « Vérifié »)
```

Les photos de réalisations viennent de [Pexels](https://www.pexels.com) (voir `public/demo/CREDITS.md`) : elles illustrent le *type* d'ouvrage et non de vrais chantiers ; les logos et portraits sont des illustrations générées (aucune vraie personne). Comptes : `test@alumada.mg`, `sud@alumada.mg`, `tana@demo.mg`, `nosybe@demo.mg`, `fianar@demo.mg`, `mahajanga@demo.mg` (menuisiers) ; `hery@client.mg`, `noro@client.mg`, `toky@client.mg`, `lalao@client.mg` (clients).

## Compte administrateur

```bash
npm run admin:create                                          # admin@alumg.local + mot de passe généré
npm run admin:create -- --email moi@exemple.mg --name "Moi"   # e-mail et nom choisis
npm run admin:create -- --password "MonMotDePasse"            # mot de passe imposé
```

Le mot de passe généré est affiché **une seule fois** : notez-le. Relancer la commande avec le même e-mail réinitialise le mot de passe. En local, arrêtez `npm run dev` avant (par précaution : la base embarquée est prévue pour un seul processus à la fois). En production, définissez `DATABASE_URL` pour viser la bonne base.

Le rôle `admin` est enregistré en base mais aucun écran d'administration n'existe encore (voir `docs/user-stories.md`, epic 5). Les comptes créés avant l'arrivée des rôles sont devenus des comptes menuisier.

## Écrans

| Zone | Écran | Rôle |
|---|---|---|
| Public | `/` | Accueil : présentation, menuisiers les mieux notés, comment ça marche |
| Public | `/menuisiers`, `/menuisiers/[slug]` | Annuaire filtrable, profil (à propos, réalisations, avis) ; la demande de devis exige un compte client |
| Public | `/connexion`, `/inscription` | Accès ; l'inscription choisit client ou menuisier |
| Menuisier | `/tableau-de-bord` | Indicateurs, demandes à traiter, chantiers en cours, montants par mois |
| Menuisier | `/devis`, `/devis/[id]` | Liste filtrable ; éditeur (client, ouvrages, remise, envoi au client, historique) |
| Menuisier | `/devis/[id]/profils`, `/devis/[id]/profils/[ligne]` | Besoin en profilés : achats, coût, marge, ouvrages partageant un profilé, vue 3D |
| Menuisier | `/chantiers`, `/clients` | Avancement des chantiers en %, liste des clients |
| Menuisier | `/realisations`, `/profil-public` | Portfolio photos, profil public et publication |
| Menuisier | `/reglages`, `/reglages/profils` | Entête, signature, tarifs, majorations, longueur de barre ; marché des profilés (prix et longueurs) |
| Client | `/espace-client`, `/espace-client/nouvelle`, `/espace-client/devis/[id]` | Mes demandes, nouvelle demande, suivi d'un devis |
| Commun | `/compte` | Nom, téléphone, mot de passe |

Transversal : thème clair/sombre (barre latérale identique), 3 langues (français, English, Malagasy), mobile-first, accessible au clavier et aux lecteurs d'écran.

## Documentation

- [User stories et feuille de route](docs/user-stories.md)
- [Architecture, sécurité, conventions, déploiement](docs/architecture.md)

## Limites connues

- Les formules de débit sont génériques ; elles doivent être calibrées avec un vrai menuisier, série de profilés par série.
- Les tarifs et majorations affichés au départ sont des exemples.
- Les listes d'options (couleurs, verres, gammes) viennent de `lib/model.ts` et restent à valider avec des menuisiers malgaches.
- Pas de limitation des tentatives de connexion ni des demandes de devis, pas de vérification d'e-mail ni de mot de passe oublié : à ajouter avant l'ouverture au public.
- Le badge « Vérifié » et le traitement des signalements n'ont pas encore d'écran d'administration (les données existent en base).
- Un devis envoyé au client est verrouillé ; pour un devis sans compte client, « Créer une nouvelle version » en repart d'une copie.
- Les photos sont stockées en base (réduites côté navigateur) : à déplacer vers un stockage de fichiers avant la montée en charge.
- Le client ne peut pas encore télécharger le PDF du devis (le menuisier l'envoie).
- Les traductions malgaches doivent être relues par un locuteur natif.
