// MVP : l'app se limite au devis (menuisier ↔ client : décision, commentaires par ouvrage, messagerie, notifications).
// NEXT_PUBLIC_MVP=0 réaffiche aussi l'annuaire, les profils publics, les réalisations, et les chantiers (le carnet de clients reste actif).
export const MVP = process.env.NEXT_PUBLIC_MVP !== "0";
// Pages masquées en MVP (préfixes) ; le proxy les redirige vers le tableau de bord.
export const HIDDEN = ["/menuisiers", "/chantiers", "/realisations", "/profil-public"];
// Dans le menu du client (les mêmes pages, côté client)
export const HIDDEN_CLIENT = ["/menuisiers"];
