# Audit UI/UX — AluMg

Date : 29 octobre 2026. Périmètre : dépôt local, code et vérifications techniques. Le brief fourni s'arrête après « Chaque » dans la phase 6. Les observations visuelles ci-dessous proviennent des styles et composants : aucune capture navigateur n'a pu être réalisée, le connecteur ne dispose d'aucun navigateur connecté.

## Produit réellement implémenté

AluMg est un outil de **menuiserie aluminium** : chiffrage des ouvrages, dimensions, finitions, débit des profilés, fournisseurs, marge, PDF et collaboration avec le client. L'univers atelier demandé est pertinent, mais il ne faut pas présenter le produit comme un logiciel spécialisé dans le travail du bois. Le nom AluMg est conservé.

Next.js 16.4.2 App Router, Cache Components et Partial Prefetching ; React 19.3 ; TypeScript ; Tailwind 4 via Turbopack ; Geist via next/font ; Lucide ; SWR ; Zod ; Drizzle/PostgreSQL et PGlite ; jsPDF ; Three.js et React Three Fiber. Les guides locaux Next sur les layouts et CSS ont été consultés avant modification.

Les groupes `(auth)`, `(app)`, `(client)`, `(shared)` et `(public)` séparent les enveloppes. `Shell` partage les composants de navigation, avec des menus selon le rôle. `PublicShell` habille l'annuaire et les profils. `lib/messages` contient français, anglais et malgache. `app/globals.css` centralise les thèmes clair/sombre et les composants CSS.

Le MVP est actif par défaut (`NEXT_PUBLIC_MVP !== "0"`). Les chantiers, l'annuaire, les réalisations et les profils publics sont implémentés mais masqués par le proxy. Le carnet de clients reste disponible : une phrase de `docs/architecture.md` est obsolète sur ce point. Aucun écran masqué n'a été réactivé pour embellir le parcours.

## Parcours et composants examinés

| Surface | Réalité métier / principaux composants | Intervention |
| --- | --- | --- |
| Connexion, inscription, vérification | AuthForm, PasswordField, OtpInput, VerifyAccount ; identifiant téléphone/e-mail, choix de rôle, vérification par canal | Nouvelle composition, logo, image locale, champs plus lisibles, erreur annoncée, chargement conservé |
| Tableau de bord professionnel | Totaux des devis, demandes, statuts, montants par mois, projets si hors MVP | Priorités provenant de requested/negotiation avant les graphiques ; chargement et erreur explicites |
| Navigation et header | Shell, Controls, Menu, notifications, langues, thème, compte | Logo cohérent, rôle explicite, header opaque, navigation défilable, fermeture clavier et focus mobile |
| Devis | Liste, création, édition, aperçu, besoins en profilés ; QuoteEditor, LinesTable, QuotePaper, Catalog | Tokens communs, tableau défilable, actions repliables, en-têtes sémantiques, filtres et états de chargement |
| Espace client | Devis reçus, décisions, négociation, détails des ouvrages, plans/3D, commentaires, PDF | Prochaine étape selon statut, faux compteurs à zéro évités au chargement, erreurs et filtre vide explicites |
| Notifications | Événements de devis, statut lu/non lu, lien vers ouvrage | États réseau et chargement distincts du vide ; erreurs de mutation visibles ; anti-double clic |
| Messagerie | Conversations, pièces jointes, vocaux, indicateurs de saisie et non-lus | Surfaces, bulles et contrôles harmonisés via tokens ; aucun message envoyé pendant l'audit |
| Paramètres, modèle de devis, fournisseurs | Données entreprise, tarifs, catalogue, apparence des documents | Surfaces partagées et remplacement de l'écran blanc par chargement/erreur avec reprise |
| Contacts | Carnet professionnel, recherche, invitation, préremplissage d'un devis | Harmonisation par composants et tokens ; logique conservée |
| Chantiers | Progression métier, commentaire et action sur devis | Thème partagé ; disponibilité MVP conservée |
| Modales et sélecteurs | ConfirmProvider utilise dialog natif ; Select possède navigation clavier et portail | Habillage cohérent via tokens ; comportements natifs conservés |
| Public, profils, portfolio | Annuaire, profils, réalisations, avis après achèvement | Logo déjà présent conservé et harmonisé ; thème partagé |

## Constats priorisés

