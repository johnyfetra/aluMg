// Outils communs aux scripts de données de démonstration : client HTTP à cookie de session et création / reconnexion de comptes.
import { LEGACY_PASSWORD, PASSWORD } from "./demo-data.mjs";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3200";
// garde-fou : ce script crée des comptes à mot de passe connu, il ne doit viser qu'un serveur local
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE)) throw new Error(`seed:demo refuse de viser ${BASE} (serveur local uniquement)`);
export class Api {
  cookie = "";
  async call(method, path, body) {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = res.headers.getSetCookie().find((c) => c.startsWith("alumg_session="));
    if (sc) this.cookie = /Max-Age=0|1970/i.test(sc) ? "" : sc.split(";")[0];
    return { status: res.status, body: (res.headers.get("content-type") ?? "").includes("json") ? await res.json() : null };
  }
  async must(method, path, body) {
    const r = await this.call(method, path, body);
    if (r.status >= 300) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return r.body;
  }
}
// Création (ou reconnexion) d'un compte de démonstration. L'inscription exige maintenant un compte vérifié : on passe par la vraie vérification,
// l'envoi « dev » du serveur renvoyant le code (serveur de développement, idéalement lancé avec RATE_LIMIT=off).
export async function account(a, role, name, email, phone) {
  const s = await a.call("POST", "/api/auth/signup", { role, name, email, phone, password: PASSWORD });
  if (s.status === 409) {
    let l = await a.call("POST", "/api/auth/login", { identifier: email, password: PASSWORD });
    if (l.status === 401) l = await a.call("POST", "/api/auth/login", { identifier: email, password: LEGACY_PASSWORD });
    if (l.status >= 300) throw new Error(`login ${email}: ${l.status} (compte existant avec un autre mot de passe ?)`);
    return;
  }
  if (s.status >= 300) throw new Error(`signup ${email}: ${s.status} ${JSON.stringify(s.body)}`);
  const sent = await a.must("POST", "/api/auth/verify/send", { channel: "sms", lang: "fr" });
  if (!sent.devCode) throw new Error("pas de code « dev » : lancez le serveur de développement (npm run dev)");
  await a.must("POST", "/api/auth/verify/confirm", { code: sent.devCode });
}

