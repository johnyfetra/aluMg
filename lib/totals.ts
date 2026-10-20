import { lineTotal } from "./calc";
import type { Quote } from "./model";

export const totals = (q: Pick<Quote, "lines" | "terms">) => {
  const ht = q.lines.reduce((s, l) => s + lineTotal(l), 0);
  const tva = Math.round((ht * q.terms.tva) / 100);
  return { ht, tva, ttc: ht + tva };
};
