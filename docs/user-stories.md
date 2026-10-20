# User stories et feuille de route

Format : *En tant que `<rôle>`, je veux `<action>` afin de `<bénéfice>`.* Chaque story a des critères d'acceptation (CA) vérifiables.
Statut : ✅ fait · 🔜 prochain · 💡 plus tard.

Rôles : **Menuisier** (artisan alu et volets roulants), **Client** (particulier ou professionnel), **Admin** (équipe de la plateforme).

---

## Epic 1 — Devis du menuisier (V0)

### ✅ US-1.1 Configurer mon entête
En tant que menuisier, je veux enregistrer mon nom, mon adresse, mes contacts, mon NIF/STAT, mon logo et ma couleur afin que mes devis soient à mon image.
- CA : tous les champs sont modifiables dans `/reglages` et conservés après rechargement.
- CA : le logo importé est réduit automatiquement (max 500 px).
- CA : l'entête apparaît sur chaque page du PDF.

### ✅ US-1.2 Enregistrer ma signature
En tant que menuisier, je veux dessiner ma signature au doigt ou à la souris, ou importer une image, afin qu'elle figure sur mes devis.
- CA : le pad fonctionne au tactile et à la souris.
- CA : la signature peut être effacée et remplacée.
- CA : elle apparaît dans le bloc « Le menuisier » du PDF.

### ✅ US-1.3 Définir mes tarifs et conditions
En tant que menuisier, je veux fixer mon prix au m² par type d'ouvrage, la TVA, l'acompte, la validité et la surface minimale facturée afin que les devis reflètent mes prix.
- CA : modifier les réglages ne change pas les devis déjà enregistrés (les conditions sont figées dans le devis).

### ✅ US-1.4 Créer un devis multi-ouvrages
En tant que menuisier, je veux ajouter plusieurs ouvrages (coulissant, battant, fixe, volet roulant) avec dimensions, quantité, couleur et vitrage afin de chiffrer un chantier complet.
- CA : le prix unitaire est calculé (surface × tarif) et reste modifiable à la main.
- CA : dimensions valides de 200 à 6000 mm, sinon message d'erreur et enregistrement bloqué.
- CA : totaux HT, TVA, TTC mis à jour en direct.

### ✅ US-1.5 Voir une illustration de l'ouvrage
En tant que menuisier, je veux un schéma coté de chaque ouvrage afin que le client comprenne ce qu'il achète.
- CA : le schéma suit le type et les dimensions, et figure dans le PDF.

### ✅ US-1.6 Calculer mes besoins en profilés
En tant que menuisier, je veux savoir combien de barres de 6 m commander afin d'éviter les erreurs d'achat et de limiter les chutes.
- CA : calcul par référence de profilé, avec trait de scie, pourcentage de chute affiché.
- CA : alerte si une pièce dépasse 6 m.
- CA : option « joindre la fiche de débit » ajoute une annexe atelier au PDF (pièces, vitrages, barres).

### ✅ US-1.7 Générer un devis PDF professionnel
En tant que menuisier, je veux un PDF numéroté, daté, avec validité, conditions, signature et zone « bon pour accord » afin de l'envoyer au client.
- CA : numérotation automatique `DV-AAAA-NNNN`.
- CA : le PDF est généré dans la langue de l'interface.
- CA : pagination automatique et pied de page sur chaque page.

### ✅ US-1.8 Suivre mes devis
En tant que menuisier, je veux voir mes devis et leur statut afin de relancer ceux qui attendent une réponse.
- CA : indicateurs (émis, en attente, acceptés, montant accepté) ; statut modifiable ; rouvrir, régénérer le PDF, supprimer avec confirmation.

### ✅ US-1.9 Utiliser l'app dans ma langue et mon thème
En tant qu'utilisateur, je veux choisir français, English ou Malagasy, et un thème clair ou sombre, afin d'être à l'aise.
- CA : choix mémorisé ; thème appliqué avant le premier affichage (pas de flash) ; le thème système sert de défaut.

### ✅ US-1.14 Configurer finement un ouvrage
En tant que menuisier, je veux choisir catégorie (fenêtre, porte, volet), ouverture (coulissante 2/3/4 vantaux, ouvrante 1/2, jalousie, fixe), gamme européenne ou asiatique, couleur (laqué, anodisé, faux bois), vitrage (type, épaisseur dont double vitrage, motif), options (moustiquaire, grille), volet roulant ou rideau métallique, manuel ou motorisé, afin de chiffrer exactement ce que le client demande.
- CA : seuls les champs utiles à l'ouvrage sont affichés ; une combinaison invalide est impossible.
- CA : le prix suit la configuration (tarif au m² + majorations en %), reste modifiable à la main, avec un bouton pour le recalculer.
- CA : le schéma reprend la couleur du profilé, le nombre de vantaux et le remplissage ; le débit suit la configuration.

