# Analyse métier — devis, besoin en profilés, marché, pertes

Date : 29 octobre 2026. Base : lecture de `lib/calc.ts`, `procure.ts`, `costing.ts`, `totals.ts`, `model.ts`, `workflow.ts`, `Budget.tsx`, `ProfileNeeds.tsx`, du tableau de bord, et un calcul réel sur 4 ouvrages avec les réglages par défaut (fenêtre coulissante 1500×1200, 3 fenêtres 1200×1000, porte battante pleine 900×2100, volet roulant 1500×1400). Aucune donnée d'atelier réelle : les chiffres illustrent le comportement du code, pas la réalité d'un menuisier.

## 1. Comment le devis est construit

1. Le menuisier saisit des **ouvrages** (fenêtre, porte, volet, garde-corps, cloison) : dimensions, ouverture, vantaux, gamme, couleur, verre, options.
2. `cutList` en déduit les **coupes de profilés** (dormant, ouvrant, battement, traverse…), les **vitrages** et les **panneaux pleins**, par formules de déduction fixes (`shortcut` déjà signalé dans le code).
3. `procure` regroupe les coupes par **profilé + gamme + couleur**, remplit des barres (first-fit decreasing, essai de chaque longueur du marché) et choisit l'offre la moins chère par barre.
4. Le prix de vente suit un des deux modes des réglages : **tarif au m²** (+ majorations) ou **prix de revient** (matière + main-d'œuvre + frais généraux + marge, arrondi au millier d'Ar).
5. `Budget` recompose le tout pour le devis entier : coût, marge, besoin de barres, chute.

Le moteur est cohérent, pur et testé (180 tests). Les points faibles ne sont pas des bugs d'architecture : ce sont des **écarts avec la réalité d'un atelier** et quelques **chiffres trompeurs**.

## 2. Constats chiffrés (ce que le code fait réellement)

