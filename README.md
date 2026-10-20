# AluMg

Plateforme pour la menuiserie aluminium et les volets roulants à Madagascar. Vision complète : mettre en relation menuisiers vérifiés et clients (profils, avis, devis en ligne, suivi de chantier).

**Version actuelle : l'outil de devis du menuisier**, avec comptes. Il configure l'ouvrage, calcule le besoin en profilés, dessine l'ouvrage, applique les tarifs et majorations du menuisier et génère un devis PDF à son entête, signé.

Catégories : fenêtre, porte, volet, garde-corps, cloison vitrée. Fenêtres : coulissante, ouvrante, oscillo-battante, à soufflet, naco (jalousie à lames de verre), fixe, avec un **nombre de vantaux libre** (jusqu'à 8). Gamme européenne ou asiatique ; couleur laquée, anodisée ou faux bois ; vitrage (type, épaisseur, double vitrage, motif) ; moustiquaire, grille de sécurité ; volet roulant ou rideau métallique, manuel ou motorisé ; garde-corps à barreaudage ou en verre.

## Démarrer

```bash
npm install --legacy-peer-deps   # contourne un bug npm avec les peer deps optionnelles
npm run dev                       # http://localhost:3000 → créez un compte sur /inscription
```

Node 20+. Aucune installation de base de données : en développement, une base Postgres embarquée (PGlite) est créée dans `.data/` au premier lancement.

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires du calcul et des accès base (base en mémoire) |
| `npm run test:e2e` | Tests de l'API réelle (lancez `npm run dev` avant) |
| `npm run lint` · `npm run build` | Qualité et build de production |
| `npm run admin:create` | Crée un compte **administrateur** avec mot de passe généré (voir ci-dessous) |
| `npx drizzle-kit generate` | Génère une migration après une modification de `lib/db/schema.ts` |

## Compte administrateur

```bash
npm run admin:create                                          # admin@alumg.local + mot de passe généré
npm run admin:create -- --email moi@exemple.mg --name "Moi"   # e-mail et nom choisis
npm run admin:create -- --password "MonMotDePasse"            # mot de passe imposé
```

Le mot de passe généré est affiché **une seule fois** : notez-le. Relancer la commande avec le même e-mail réinitialise le mot de passe. En local, arrêtez `npm run dev` avant (par précaution : la base embarquée est prévue pour un seul processus à la fois). En production, définissez `DATABASE_URL` pour viser la bonne base.

Le rôle `admin` est enregistré en base mais aucun écran d'administration n'existe encore (voir `docs/user-stories.md`, epic 5).

## Écrans

| Écran | Rôle |
|---|---|
| `/tableau-de-bord` | Indicateurs, montants acceptés par mois, répartition par statut, derniers devis |
| `/devis` | Tableau, recherche, filtres par statut, changement de statut, PDF, suppression |
| `/devis/nouveau`, `/devis/[id]` | Éditeur : client, ouvrages configurables, illustration fidèle à tous les choix, besoin en profilés détaillé (longueur de barre, profilé par élément, plan de coupe, perte), totaux fixes à droite, PDF |
| `/reglages` | Entête (logo, NIF/STAT, couleur), signature, tarifs au m², majorations, longueur de barre et trait de scie, TVA, acompte |
| `/compte` | Nom, mot de passe |
| `/connexion`, `/inscription` | Accès |

Transversal : thème clair/sombre (barre latérale identique dans les deux), 3 langues (français, English, Malagasy), mobile-first, accessible au clavier et aux lecteurs d'écran.

## Documentation

- [User stories et feuille de route](docs/user-stories.md)
- [Architecture, sécurité, conventions, déploiement](docs/architecture.md)

## Limites connues

- Les formules de débit sont génériques ; elles doivent être calibrées avec un vrai menuisier, série de profilés par série.
- Les tarifs et majorations affichés au départ sont des exemples.
- Les listes d'options (couleurs, verres, gammes) viennent de `lib/model.ts` et restent à valider avec des menuisiers malgaches.
- Pas de limitation des tentatives de connexion, pas de vérification d'e-mail ni de mot de passe oublié : à ajouter avant l'ouverture au public.
- Les traductions malgaches doivent être relues par un locuteur natif.
