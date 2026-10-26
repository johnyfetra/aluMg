// MVP : l'app se limite au devis (menuisier ↔ client : décision, commentaires par ouvrage, messagerie, notifications).
// NEXT_PUBLIC_MVP=0 réaffiche aussi l'annuaire, les profils publics, les réalisations, les chantiers et les clients.
export const MVP = process.env.NEXT_PUBLIC_MVP !== "0";
// Pages masquées en MVP (préfixes) ; le proxy les redirige vers le tableau de bord.
export const HIDDEN = ["/menuisiers", "/chantiers", "/clients", "/realisations", "/profil-public"];
// Dans le menu du client (les mêmes pages, côté client)
export const HIDDEN_CLIENT = ["/menuisiers"];
