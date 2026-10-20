import { lineTotal } from "./calc";
import type { Quote } from "./model";

// gross : somme des lignes ; discount : remise accordée ; ht : après remise ; ttc : avec TVA.
export const totals = (q: Pick<Quote, "lines" | "terms"> & { discount?: number }) => {
  const gross = q.lines.reduce((s, l) => s + lineTotal(l), 0);
  const discount = Math.round((gross * (q.discount ?? 0)) / 100);
  const ht = gross - discount;
  const tva = Math.round((ht * q.terms.tva) / 100);
  return { gross, discount, ht, tva, ttc: ht + tva };
};
