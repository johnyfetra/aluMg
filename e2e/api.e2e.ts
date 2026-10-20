// Test de bout en bout de l'API : nécessite `npm run dev` (base neuve conseillée : supprimez .data/).
//   npm run test:e2e        (cible http://localhost:3000, ou E2E_BASE_URL)
import { describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36); // e-mails uniques : le test peut être relancé sans vider la base
const HEX = Date.now().toString(16).slice(-6); // identifiants de devis (UUID : hexadécimal uniquement)

class Client {
  cookie = "";
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie().find((c) => c.startsWith("alumg_session="));
    if (set) this.cookie = set.startsWith("alumg_session=;") || /Max-Age=0|expires=Thu, 01 Jan 1970/i.test(set) ? "" : set.split(";")[0];
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, body: type.includes("json") ? await res.json() : null };
  }
}

const line = {
  id: "l1", category: "fenetre", opening: "coulissant", leaves: 3, shutter: "roulant", control: "manuel", range: "europeen",
  finish: "chene-dore", infill: "vitree", glassType: "feuillete", thickness: "8", pattern: "none", extras: ["moustiquaire"],
  width: 2400, height: 1200, qty: 2, unit: 1500000,
};
const quote = (n: number, over: object = {}) => ({
  id: `00000000-0000-4000-8000-${HEX}${String(n).padStart(6, "0")}`,
  number: "HACK-1", date: "2000-01-01T00:00:00.000Z", status: "draft",
  client: { name: "Rakoto", phone: "034", address: "Tana" }, project: "Villa", delay: "15 j", notes: "",
  lines: [line], terms: { tva: 20, deposit: 50, validityDays: 30 }, ...over,
});
const pw = "longpassword1";
// contact obligatoire : e-mail et téléphone ; le rôle se choisit à l'inscription
const acct = (name: string, email: string, role: "client" | "menuisier" = "menuisier", password = pw) => ({ name, email, role, phone: "034 12 345 67", password });

describe("accès", () => {
  it("API et pages protégées refusent un visiteur sans session", async () => {
    const c = new Client();
    expect((await c.call("GET", "/api/quotes")).status).toBe(401);
    expect((await c.call("GET", "/api/settings")).status).toBe(401);
    expect((await c.call("GET", "/tableau-de-bord")).status).toBeGreaterThanOrEqual(307);
    expect((await c.call("GET", "/connexion")).status).toBe(200);
  });
});

describe("comptes", () => {
  const email = `alice-${RUN}@ex.mg`;
  it("inscription : validation, doublon, connexion, mots de passe", async () => {
    const a = new Client();
    expect((await a.call("POST", "/api/auth/signup", acct("Alice", email, "menuisier", "short"))).status).toBe(400);
    expect((await a.call("POST", "/api/auth/signup", acct("Alice", "pas-un-mail"))).status).toBe(400);
    expect((await a.call("POST", "/api/auth/signup", acct("Alice", email))).status).toBe(201);
    expect((await new Client().call("POST", "/api/auth/signup", acct("X", email.toUpperCase()))).status).toBe(409);
    const me = await a.call("GET", "/api/me");
    expect(me.body).toMatchObject({ email, role: "menuisier", phone: "034 12 345 67" });
    expect((await new Client().call("POST", "/api/auth/login", { email, password: "mauvais-mdp" })).status).toBe(401);
    expect((await new Client().call("POST", "/api/auth/login", { email: `inconnu-${RUN}@ex.mg`, password: "mauvais-mdp" })).status).toBe(401);
    const a2 = new Client();
    expect((await a2.call("POST", "/api/auth/login", { email, password: pw })).status).toBe(200);

    expect((await a.call("PATCH", "/api/me", { newPassword: "nouveaumdp123", currentPassword: "faux" })).status).toBe(403);
    expect((await a.call("PATCH", "/api/me", { newPassword: "nouveaumdp123", currentPassword: pw })).status).toBe(200);
    expect((await new Client().call("POST", "/api/auth/login", { email, password: pw })).status).toBe(401);
    expect((await new Client().call("POST", "/api/auth/login", { email, password: "nouveaumdp123" })).status).toBe(200);

    await a.call("POST", "/api/auth/logout");
    expect((await a.call("GET", "/api/me")).status).toBe(401);
    expect((await a2.call("GET", "/api/me")).status).toBe(200); // l'autre session reste valide
  });
});

