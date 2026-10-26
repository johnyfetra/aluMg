import { lineTotal } from "./calc";
import type { Quote, Service } from "./model";

export const serviceTotal = (s: Pick<Service, "qty" | "price">) => Math.round(s.qty * s.price);

// gross : somme des ouvrages et des prestations ; discount : remise accordée ; ht : après remise ; ttc : avec TVA.
export const totals = (q: Pick<Quote, "lines" | "terms"> & { discount?: number; services?: Service[] }) => {
  const gross = q.lines.reduce((s, l) => s + lineTotal(l), 0) + (q.services ?? []).reduce((s, v) => s + serviceTotal(v), 0);
  const discount = Math.round((gross * (q.discount ?? 0)) / 100);
  const ht = gross - discount;
  const tva = Math.round((ht * q.terms.tva) / 100);
  return { gross, discount, ht, tva, ttc: ht + tva };
};
