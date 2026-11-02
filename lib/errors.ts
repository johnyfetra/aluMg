import { ApiError } from "./client";

type Say = (key: "common.error" | "err.network" | "err.session" | "err.forbidden" | "err.notFound" | "err.rate" | "err.server") => string;

// Message adapté à la cause : coupure réseau, session expirée, accès refusé, introuvable, trop de tentatives, panne serveur.
// Les messages propres à un formulaire (mot de passe erroné, devis modifié…) restent traités à l'endroit où ils se produisent.
export function errorText(e: unknown, t: Say): string {
  if (!(e instanceof ApiError)) return t("common.error");
  if (e.status === 0) return t("err.network");
  if (e.status === 401) return t("err.session");
  if (e.status === 403) return t("err.forbidden");
  if (e.status === 404) return t("err.notFound");
  if (e.status === 429) return t("err.rate");
  if (e.status >= 500) return t("err.server");
  return t("common.error");
}
