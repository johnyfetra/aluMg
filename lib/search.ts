// Suggestions de la recherche de la barre du haut (components/PageSearch.tsx).
export type SearchItem = { id: string; title: string; sub?: string; href?: string; doc?: boolean }; // doc : un devis (icône), sinon une personne (initiale)

// Comparaison insensible aux accents et à la casse
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Les éléments dont le titre ou la ligne secondaire contient le texte : titre qui commence par lui d'abord, puis titre qui le contient
export function matchItems(items: SearchItem[], q: string, max = 6) {
  const n = fold(q.trim());
  if (!n) return [];
  return items
    .map((i) => ({ i, t: fold(i.title), s: fold(i.sub ?? "") }))
    .filter((x) => x.t.includes(n) || x.s.includes(n))
    .sort((a, b) => Number(b.t.startsWith(n)) - Number(a.t.startsWith(n)) || Number(b.t.includes(n)) - Number(a.t.includes(n)))
    .slice(0, max)
    .map((x) => x.i);
}
