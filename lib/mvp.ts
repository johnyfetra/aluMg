// Le mode MVP ne masque que le suivi de chantier avancé.
// La vitrine, l’annuaire et la publication des réalisations restent disponibles.
export const MVP = process.env.NEXT_PUBLIC_MVP !== "0";
export const HIDDEN = ["/chantiers"];
export const HIDDEN_CLIENT: string[] = [];