| # | Constat | Preuve | Effet métier |
| - | ------- | ------ | ------------ |
| A | **Les panneaux pleins ne sont jamais chiffrés.** `cutList` produit `panels` (porte pleine, semi-vitrée), affichés dans le besoin (`ProfileNeeds`), mais `extrasCost`/`costLine` ne lisent que `glass`. | Porte pleine 900×2100 : `panels = [{770×1970}]`, `glass = []`, aucun coût panneau. | Prix de revient sous-estimé, marge **surestimée** sur toute porte pleine ou semi. |
| B | **Le mode « prix de revient » chiffre chaque ouvrage seul** : il paie ses barres entières. Le devis entier mutualise. | Somme des profilés ligne par ligne : 1 484 000 Ar ; devis entier : 1 407 000 Ar (−5 %). Le code le reconnaît (`shortcut`, `cost.shared`). | Prix de vente un peu gonflé au mode coût, donc plus de devis perdus face à un concurrent. Un petit devis (1 ouvrage) est l'inverse : exact. |
| C | **Tarif au m² et prix de revient ne sont pas calibrés l'un sur l'autre.** | Marge réelle du tarif m² sur le prix de revient : fenêtre +94 %, 3 fenêtres +69 %, porte +180 %, **volet +7 %**. | Avec les valeurs par défaut, le volet se vend presque à prix coûtant, la porte avec une marge énorme. Les tarifs d'exemple servent de base à de vrais devis : risque de sous-vendre ou de perdre le marché. |
| D | **Deux définitions de la « marge ».** Réglages : `marginPct` = % du **prix de revient** (majoration). Budget : « marge % » = % du **prix de vente HT**. | 30 % de majoration = 23 % de marge sur vente. | Le menuisier vise 30 %, le Budget affiche 23 % et il croit mal chiffrer (ou l'inverse). Le seuil `minMarginPct` alerte sur laquelle ? À clarifier. |
| E | **Les prestations (pose, transport…) comptent dans le prix de vente mais pas dans le coût.** `totals` les ajoute à `gross` ; `Budget` calcule `margin = ht − coût matière/MO`. | Lecture de `Budget.tsx` : coût = profilés + accessoires + verre + MO + frais. | Marge affichée trop haute dès qu'une prestation est facturée : elle est comptée comme du bénéfice pur. |
| F | **La remise du devis n'entre pas dans le calcul de marge de ligne.** `costLine.price` ignore `discount` ; seul `Budget` la déduit. | `totals` → `discount` ; `salePrice` sans remise. | Une remise de 10 % sur un devis à 23 % de marge laisse 13 % : rien ne l'indique avant l'envoi. |
| G | **Taux de conversion du tableau de bord erroné.** `decided` contient `sent` et `negotiation` (non tranchés). | `dashboard` ligne 101 : `inStatus("sent","negotiation", …WON, "rejected")`. | Chaque devis en attente baisse le taux comme s'il était perdu. |
| H | **Le « perdu » commercial n'est pas mesuré.** `reject` accepte un message libre, jamais un motif structuré ni un prix concurrent ; rien ne l'agrège. | `workflow.ts` : `reject` → `message?`. Aucun écran « devis perdus ». | Impossible de savoir si on perd sur le prix, le délai, la couleur ou le silence du client. |

## 3. Besoin en profilés : où la modélisation s'écarte de l'atelier

Le plan de coupe est correct pour une barre unie. Ce qu'il ne sait pas faire :

1. **Une seule famille de profilés par élément, sans série.** `pf.dormant` sert la fenêtre coulissante, la fenêtre battante, la porte et la cloison. En atelier, un dormant à rail de coulisse, un dormant battant et un cadre de porte sont des références (et des prix) différents. Le débit est « générique » ; il ne peut pas produire une vraie commande à un fournisseur. *(Le code l'annonce : « à ajuster par série de profilés », US-1.10.)*
2. **Pas de coupes d'onglet.** Un cadre aluminium est coupé à 45°. Le trait de scie compte 5 mm par coupe quelle que soit l'inclinaison ; la longueur de barre consommée par un onglet est supérieure à sa longueur « extérieure ». À mesurer avec l'atelier : c'est un petit pourcentage, mais cumulé sur 200 coupes il compte.
3. **Le dernier trait de scie est facturé.** `left >= len + kerf` ajoute un trait même pour la dernière pièce d'une barre. Léger biais prudent (quelques mm par barre).
4. **Aucun stock de chutes.** Toute chute est déclarée « perdue » dans `wasteLen`. Un menuisier réutilise les chutes de plus de ~500–800 mm (traverses, barreaux, petits ouvrants). Sur l'exemple : 4 groupes sur 6 ont au moins une chute > 500 mm (1,1 m à 2,5 m).
5. **Barres isolées sur petits devis.** Le volet roulant : coffre et axe 1 barre chacun à **63 % de perte**, guides 30 %. Sur un devis à un seul volet, c'est inévitable, sauf si on **réaffecte la chute** à un autre devis ou si on propose une barre plus courte (le marché n'a que 6 m et 4 m par défaut).
6. **Le verre est chiffré à l'aire exacte.** `glassOf` ne compte ni plaque standard, ni chute de découpe, ni minimum de facturation, ni casse. La perte réelle sur verre se situe souvent de 10 à 25 % (ordre de grandeur à valider auprès du vitrier), et elle n'apparaît nulle part.
7. **Les accessoires sont des règles génériques** (charnières, joints, galets) : cohérent pour un devis préliminaire, insuffisant pour une commande.

## 4. Marché (fournisseurs, prix)

Ce que le modèle de marché sait faire : par profilé, des offres (longueur, prix), une majoration gamme européenne et une par finition, des prix d'accessoires et de verre, des profilés « plus disponibles ».

Ce qu'il ne sait pas :

- **Pas de fournisseur nommé** : une offre n'a ni fournisseur, ni date de prix, ni délai, ni minimum de commande, ni coût de transport/import. Impossible de comparer deux fournisseurs ni de savoir si un prix est périmé.
- **Prix « d'exemple » partout** : `BAR_PRICE`, tarifs m², verre, accessoires, main-d'œuvre sont des valeurs de départ. Rien n'oblige à les calibrer avant d'émettre un devis ; aucune alerte « vos prix n'ont pas été modifiés ».
- **Pas de prix au kilo.** L'aluminium se négocie souvent au poids ; une variation du cours se répercute sur toutes les barres. Le curseur « variation % » de `MarketSim` y répond partiellement.
- **Pas d'historique** : on ne peut pas dire « ce devis a été chiffré avec les prix du mois dernier ».
- `MarketSim` simule gamme, couleur et variation de prix sur un devis : c'est la bonne direction, utile avant d'envoyer, mais il ne garde pas la décision.

## 5. Le « perdu » — deux sens, à traiter séparément

**Perte de matière** (chute, trait de scie, verre, barres entamées) : calculée en % de barres achetées, avec seuil d'alerte à 40 % (`text-warn`). Proposition : séparer **chute réutilisable** (≥ seuil, en réserve) et **perte réelle** (trait de scie + petites chutes). Aujourd'hui un devis à 11 % de perte et un autre à 63 % sur un profilé isolé sont montrés avec le même vocabulaire.

**Perte commerciale** (devis refusés ou sans réponse) : rien n'est suivi. Aujourd'hui on sait seulement « rejeté ». Pour progresser, il manque : motif (prix, délai, couleur/gamme, concurrent, pas de suite), montant TTC perdu, ancienneté d'un devis `sent` sans réponse (validité `validityDays` déjà existante), et lien avec la marge proposée.

## 6. Recommandations, par ordre d'impact

| Priorité | Action | Effort | Pourquoi |
| -------- | ------ | ------ | -------- |
| 1 | Chiffrer les **panneaux pleins** (prix au m² dans le marché + chute) | Faible : un prix par m² dans `Market`, une ligne dans `extrasCost` | Corrige une marge fausse sur chaque porte pleine/semi |
| 2 | Inclure les **prestations dans le coût** (coût par prestation ou marge dédiée) et **afficher la marge après remise** | Faible | Le menuisier voit sa vraie marge avant d'envoyer |
| 3 | Unifier **marge vs majoration** (un seul terme, une seule base de calcul, libellé explicite) | Faible | Supprime la confusion 30 % / 23 % |
| 4 | Corriger le **taux de conversion** (décidés = gagnés + refusés) | Très faible | Chiffre aujourd'hui trompeur sur la page d'accueil |
| 5 | **Motif de refus** structuré + liste « devis perdus » + relance des `sent` proches de l'échéance | Moyen | Seule façon de mesurer et de réduire les pertes commerciales |
| 6 | **Avertissement d'étalonnage** : tarifs/prix d'exemple non modifiés → bandeau avant émission | Faible | Évite d'envoyer un devis chiffré avec des prix fictifs |
| 7 | **Chutes réutilisables** : stock simple (longueur, profilé, couleur) consommé par `procure` avant d'acheter | Moyen/élevé | Réduit coût et chute réelle ; nécessite la saisie en atelier |
| 8 | Séparer **fournisseur, date, délai** dans les offres | Moyen | Marché comparable et prix datés |
| 9 | Débit par **série de profilés** (références réelles) | Élevé, dépend de l'atelier | Passage d'estimation à commande réelle |
| 10 | Perte de **verre** (plaque standard, minimum de facturation) | Moyen | Coût réel du vitrage |

## 7. Ce que je n'ai pas pu établir

- Les formules de débit et les accessoires n'ont pas été comparés à une série de profilés réelle ni validés par un menuisier.
- Les ordres de grandeur sur la perte de verre et les chutes réutilisables viennent de pratique générale du métier, pas de données du projet.
- Les prix par défaut sont fictifs : l'écart de marge (constat C) vient de leur incohérence entre modes, pas d'un marché observé.
- Aucun test n'a été exécuté en navigateur.

## 8. État des corrections (29 octobre 2026)

| Point | État | Où |
| ----- | ---- | -- |
| A. Panneaux pleins non chiffrés | **Corrigé** : prix au m² dans le catalogue fournisseurs, compté dans le prix de revient, le budget et la marge | `procure.ts` (`extrasCost`), `Catalog.tsx` |
| B. Chiffrage ligne par ligne | **Conservé volontairement** : prudent et stable (un prix de ligne ne bouge pas quand on modifie une autre ligne). La mutualisation se lit dans le budget | `costing.ts` |
| C. Tarifs m² et prix de revient non calibrés | **Signalé** : bandeau « Chiffrage à confirmer » (devis, tableau de bord) tant que les prix sont ceux d'exemple ; la marge estimée du devis montre l'écart en direct | `Calibration.tsx`, `calibration()` |
| D. Deux définitions de la marge | **Corrigé** : une seule base, le prix de revient (comme la marge visée et le seuil d'alerte) ; le % du prix de vente est affiché à côté | `quoteMargin()`, `Budget.tsx` |
| E. Prestations sans coût | **Corrigé** : coût interne par prestation (jamais transmis au client, testé), avertissement si absent | `serviceSchema.cost`, `clientView` |
| F. Remise hors marge | **Corrigé** : la marge du devis est calculée sur le HT après remise, affichée avant l'envoi avec alerte perte / seuil | `SummaryAside.tsx` |
| G. Taux de conversion | **Corrigé** : acceptés / (acceptés + refusés par le client) ; les demandes écartées par le menuisier sont exclues | tableau de bord |
| H. Perte commerciale | **Corrigé** : motif de refus choisi par le client, tableau « Devis perdus » par raison, liste « À relancer » (validité ≤ 7 jours ou dépassée) | `workflow.ts`, `DashboardInsights.tsx` |
| Chute réutilisable vs perte sèche | **Corrigé** : seuil 500 mm, affiché dans le besoin et le budget | `REUSE_MIN` |
| Perte de verre / panneaux | **Corrigé** : % de chute de découpe réglable (10 % par défaut, à valider avec votre vitrier) | `Market.glassWaste` |
| Fournisseur et date des prix | **Corrigé en partie** : un fournisseur de référence et une date pour tout le catalogue ; prix non datés ou de plus de 90 jours signalés. Pas encore de fournisseur par offre, délai ni transport | `Market.supplier/priceDate` |
| Stock de chutes persistant | **Non fait** : demande une saisie d'atelier et un modèle de stock | — |
| Débit par série de profilés réelle, onglets | **Non fait** : exige les références et formules d'un fournisseur ; les formules restent génériques | — |
| Dernier trait de scie | **Non fait** : léger biais prudent (quelques mm par barre) | — |

Les valeurs par défaut ajoutées (panneau 90 000 Ar/m², chute 10 %) sont des exemples à calibrer, comme les autres.