### ✅ US-1.17 Chiffrer toutes les catégories utiles
En tant que menuisier, je veux aussi chiffrer des garde-corps (barreaudage ou verre), des cloisons vitrées, des fenêtres naco (jalousie), oscillo-battantes et à soufflet afin de couvrir l'essentiel de ce que je vends.
- CA : chaque catégorie a son tarif au m² et ses règles de débit ; les options sans objet ne coûtent rien.

### ✅ US-1.18 Nombre de vantaux libre
En tant que menuisier, je veux saisir n'importe quel nombre de vantaux (ou de panneaux) dans la plage de l'ouvrage afin de chiffrer les grandes baies.
- CA : boutons rapides + champ libre ; la valeur est ramenée dans la plage (coulissant 2 à 8, ouvrant 1 à 6, cloison 1 à 10).

### ✅ US-1.19 Illustration fidèle
En tant que menuisier, je veux que le schéma montre tous les choix (gamme, couleur, verre, motif, double vitrage, moustiquaire, grille, motorisation) afin que le client voie exactement son ouvrage.

### ✅ US-1.20 Besoin en profilés détaillé
En tant que menuisier, je veux voir, par profilé : la longueur de barre, les éléments et ouvrages qui l'utilisent, les coupes, un plan de coupe barre par barre, la longueur utilisée et la perte, plus les totaux du devis (barres à acheter, longueur utilisée, perte), afin d'acheter juste et de limiter les chutes.
- CA : longueur de barre et trait de scie réglables ; même détail dans la fiche de débit du PDF ; vitrages à commander avec surface totale.

### ✅ US-1.21 Interface professionnelle
En tant qu'utilisateur, je veux une interface pleine largeur, avec indicateur de page active, menu de langue, commutateur de thème et menu de profil soignés.

### ✅ US-1.15 Régler mes majorations
En tant que menuisier, je veux fixer le pourcentage de chaque option (gamme, faux bois, verre feuilleté, épaisseur, motif, moteur…) afin que mes prix reflètent mes coûts.

