// Les images d'un profil (logo, couverture, photo) sont stockées en data URL : les inclure dans chaque liste (annuaire, devis, conversations) pèse des centaines de Ko.
// Les listes donnent donc une adresse d'image mise en cache par le navigateur ; `v` (longueur) change quand l'image change.
export type ProfileImage = "logo" | "cover" | "owner";
export const imageSrc = (slug: string, kind: ProfileImage, data: string) =>
  data.startsWith("data:") && slug ? `/api/public/menuisiers/${encodeURIComponent(slug)}/img?k=${kind}&v=${data.length}` : data;
