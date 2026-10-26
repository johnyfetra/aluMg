// Montant en lettres (français) : « Arrêté le présent devis à la somme de … ariary », mention courante sur les devis et factures.
const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const T = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

// 0 à 99 ; `last` : dernier mot du nombre (« quatre-vingts » prend son s seulement s'il termine le nombre)
function below100(n: number, last: boolean): string {
  if (n < 20) return U[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) return `${d === 7 ? "soixante" : "quatre-vingt"}${d === 7 && u === 1 ? " et " : "-"}${U[10 + u]}`;
  if (d === 8) return u === 0 ? `quatre-vingt${last ? "s" : ""}` : `quatre-vingt-${U[u]}`;
  return u === 0 ? T[d] : `${T[d]}${u === 1 ? " et " : "-"}${U[u]}`;
}

function below1000(n: number, last: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h === 0) return below100(r, last);
  const head = h === 1 ? "cent" : `${U[h]} cent${r === 0 && last ? "s" : ""}`;
  return r === 0 ? head : `${head} ${below100(r, last)}`;
}

export function amountInWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return U[0];
  if (n >= 1e12) return String(n); // hors de portée : on laisse les chiffres
  const parts: string[] = [];
  const groups: [number, string, string][] = [[1e9, "milliard", "milliards"], [1e6, "million", "millions"]];
  for (const [size, one, many] of groups) {
    const q = Math.floor(n / size);
    n %= size;
    if (q) parts.push(`${below1000(q, false)} ${q === 1 ? one : many}`);
  }
  const k = Math.floor(n / 1000);
  n %= 1000;
  if (k) parts.push(k === 1 ? "mille" : `${below1000(k, false)} mille`);
  if (n) parts.push(below1000(n, true));
  return parts.join(" ");
}