### ✅ US-1.16 Voir mon activité d'un coup d'œil
En tant que menuisier, je veux un tableau de bord (montant accepté, en attente, taux d'acceptation, montants par mois, répartition par statut, derniers devis).

### 🔜 US-1.10 Calibrer les formules par série de profilés
En tant que menuisier, je veux choisir ma série de profilés (et régler ses déductions) afin que le débit corresponde à mon atelier.
- À valider avec des menuisiers : les listes d'options, les gammes « européenne » et « asiatique », les épaisseurs courantes, le sens du mot « naco ».

### 🔜 US-1.11 Prix par matière
En tant que menuisier, je veux chiffrer à partir du prix de mes barres, vitrages et quincaillerie plus ma marge, au lieu d'un prix au m², afin de mieux maîtriser ma rentabilité.

### 💡 US-1.12 Montant en lettres et mentions légales
En tant que menuisier, je veux le total en toutes lettres (français/malgache) et mes mentions légales sur le devis.

### 💡 US-1.13 Envoi par WhatsApp et e-mail
En tant que menuisier, je veux envoyer le PDF depuis l'app afin de gagner du temps.

---

## Epic 2 — Compte et données (prérequis de la plateforme)

### ✅ US-2.0 Créer le compte administrateur
En tant qu'équipe de la plateforme, je veux une commande qui crée un administrateur avec un mot de passe généré afin de démarrer sans manipuler la base.
- CA : `npm run admin:create` affiche l'e-mail et le mot de passe une seule fois ; relancer réinitialise le mot de passe.

### ✅ US-2.1 Créer un compte et retrouver mes données partout
En tant que menuisier, je veux m'inscrire et me connecter (e-mail + mot de passe) afin de retrouver mes devis et mes réglages sur tous mes appareils.
- CA : un compte ne voit jamais les données d'un autre (testé).
- CA : session de 30 jours, déconnexion, changement de mot de passe dans « Mon compte ».
- Reste à faire : mot de passe oublié, vérification d'e-mail, limitation des tentatives, connexion par SMS.

### 💡 US-2.2 Équipe
En tant que patron, je veux inviter un collaborateur afin qu'il crée des devis sous mon entreprise.

---

## Epic 3 — Profil public et confiance

### ✅ US-3.1 Créer mon profil et partager mes réalisations
En tant que menuisier, je veux un profil public (nom, ville, présentation, spécialités, logo) et un portfolio de photos afin que les clients voient mon travail.
- CA : le profil n'est visible qu'une fois publié, et seulement avec nom et ville ; la première photo sert de couverture dans l'annuaire.

### ✅ US-3.3 Chercher un menuisier fiable (sans compte)
En tant que client ou visiteur, je veux filtrer l'annuaire par texte, ville, spécialité, note minimale et badge vérifié, et trier par note, chantiers terminés, ancienneté ou nom.
- CA : aucune connexion n'est requise ; aucune coordonnée n'est affichée publiquement ; la page d'un profil montre réalisations (visionneuse), avis et répartition des notes.

### ✅ US-3.4 Discuter par messagerie
En tant que client ou menuisier, je dispose d'un menu **Messagerie** (après connexion) pour échanger avec l'autre partie, avec pastille de messages non lus.
- Le client écrit à tout menuisier publié (bouton sur le profil et sur son devis) ; le menuisier ne peut écrire qu'à un client qui lui a demandé un devis (pas de démarchage).
- Une conversation par couple client/menuisier ; un tiers n'y accède jamais ; messages de 2 000 caractères maximum ; mise à jour par interrogation régulière (3 s).
- Hors périmètre : pièces jointes, notifications par e-mail/SMS, temps réel (WebSocket).

### 🔜 US-3.2 Demander le badge « vérifié »
En tant que menuisier, je veux soumettre mes justificatifs (NIF/STAT, visite, références) pour obtenir un badge.
- Admin : file de vérification avec décision motivée. (Le champ `verified` existe ; il manque la demande et l'écran d'administration.)

---

## Epic 4 — Commande et suivi de chantier

### ✅ US-4.1 Demander un devis en ligne
En tant que client connecté, je veux décrire mon besoin (ouvrages configurés, adresse, date, message) et l'envoyer à un menuisier.
- CA : la demande exige un compte client ; le client ne voit aucun prix tant que le devis n'est pas envoyé.

### ✅ US-4.2 Répondre à une demande
En tant que menuisier, je veux que la demande arrive prête à chiffrer (prix préremplis avec mes tarifs) afin de répondre vite : envoyer le devis, ou décliner.

### ✅ US-4.3 Valider le devis et négocier
En tant que client, je veux accepter, refuser, ou demander une modification ou une remise (avec message), et échanger des messages avec le menuisier.
- CA : le menuisier révise (remise incluse) puis renvoie ; un devis envoyé, accepté ou refusé est verrouillé pour le menuisier ; l'historique est visible des deux côtés.

### ✅ US-4.6 Suivre l'avancement du chantier
En tant que menuisier, je veux indiquer l'avancement en % avec une note, et en tant que client le suivre.
- CA : 0 % accepté, 1 à 99 % en cours, 100 % terminé ; le tableau de bord montre les chantiers en cours.

### ✅ US-4.5 Réceptionner et noter
En tant que client, je veux noter le menuisier à la fin du chantier ; une seule évaluation par devis, seulement après « terminé ».

### ✅ US-4.7 Signaler un menuisier
En tant que client, je veux signaler un menuisier (motif, détails) de façon confidentielle.
- À venir : écran d'administration pour traiter les signalements.

### 🔜 US-4.8 Télécharger le devis en PDF (client)
En tant que client, je veux télécharger le PDF du devis reçu.

### 💡 US-4.4 Paiement sécurisé par mobile money
En tant que client, je veux payer l'acompte et le solde via MVola, Orange Money ou Airtel Money, libérés au menuisier à l'étape convenue.

### ✅ US-4.9 Gérer mes clients
En tant que menuisier, je veux la liste de mes clients (compte ou saisis à la main), leurs devis acceptés et montants.

### ✅ US-4.10 Détail des profilés par ouvrage
En tant que menuisier, je veux, pour le devis et pour chaque ouvrage : les profilés nécessaires (nombre, longueurs, éléments), les autres ouvrages qui utilisent le même profilé, mes prix et longueurs de barre du marché, le plan d'achat le moins cher, le coût réel et ma marge sur profilés.
- CA : prix et longueurs configurables par profilé (majorations gamme et finition) ; barres de couleurs différentes jamais mélangées.

### ✅ US-4.11 Vue 3D animée
En tant que menuisier ou client, je veux manipuler un modèle 3D de l'ouvrage (faire coulisser, ouvrir, incliner, relever un volet, tourner la vue) pour tester l'ouvrage.
- CA : mouvement fluide (ressort amorti), survol d'un profilé du besoin = pièce surlignée en 3D, respect de `prefers-reduced-motion`.

---

## Epic 5 — Administration

### 💡 US-5.1 Gérer les comptes
En tant qu'admin, je veux lister, suspendre et réinitialiser les comptes menuisiers et clients.

### 💡 US-5.2 Modérer
En tant qu'admin, je veux traiter les signalements et accorder ou retirer le badge « vérifié ».

### 💡 US-5.3 Tableau de bord de la plateforme
En tant qu'admin, je veux voir le nombre de comptes, de demandes et de chantiers afin de piloter le lancement.

---

## Ordre recommandé

1. Valider avec 3 à 5 menuisiers et quelques clients réels, à Antananarivo : listes d'options, formules de débit, parcours de demande de devis.
2. Avant l'ouverture publique : mot de passe oublié, vérification d'e-mail, limitation des tentatives, écran d'administration (badge, signalements), stockage de fichiers pour les photos.
3. Ensuite : PDF côté client, paiement mobile money, notifications (SMS/WhatsApp).

## Définition de « terminé »

Une story est terminée quand : ses CA sont vérifiés, `npm run lint`, `npm test` et `npm run build` passent, les textes existent dans les 3 langues, et l'écran est utilisable au clavier, en thème clair et sombre, sur mobile.