describe("réglages et devis", () => {
  it("validation, numérotation serveur, statuts, isolation entre comptes", async () => {
    const a = new Client();
    const b = new Client();
    await a.call("POST", "/api/auth/signup", acct("A", `a2-${RUN}@ex.mg`));
    await b.call("POST", "/api/auth/signup", acct("B", `b2-${RUN}@ex.mg`));

    const st = (await a.call("GET", "/api/settings")).body;
    expect(st).toMatchObject({ tva: 20 });
    expect(st.surcharges["range.europeen"]).toBe(35);
    for (const bad of [{ accent: "rouge" }, { logo: "http://evil/x.png" }, { tva: 500 }]) {
      expect((await a.call("PUT", "/api/settings", { ...st, ...bad })).status).toBe(400);
    }
    for (const bad of [{ barLength: 100 }, { barLength: 6000.5 }, { kerf: 99 }]) {
      expect((await a.call("PUT", "/api/settings", { ...st, ...bad })).status).toBe(400);
    }
    expect((await a.call("PUT", "/api/settings", { ...st, company: "Alu Mada", barLength: 5800, kerf: 4 })).status).toBe(200);
    expect((await a.call("GET", "/api/settings")).body.company).toBe("Alu Mada");
    expect((await b.call("GET", "/api/settings")).body.company).toBe("");

    expect((await a.call("POST", "/api/quotes", quote(1, { lines: [{ ...line, width: 100 }] }))).status).toBe(400);
    expect((await a.call("POST", "/api/quotes", quote(1, { lines: [{ ...line, glassType: "inconnu" }] }))).status).toBe(400);
    expect((await a.call("POST", "/api/quotes", quote(1, { lines: [] }))).status).toBe(400);
    expect((await a.call("POST", "/api/quotes", quote(1, { id: "pas-un-uuid" }))).status).toBe(400);

    const created = await a.call("POST", "/api/quotes", quote(1));
    expect(created.status).toBe(201);
    expect(created.body.number).toBe(`DV-${new Date().getFullYear()}-0001`);
    expect(created.body.date.slice(0, 4)).not.toBe("2000");
    expect((await a.call("POST", "/api/quotes", quote(1))).status).toBe(409);

    const id = created.body.id;
    const upd = await a.call("PUT", `/api/quotes/${id}`, { ...created.body, status: "accepted" });
    expect(upd.body).toMatchObject({ status: "accepted", number: created.body.number });
    expect((await a.call("GET", "/api/quotes")).body).toHaveLength(1);

    // nouvelles catégories : garde-corps, cloison, naco, 6 vantaux ; nombre de vantaux hors plage refusé
    const extra = [
      { ...line, id: "l2", category: "garde-corps", guard: "verre", opening: "fixe", leaves: 1, width: 3000, height: 1000 },
      { ...line, id: "l3", category: "cloison", opening: "fixe", leaves: 5, width: 4000, height: 2400 },
      { ...line, id: "l4", opening: "jalousie", leaves: 1 },
      { ...line, id: "l5", leaves: 6, width: 4800 },
    ];
    const multi = await a.call("POST", "/api/quotes", quote(2, { lines: extra }));
    expect(multi.status).toBe(201);
    expect(multi.body.lines.map((l: { category: string }) => l.category)).toEqual(["garde-corps", "cloison", "fenetre", "fenetre"]);
    expect((await a.call("POST", "/api/quotes", quote(3, { lines: [{ ...line, leaves: 9 }] }))).status).toBe(400);
    expect((await a.call("POST", "/api/quotes", quote(3, { lines: [{ ...line, category: "escalier" }] }))).status).toBe(400);
    // un devis ancien, sans le champ « guard », reste enregistrable (valeur par défaut)
    const legacy: Record<string, unknown> = { ...line };
    delete legacy.guard;
    expect((await a.call("POST", "/api/quotes", quote(4, { lines: [legacy] }))).status).toBe(201);
    expect((await a.call("GET", "/api/quotes")).body).toHaveLength(3);

    expect((await b.call("GET", "/api/quotes")).body).toEqual([]);
    for (const [m, body] of [["GET"], ["PUT", created.body], ["DELETE"]] as const) {
      expect((await b.call(m, `/api/quotes/${id}`, body)).status).toBe(404);
    }
    expect((await a.call("GET", "/api/quotes/abc")).status).toBe(404);
    expect((await a.call("GET", `/api/quotes/${id}`)).status).toBe(200);

    expect((await a.call("DELETE", `/api/quotes/${id}`)).status).toBe(200);
    expect((await a.call("GET", `/api/quotes/${id}`)).status).toBe(404);
  });
});

