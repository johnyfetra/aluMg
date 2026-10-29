import { lineTotal } from "./calc";
import type { Quote, Service } from "./model";

// Jours restants avant la fin de validité du devis (négatif : dépassée). La validité court depuis la date de création du devis.
export const daysLeft = (q: Pick<Quote, "date" | "terms">, now = Date.now()) => Math.ceil((Date.parse(q.date) + q.terms.validityDays * 864e5 - now) / 864e5);

export const serviceTotal = (s: Pick<Service, "qty" | "price">) => Math.round(s.qty * s.price);

// gross : somme des ouvrages et des prestations ; discount : remise accordée ; ht : après remise ; ttc : avec TVA.
export const totals = (q: Pick<Quote, "lines" | "terms"> & { discount?: number; services?: Service[] }) => {
  const gross = q.lines.reduce((s, l) => s + lineTotal(l), 0) + (q.services ?? []).reduce((s, v) => s + serviceTotal(v), 0);
  const discount = Math.round((gross * (q.discount ?? 0)) / 100);
  const ht = gross - discount;
  const tva = Math.round((ht * q.terms.tva) / 100);
  return { gross, discount, ht, tva, ttc: ht + tva };
};