| Gravité | Constat initial | Correction / état |
| --- | --- | --- |
| Haute | useQuotes perdait l'erreur SWR : panne interprétable comme absence de devis | Erreur exposée, reprise dans tableau de bord et liste |
| Haute | Dashboard client affichait des zéros avant réception des données | Skeleton avant indicateurs, état d'erreur distinct |
| Haute | Menu mobile masqué par translation mais liens encore tabulables | inert synchronisé au breakpoint, focus à l'ouverture, boucle Tab, Échap et fermeture |
| Haute | Notifications : promesses rejetées sans retour visible | Erreurs lecture/écriture annoncées, boutons désactivés pendant action |
| Moyenne | Graphiques avant les actions prioritaires | Section demandes/modifications fondée sur les vrais statuts |
| Moyenne | Traduction malgache des montants acceptés assimilée à des encaissements | Libellé corrigé ; note indiquant le regroupement par date de création du devis |
| Moyenne | Aucune explication de prochaine étape sur les cartes client | Phrase spécifique à chaque statut, sans inventer de délai |
| Moyenne | Ancienne connexion : maquette en perspective, halo, glassmorphism, données d'exemple | Nouveau panneau AtelierShowcase photographique, texte de valeur, formulaire sobre |
| Moyenne | Rouge de marque proche de l'erreur, gris froids, logo générique | Vert atelier, ivoire, bois ; erreur séparée ; assemblage géométrique |
| Moyenne | Actions et tableau des devis risquant de dépasser le conteneur | Actions repliables et scroll horizontal local |
| Moyenne | Paramètres/fournisseurs/modèle : rendu null pendant chargement | Skeleton et reprise sur erreur |
| Moyenne | Badges reprenant des teintes de graphiques trop claires pour du petit texte | Couleurs sémantiques foncées en clair et adaptées au sombre |
| Faible | Identité mobile et publique disparate | Logo partagé et déclinaisons SVG cohérentes |

## Sécurité et vérité des données

Les API et la machine d'états métier ne sont pas modifiées. Les sessions utilisent un jeton aléatoire, son empreinte en base et un cookie httpOnly/SameSite, secure en production. Le proxy et les routes conservent leurs contrôles de rôle, d'origine et de vérification du compte. Les redirections de connexion restent internes. Les prix des brouillons restent masqués côté client. Aucune route de récupération de mot de passe n'existe : aucun faux lien n'a été ajouté. Aucun chiffre, avis ou délai fictif n'a été introduit.

Les tests existants de calcul, données et workflow restent la base de validation. Les modifications préexistantes de QuoteEditor, RequestForm et AuthShowcase sont conservées ; l'ancien showcase reste dans le dépôt mais les écrans d'accès utilisent AtelierShowcase.

## Contrastes mesurés

Calcul de luminance relative sRGB sur les variables finales (texte normal, minimum AA 4,5:1). Cela ne constitue pas une certification WCAG de tous les écrans.

| Paire | Clair | Sombre |
| --- | ---: | ---: |
| Texte / fond | 13,59 | 14,67 |
| Texte secondaire / surface | 6,17 | 6,97 |
| Texte bouton / primaire | 10,86 | 6,15 |
| Erreur / surface | 6,52 | 7,40 |
| Succès / surface | 6,29 | 8,53 |
| Avertissement / surface | 6,11 | 8,47 |
| Information / surface | 6,93 | 9,47 |

Texte secondaire sidebar / fond : 5,88. Bois décoratif réservé aux accents ; le petit texte des badges utilise les tokens sémantiques. Les contrôles désactivés restent identifiables. Les badges incluent icône et libellé, les graphiques des descriptions, et les animations respectent prefers-reduced-motion.

## Vérifications et limites

- 180 tests sur 14 fichiers : réussis.
- TypeScript : réussi.
- Build de production : réussi après autorisation réseau pour la police Geist existante.
- HTTP local `/connexion` : 200.
- Image générée : inspectée et convertie en WebP local, sans service tiers au runtime.
- Aucun navigateur connecté : contrôle visuel desktop/mobile, zoom, focus réel et lecteur d'écran non exécutés. Les tests navigateur existants n'ont pas été exécutés.
- Les pages internes bénéficient de l'harmonisation commune ; elles n'ont pas chacune fait l'objet d'une validation visuelle individuelle. Tester particulièrement l'éditeur de devis dense et les portails de sélecteurs sur petit écran.
- Les échéances de planning et étapes détaillées de fabrication ne sont pas un modèle métier structuré dans le périmètre inspecté : aucune timeline fictive ajoutée.
- Une recherche d'antériorité de marque n'a pas été réalisée ; le symbole est une construction géométrique, pas une reprise volontaire d'une marque.