describe("plateforme : rôles, annuaire, demandes, suivi, évaluation", () => {
  const phoneless = { name: "Sans tel", email: `nophone-${RUN}@ex.mg`, role: "client", password: pw };

  it("l'inscription exige un contact (e-mail et téléphone) et un type de compte valide", async () => {
    expect((await new Client().call("POST", "/api/auth/signup", phoneless)).status).toBe(400);
    expect((await new Client().call("POST", "/api/auth/signup", { ...phoneless, phone: "abc" })).status).toBe(400);
    expect((await new Client().call("POST", "/api/auth/signup", { ...phoneless, phone: "034 11 222 33", role: "admin" })).status).toBe(400);
    expect((await new Client().call("POST", "/api/auth/signup", { ...phoneless, phone: "034 11 222 33" })).status).toBe(201);
  });

  it("annuaire public sans compte ; publication, requêtes réservées à chaque rôle, droits d'accès", async () => {
    const pub = new Client();
    const m = new Client();
    const m2 = new Client();
    const c = new Client();
    const c2 = new Client();
    await m.call("POST", "/api/auth/signup", acct("Atelier Rabe", `rabe-${RUN}@ex.mg`, "menuisier"));
    await m2.call("POST", "/api/auth/signup", acct("Autre Atelier", `autre-${RUN}@ex.mg`, "menuisier"));
    await c.call("POST", "/api/auth/signup", acct("Hery Rakoto", `hery-${RUN}@ex.mg`, "client"));
    await c2.call("POST", "/api/auth/signup", acct("Noro Andry", `noro-${RUN}@ex.mg`, "client"));

    // profil : publication refusée sans ville, acceptée ensuite ; visible sans connexion, sans coordonnées
    const prof = (await m.call("GET", "/api/profile")).body;
    const base = { displayName: "Atelier Rabe", city: "", bio: "Alu", specialties: ["fenetres"], logo: "", published: true };
    expect((await m.call("PUT", "/api/profile", base)).status).toBe(422);
    expect((await m.call("PUT", "/api/profile", { ...base, city: "Mahajanga", slug: prof.slug })).status).toBe(200);
    expect((await m.call("PUT", "/api/profile", { ...base, city: "Mahajanga", slug: "Pas Valide!" })).status).toBe(400);
    const list = await pub.call("GET", `/api/public/menuisiers?city=mahajanga`);
    expect(list.status).toBe(200);
    expect(list.body.map((e: { slug: string }) => e.slug)).toContain(prof.slug);
    expect(JSON.stringify(list.body)).not.toContain(`rabe-${RUN}@ex.mg`);
    expect((await pub.call("GET", `/api/public/menuisiers/${prof.slug}`)).status).toBe(200);
    expect((await pub.call("GET", "/api/public/menuisiers/inconnu-xyz")).status).toBe(404);
    const slug2 = (await m2.call("GET", "/api/profile")).body.slug; // profil non publié
    expect((await pub.call("GET", `/api/public/menuisiers/${slug2}`)).status).toBe(404);
    expect((await pub.call("GET", "/api/session")).body).toBeNull(); // visiteur : 200 et null

    // chaque rôle n'accède qu'à ses routes
    expect((await c.call("GET", "/api/quotes")).status).toBe(403);
    expect((await c.call("GET", "/api/settings")).status).toBe(403);
    expect((await c.call("GET", "/api/profile")).status).toBe(403);
    expect((await m.call("GET", "/api/client/quotes")).status).toBe(403);
    expect((await m.call("POST", "/api/requests", {})).status).toBe(403);
    expect((await pub.call("POST", "/api/requests", {})).status).toBe(401);

    // demande d'un client
    const rq = await c.call("POST", "/api/requests", { menuisier: prof.slug, project: "Villa", message: "Bonjour", siteAddress: "Tana", wantedDate: "", lines: [{ ...line, unit: 1 }] });
    expect(rq.status).toBe(201);
    expect(rq.body).toMatchObject({ status: "requested", client: { name: "Hery Rakoto", phone: "034 12 345 67" } });
    expect(rq.body.lines[0].unit).toBeGreaterThan(1); // prix du menuisier, pas celui envoyé par le client
    expect((await c.call("POST", "/api/requests", { menuisier: slug2, lines: [line] })).status).toBe(404); // profil non publié
    const id = rq.body.id;

    // visibilité : le client voit sa demande sans prix ; les autres comptes ne voient rien
    expect((await c.call("GET", `/api/client/quotes/${id}`)).body.quote.lines[0].unit).toBe(0);
    expect((await c2.call("GET", `/api/client/quotes/${id}`)).status).toBe(404);
    expect((await c2.call("GET", `/api/quotes/${id}/events`)).status).toBe(404);
    expect((await m2.call("GET", `/api/quotes/${id}`)).status).toBe(404);
    expect((await c2.call("POST", `/api/quotes/${id}/actions`, { type: "message", message: "intrus" })).status).toBe(404);

    // droits d'action : un client n'envoie pas, un menuisier n'accepte pas, un envoi vérifie les prix
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "send" })).status).toBe(409);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "accept" })).status).toBe(409);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "n'importe quoi" })).status).toBe(400);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "send", message: "Voici le devis" })).body.status).toBe("sent");
    const seen = (await c.call("GET", `/api/client/quotes/${id}`)).body.quote;
    expect(seen.status).toBe("sent");
    expect(seen.lines[0].unit).toBeGreaterThan(1);

    // verrouillé : le menuisier ne modifie ni ne supprime un devis envoyé
    const mine = (await m.call("GET", `/api/quotes/${id}`)).body;
    expect((await m.call("PUT", `/api/quotes/${id}`, { ...mine, discount: 90 })).status).toBe(409);
    expect((await m.call("DELETE", `/api/quotes/${id}`)).status).toBe(409);

    // le client accepte, le chantier avance, l'évaluation n'est possible qu'à la fin
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "accept" })).body.status).toBe("accepted");
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "review", rating: 5, comment: "" })).status).toBe(409);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "progress", progress: 150 })).status).toBe(400);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "progress", progress: 60, message: "Fabrication" })).body).toMatchObject({ status: "in_progress", progress: 60 });
    expect((await c.call("GET", `/api/client/quotes/${id}`)).body.quote.progress).toBe(60);
    expect((await m.call("POST", `/api/quotes/${id}/actions`, { type: "progress", progress: 100 })).body.status).toBe("completed");
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "review", rating: 6, comment: "" })).status).toBe(400);
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "review", rating: 4, comment: "Très bien" })).status).toBe(200);
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "review", rating: 1, comment: "" })).status).toBe(409);

    // signalement confidentiel ; avis public avec prénom seulement
    expect((await c.call("POST", `/api/quotes/${id}/actions`, { type: "report", reason: "quality", details: "x" })).status).toBe(200);
    const kinds = (await m.call("GET", `/api/quotes/${id}/events`)).body.map((e: { kind: string }) => e.kind);
    expect(kinds).not.toContain("reported");
    expect(kinds).toEqual(expect.arrayContaining(["created", "sent", "accepted", "progress", "completed", "reviewed"]));
    const profile = (await pub.call("GET", `/api/public/menuisiers/${prof.slug}`)).body;
    expect(profile).toMatchObject({ rating: 4, reviews: 1, completed: 1 });
    expect(profile.reviewList[0]).toMatchObject({ client: "Hery", comment: "Très bien" });
  });
});

