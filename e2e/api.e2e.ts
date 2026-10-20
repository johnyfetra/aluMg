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
    expect((await a.call("POST", "/api/auth/signup", { name: "Alice", email, password: "short" })).status).toBe(400);
    expect((await a.call("POST", "/api/auth/signup", { name: "Alice", email: "pas-un-mail", password: pw })).status).toBe(400);
    expect((await a.call("POST", "/api/auth/signup", { name: "Alice", email, password: pw })).status).toBe(201);
    expect((await new Client().call("POST", "/api/auth/signup", { name: "X", email: email.toUpperCase(), password: pw })).status).toBe(409);
    const me = await a.call("GET", "/api/me");
    expect(me.body).toMatchObject({ email, role: "user" });
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
    await a.call("POST", "/api/auth/signup", { name: "A", email: `a2-${RUN}@ex.mg`, password: pw });
    await b.call("POST", "/api/auth/signup", { name: "B", email: `b2-${RUN}@ex.mg`, password: pw });

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
