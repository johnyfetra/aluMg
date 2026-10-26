// MVP : l'app se limite au devis du menuisier. NEXT_PUBLIC_MVP=0 réaffiche tout le reste (client, annuaire, messagerie, chantiers…).
export const MVP = process.env.NEXT_PUBLIC_MVP !== "0";
// Pages masquées en MVP (préfixes) ; le proxy les redirige vers le tableau de bord.
export const HIDDEN = ["/menuisiers", "/espace-client", "/messages", "/chantiers", "/clients", "/realisations", "/profil-public"];