describe("messagerie", () => {
  it("client ↔ menuisier : démarrage encadré, non-lus, confidentialité", async () => {
    const pub = new Client(), m = new Client(), c = new Client(), c2 = new Client(), m2 = new Client();
    await m.call("POST", "/api/auth/signup", acct("Atelier Chat", `chat-m-${RUN}@ex.mg`, "menuisier"));
    await m2.call("POST", "/api/auth/signup", acct("Tiers Chat", `chat-m2-${RUN}@ex.mg`, "menuisier"));
    await c.call("POST", "/api/auth/signup", acct("Cli Chat", `chat-c-${RUN}@ex.mg`, "client"));
    await c2.call("POST", "/api/auth/signup", acct("Cli Tiers", `chat-c2-${RUN}@ex.mg`, "client"));
    const prof = (await m.call("GET", "/api/profile")).body;
    expect((await c.call("POST", "/api/conversations", { menuisier: prof.slug })).status).toBe(404); // profil non publié
    await m.call("PUT", "/api/profile", { displayName: "Atelier Chat", slug: prof.slug, city: "Tana", bio: "", specialties: [], logo: "", published: true });

    expect((await pub.call("GET", "/api/conversations")).status).toBe(401);
    const conv = (await c.call("POST", "/api/conversations", { menuisier: prof.slug })).body.id;
    expect((await c.call("POST", "/api/conversations", { menuisier: prof.slug })).body.id).toBe(conv); // idempotent
    expect((await c.call("POST", `/api/conversations/${conv}/messages`, { body: "   " })).status).toBe(400);
    expect((await c.call("POST", `/api/conversations/${conv}/messages`, { body: "Bonjour" })).status).toBe(201);

    expect((await m.call("GET", "/api/messages/unread")).body.count).toBe(1);
    expect((await m.call("GET", "/api/conversations")).body[0]).toMatchObject({ unread: 1, other: { name: "Cli Chat" } });
    expect((await m.call("GET", `/api/conversations/${conv}/messages`)).body[0]).toMatchObject({ body: "Bonjour", mine: false });
    expect((await m.call("GET", "/api/messages/unread")).body.count).toBe(0);

    // un tiers ne lit ni n'écrit ; un menuisier ne démarre pas avec un client qui ne lui a rien demandé
    expect((await c2.call("GET", `/api/conversations/${conv}/messages`)).status).toBe(404);
    expect((await m2.call("POST", `/api/conversations/${conv}/messages`, { body: "x" })).status).toBe(404);
    const me = (await c.call("GET", "/api/session")).body;
    expect((await m.call("POST", "/api/conversations", { client: me.id })).status).toBe(403); // pas de devis demandé : pas de démarchage
    expect((await m2.call("POST", "/api/conversations", { client: me.id })).status).toBe(403);
  });
});
