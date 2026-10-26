import { beforeAll, describe, expect, it } from "vitest";
import { type Line, type Quote, lineSchema, quoteSchema } from "./model";
import type { Action } from "./workflow";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const wf = await import("./workflow");
const pf = await import("./profiles");
const notif = await import("./notifications");

const line: Line = lineSchema.parse({
  id: "x", category: "fenetre", opening: "coulissant", leaves: 2, shutter: "roulant", control: "manuel", guard: "barreaudage", range: "asiatique",
  finish: "blanc", infill: "vitree", glassType: "clair", thickness: "5", pattern: "none", extras: [], width: 1200, height: 1000, qty: 1, unit: 0,
});
const A = (a: Action) => a;
// updateQuote renvoie aussi « locked » / null : ce raccourci échoue explicitement si la mise à jour n'a pas eu lieu
const upd = async (userId: string, id: string, q: Quote) => {
  const r = await repo.updateQuote(userId, id, q);
  if (r === null || r === "locked") throw new Error(`updateQuote: ${r}`);
  return r;
};

let m1: string, m2: string, c1: string, c2: string; // menuisiers 1 et 2, clients 1 et 2
let slug1: string;

beforeAll(async () => {
  m1 = (await repo.createUser("m1@ex.mg", "Rabe Alu", "h", "menuisier", "034 11 111 11"))!;
  m2 = (await repo.createUser("m2@ex.mg", "Autre Menuisier", "h", "menuisier", "034 22 222 22"))!;
  c1 = (await repo.createUser("c1@ex.mg", "Hery Rakoto", "h", "client", "033 33 333 33"))!;
  c2 = (await repo.createUser("c2@ex.mg", "Noro Andry", "h", "client", "033 44 444 44"))!;
  // m1 a un profil publié ; m2 un profil non publié
  const p1 = await pf.getOwnProfile(m1, "Rabe Alu");
  slug1 = p1.slug;
  await pf.saveOwnProfile(m1, "Rabe Alu", { displayName: "Rabe Alu", city: "Antananarivo", bio: "Menuiserie alu", specialties: ["fenetres", "volets"], logo: "", published: true });
  await pf.getOwnProfile(m2, "Autre Menuisier");
});

describe("transition (machine d'états)", () => {
  const t = wf.transition;
  it("menuisier : envoyer depuis demande, brouillon ou négociation seulement", () => {
    for (const s of ["requested", "draft", "negotiation"] as const) expect(t(s, A({ type: "send" }), "menuisier")).toBe("sent");
    for (const s of ["sent", "accepted", "in_progress", "completed", "rejected"] as const) expect(t(s, A({ type: "send" }), "menuisier")).toBeNull();
  });
  it("client : accepter seulement un devis envoyé", () => {
    expect(t("sent", A({ type: "accept" }), "client")).toBe("accepted");
    for (const s of ["requested", "draft", "negotiation", "accepted", "completed", "rejected"] as const) expect(t(s, A({ type: "accept" }), "client")).toBeNull();
  });
  it("client : modification seulement depuis « envoyé », refus depuis envoyé ou négociation", () => {
    expect(t("sent", A({ type: "request_change", message: "m" }), "client")).toBe("negotiation");
    expect(t("negotiation", A({ type: "request_change", message: "m" }), "client")).toBeNull();
    expect(t("negotiation", A({ type: "reject" }), "client")).toBe("rejected");
    expect(t("accepted", A({ type: "reject" }), "client")).toBeNull();
  });
  it("avancement : 0 → accepté, 1 à 99 → en cours, 100 → terminé ; seulement après acceptation", () => {
    expect(t("accepted", A({ type: "progress", progress: 40 }), "menuisier")).toBe("in_progress");
    expect(t("in_progress", A({ type: "progress", progress: 100 }), "menuisier")).toBe("completed");
    expect(t("completed", A({ type: "progress", progress: 80 }), "menuisier")).toBe("in_progress");
    expect(t("in_progress", A({ type: "progress", progress: 0 }), "menuisier")).toBe("accepted");
    expect(t("sent", A({ type: "progress", progress: 10 }), "menuisier")).toBeNull();
  });
  it("évaluation : client, devis terminé seulement ; signalement : client seulement", () => {
    expect(t("completed", A({ type: "review", rating: 5, comment: "" }), "client")).toBe("completed");
    expect(t("in_progress", A({ type: "review", rating: 5, comment: "" }), "client")).toBeNull();
    expect(t("completed", A({ type: "review", rating: 5, comment: "" }), "menuisier")).toBeNull();
    expect(t("sent", A({ type: "report", reason: "fraud", details: "" }), "menuisier")).toBeNull();
    expect(t("sent", A({ type: "report", reason: "fraud", details: "" }), "client")).toBe("sent");
  });
});

describe("parcours complet demande → devis → chantier → évaluation", () => {
  let q: Quote;
  const req = { menuisier: "", project: "Villa", message: "Je voudrais 2 fenêtres", siteAddress: "Ivandry", wantedDate: "2026-12-01", lines: [{ ...line, width: 1500, height: 1200 }] };

  it("un profil non publié ne reçoit pas de demande", async () => {
    const p2 = await pf.getOwnProfile(m2, "x");
    expect(await wf.createRequest(c1, { ...req, menuisier: p2.slug })).toBe("no_menuisier");
    expect(await wf.createRequest(c1, { ...req, menuisier: "inconnu" })).toBe("no_menuisier");
  });

  it("la demande crée un devis « requested » avec les prix du menuisier, cachés au client", async () => {
    const r = await wf.createRequest(c1, { ...req, menuisier: slug1 });
    expect(typeof r).toBe("object");
    q = r as Quote;
    expect(q).toMatchObject({ status: "requested", clientId: c1, progress: 0, client: { name: "Hery Rakoto", phone: "033 33 333 33", address: "Ivandry" } });
    expect(q.number).toMatch(/^DV-\d{4}-0001$/);
    expect(q.lines[0].unit).toBeGreaterThan(0); // prérempli pour le menuisier
    const cq = (await wf.getClientQuote(c1, q.id))!;
    expect(cq.quote.lines[0].unit).toBe(0); // invisible pour le client
    expect(cq.menuisier).toMatchObject({ name: "Rabe Alu", slug: slug1, phone: "034 11 111 11" });
    expect((await wf.listEvents(q.id)).map((e) => e.kind)).toEqual(["created"]);
  });

  it("le menuisier voit la demande ; le menuisier 2 et le client 2 ne voient rien", async () => {
    expect((await repo.listQuotes(m1)).map((x) => x.id)).toContain(q.id);
    expect(await repo.getQuote(m2, q.id)).toBeNull();
    expect(await wf.sideOf(m2, q.id)).toBeNull();
    expect(await wf.sideOf(c2, q.id)).toBeNull();
    expect(await wf.getClientQuote(c2, q.id)).toBeNull();
    expect((await wf.applyAction(c2, q.id, A({ type: "accept" }))).ok).toBe(false);
  });

  it("modifier la demande (menuisier) la passe en préparation sans toucher client, demande ni numéro", async () => {
    const saved = await upd(m1, q.id, quoteSchema.parse({ ...q, status: "accepted", clientId: c2, progress: 90, request: null, number: "HACK", lines: q.lines }));
    expect(saved).toMatchObject({ status: "draft", clientId: c1, progress: 0, number: q.number });
    expect(saved.request?.message).toBe("Je voudrais 2 fenêtres");
    q = saved;
  });

  it("envoi : refusé si un prix est à 0, accepté sinon ; le client voit alors les prix", async () => {
    const zero = quoteSchema.parse({ ...q, lines: q.lines.map((l) => ({ ...l, unit: 0 })) });
    await upd(m1, q.id, zero);
    expect(await wf.applyAction(m1, q.id, A({ type: "send" }))).toEqual({ ok: false, error: "incomplete" });
    await upd(m1, q.id, quoteSchema.parse({ ...q, discount: 0 }));
    const r = await wf.applyAction(m1, q.id, A({ type: "send", message: "Voici mon devis" }));
    expect(r.ok && r.quote.status).toBe("sent");
    expect((await wf.getClientQuote(c1, q.id))!.quote.lines[0].unit).toBeGreaterThan(0);
  });

  it("envoyé mais pas encore tranché : le menuisier peut corriger (révision), puis revenir en arrière", async () => {
    expect(await repo.updateQuote(m1, q.id, quoteSchema.parse({ ...q, discount: 50 }))).toMatchObject({ discount: 50, rev: 1, status: "sent" });
    expect(await repo.updateQuote(m1, q.id, quoteSchema.parse({ ...q, discount: 0 }))).toMatchObject({ discount: 0, rev: 2 });
  });

  it("les rôles sont respectés : le client ne peut pas envoyer, le menuisier ne peut pas accepter", async () => {
    expect(await wf.applyAction(c1, q.id, A({ type: "send" }))).toEqual({ ok: false, error: "invalid_transition" });
    expect(await wf.applyAction(m1, q.id, A({ type: "accept" }))).toEqual({ ok: false, error: "invalid_transition" });
    expect(await wf.applyAction(m1, q.id, A({ type: "progress", progress: 10 }))).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("négociation : demande de remise puis nouvel envoi avec remise", async () => {
    const r = await wf.applyAction(c1, q.id, A({ type: "request_change", message: "Une remise possible ?", discountPercent: 10 }));
    expect(r.ok && r.quote.status).toBe("negotiation");
    // le PUT du menuisier ne change pas le statut d'un devis lié à un client…
    const revised = await upd(m1, q.id, quoteSchema.parse({ ...q, discount: 10, status: "accepted" }));
    expect(revised.status).toBe("negotiation");
    expect(revised.discount).toBe(10);
    const sent = await wf.applyAction(m1, q.id, A({ type: "send", message: "Remise de 10 % accordée" }));
    expect(sent.ok && sent.quote.status).toBe("sent");
    const ev = await wf.listEvents(q.id);
    expect(ev.map((e) => e.kind)).toEqual(["created", "sent", "revised", "revised", "change_requested", "sent"]);
    expect(ev[4]).toMatchObject({ side: "client", message: "Une remise possible ?", data: { discountPercent: 10 } });
  });

  it("acceptation puis chantier : l'avancement fait évoluer le statut", async () => {
    expect((await wf.applyAction(c1, q.id, A({ type: "accept" }))).ok).toBe(true);
    expect(await repo.deleteQuote(m1, q.id)).toBe("locked"); // un chantier accepté ne se supprime plus
    const p40 = await wf.applyAction(m1, q.id, A({ type: "progress", progress: 40, message: "Fabrication lancée" }));
    expect(p40.ok && [p40.quote.status, p40.quote.progress]).toEqual(["in_progress", 40]);
    const done = await wf.applyAction(m1, q.id, A({ type: "progress", progress: 100 }));
    expect(done.ok && done.quote.status).toBe("completed");
    const cq = (await wf.getClientQuote(c1, q.id))!;
    expect([cq.quote.status, cq.quote.progress]).toEqual(["completed", 100]);
    expect((await wf.listEvents(q.id)).map((e) => e.kind)).toContain("completed");
  });

  it("évaluation : une seule fois, par le client, et visible dans l'annuaire avec le prénom seulement", async () => {
    expect(await wf.applyAction(m1, q.id, A({ type: "review", rating: 5, comment: "" }))).toEqual({ ok: false, error: "invalid_transition" });
    expect((await wf.applyAction(c1, q.id, A({ type: "review", rating: 4, comment: "Très bien posé" }))).ok).toBe(true);
    expect(await wf.applyAction(c1, q.id, A({ type: "review", rating: 1, comment: "" }))).toEqual({ ok: false, error: "already_reviewed" });
    expect((await wf.getClientQuote(c1, q.id))!.reviewed).toBe(true);
    const pub = (await pf.getPublicMenuisier(slug1))!;
    expect(pub).toMatchObject({ rating: 4, reviews: 1, completed: 1 });
    expect(pub.reviewList[0]).toMatchObject({ rating: 4, comment: "Très bien posé", client: "Hery" });
    expect(pub.distribution).toEqual([0, 0, 0, 1, 0]);
  });

  it("signalement : enregistré mais confidentiel (absent de l'historique)", async () => {
    const before = (await wf.listEvents(q.id)).length;
    expect((await wf.applyAction(c1, q.id, A({ type: "report", reason: "quality", details: "Finition" }))).ok).toBe(true);
    expect((await wf.listEvents(q.id)).length).toBe(before);
    expect(await wf.applyAction(m1, q.id, A({ type: "report", reason: "fraud", details: "" }))).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("un devis sans compte client envoyé est figé ; seul son statut peut encore changer", async () => {
    const w = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "Walk-in", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [{ ...line, unit: 1000 }], terms: { tva: 20, deposit: 50, validityDays: 30 } }));
    expect(await repo.updateQuote(m1, w.id, { ...w, notes: "ok en brouillon" })).toMatchObject({ notes: "ok en brouillon" });
    const sent = await upd(m1, w.id, { ...w, notes: "ok en brouillon", status: "sent" }); // le statut change (menu de la liste)
    expect(sent.status).toBe("sent");
    expect(await repo.updateQuote(m1, w.id, { ...sent, notes: "modifié après envoi" })).toBe("locked");
    expect(await repo.updateQuote(m1, w.id, { ...sent, lines: [{ ...sent.lines[0], unit: 1 }] })).toBe("locked");
    expect(await repo.updateQuote(m1, w.id, { ...sent, status: "accepted" })).toMatchObject({ status: "accepted" });
  });

  it("un devis saisi pour un client sans compte ne s'envoie pas par l'action « send »", async () => {
    const walk = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "requested", client: { name: "Sans compte", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [{ ...line, unit: 1000 }], terms: { tva: 20, deposit: 50, validityDays: 30 } }));
    expect(walk.status).toBe("draft"); // « requested » est réservé aux demandes de clients
    expect(await wf.applyAction(m1, walk.id, A({ type: "send" }))).toEqual({ ok: false, error: "no_client_account" });
    expect(await repo.deleteQuote(m1, walk.id)).toBe(true);
  });
});

describe("annuaire public et profils", () => {
  it("n'affiche que les profils publiés, sans coordonnées", async () => {
    const list = await pf.listPublicMenuisiers();
    expect(list.map((e) => e.name)).toEqual(["Rabe Alu"]);
    expect(JSON.stringify(list)).not.toMatch(/034 11|m1@ex\.mg/);
  });
  it("un profil ne peut pas être publié sans ville", async () => {
    expect(await pf.saveOwnProfile(m2, "x", { displayName: "Autre", city: "", bio: "", specialties: [], logo: "", published: true })).toBe("incomplete");
  });
  it("filtres : ville (sans accent), spécialité, recherche, note minimale", async () => {
    await pf.saveOwnProfile(m2, "x", { displayName: "Fenêtres du Sud", city: "Toliara", bio: "Spécialiste vitrerie", specialties: ["vitrerie"], logo: "", published: true });
    expect((await pf.listPublicMenuisiers({ city: "antananarivo" })).map((e) => e.name)).toEqual(["Rabe Alu"]);
    expect((await pf.listPublicMenuisiers({ city: "TOLIARA" })).map((e) => e.name)).toEqual(["Fenêtres du Sud"]);
    expect((await pf.listPublicMenuisiers({ specialty: "volets" })).map((e) => e.name)).toEqual(["Rabe Alu"]);
    expect((await pf.listPublicMenuisiers({ q: "fenetres du sud" })).map((e) => e.name)).toEqual(["Fenêtres du Sud"]);
    expect((await pf.listPublicMenuisiers({ minRating: 4 })).map((e) => e.name)).toEqual(["Rabe Alu"]);
  });
  it("tri : le mieux noté d'abord, les sans avis ensuite", async () => {
    expect((await pf.listPublicMenuisiers({ sort: "rating" })).map((e) => e.name)).toEqual(["Rabe Alu", "Fenêtres du Sud"]);
    expect((await pf.listPublicMenuisiers({ sort: "name" })).map((e) => e.name)).toEqual(["Fenêtres du Sud", "Rabe Alu"]);
  });
  it("slug unique : deux menuisiers de même nom obtiennent des adresses différentes", async () => {
    const a = (await repo.createUser("m3@ex.mg", "Alu Test", "h", "menuisier", "034 55 555 55"))!;
    const b = (await repo.createUser("m4@ex.mg", "Alu Test", "h", "menuisier", "034 66 666 66"))!;
    const pa = await pf.getOwnProfile(a, "Alu Test");
    const pb = await pf.getOwnProfile(b, "Alu Test");
    expect(pa.slug).toBe("alu-test");
    expect(pb.slug).toBe("alu-test-2");
  });
  it("portfolio : isolé par compte", async () => {
    const img = "data:image/jpeg;base64,AAAA";
    const item = await pf.createPortfolioItem(m1, { title: "Baie vitrée", description: "", category: "fenetres", year: 2025, images: [img], thumb: img });
    expect((await pf.listPortfolio(m1)).map((i) => i.id)).toEqual([item.id]);
    expect(await pf.listPortfolio(m2)).toEqual([]);
    expect(await pf.updatePortfolioItem(m2, item.id, { title: "x", description: "", category: "", year: null, images: [img], thumb: img })).toBeNull();
    expect(await pf.deletePortfolioItem(m2, item.id)).toBe(false);
    expect((await pf.getPublicMenuisier(slug1))!.items).toHaveLength(1);
    expect((await pf.listPublicMenuisiers()).find((e) => e.name === "Rabe Alu")!.cover).toBe(img);
    expect(await pf.deletePortfolioItem(m1, item.id)).toBe(true);
  });
});

describe("prix cachés au client avant l'envoi", () => {
  it("clientView met à zéro lignes, remise et prestations d'un brouillon", () => {
    const q = quoteSchema.parse({ id: crypto.randomUUID(), number: "n", date: "", status: "draft", client: { name: "", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [{ ...line, unit: 5000 }], services: [{ id: "s", kind: "pose", label: "Pose", qty: 1, price: 9000 }], discount: 10, terms: { tva: 0, deposit: 0, validityDays: 30 } });
    const v = wf.clientView(q);
    expect([v.lines[0].unit, v.services![0].price, v.discount]).toEqual([0, 0, 0]);
    expect(wf.clientView({ ...q, status: "sent" }).services![0].price).toBe(9000);
  });
});

describe("devis envoyé : révisions, commentaires d'ouvrage et notifications", () => {
  let q: Quote;
  it("envoi à un client retrouvé par e-mail ; sans compte correspondant, refus", async () => {
    const base = quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "Hery", phone: "", address: "", email: "C1@ex.mg" }, project: "Villa", delay: "", notes: "", lines: [{ ...line, unit: 100000 }], terms: { tva: 20, deposit: 30, validityDays: 30 } });
    q = await repo.createQuote(m1, base);
    expect(q.clientId).toBeNull();
    const unknown = await repo.createQuote(m1, { ...base, id: crypto.randomUUID(), client: { ...base.client, email: "inconnu@ex.mg" } });
    expect(await wf.applyAction(m1, unknown.id, A({ type: "send" }))).toEqual({ ok: false, error: "no_client_account" });
    const r = await wf.applyAction(m1, q.id, A({ type: "send" }));
    expect(r).toMatchObject({ ok: true, quote: { status: "sent", clientId: c1 } });
    expect((await notif.listNotifications(c1)).items.some((n) => n.kind === "send" && n.quoteId === q.id)).toBe(true);
  });
  it("le menuisier peut corriger tant que le client n'a pas répondu : révision +1, client prévenu", async () => {
    const cur = (await repo.getQuote(m1, q.id))!;
    const saved = await upd(m1, q.id, { ...cur, notes: "Livraison incluse" });
    expect(saved.rev).toBe(1);
    expect((await upd(m1, q.id, saved)).rev).toBe(1); // rien de changé : pas de nouvelle révision
    expect((await notif.listNotifications(c1)).items.some((n) => n.kind === "revised")).toBe(true);
  });
  it("décision du client sur une révision périmée refusée ; sur la bonne révision acceptée", async () => {
    expect(await wf.applyAction(c1, q.id, A({ type: "accept", rev: 0 }))).toEqual({ ok: false, error: "quote_changed" });
    expect((await wf.applyAction(c1, q.id, A({ type: "accept", rev: 1 }))).ok).toBe(true);
  });
  it("après la réponse du client, le devis est figé", async () => {
    const cur = (await repo.getQuote(m1, q.id))!;
    expect(await repo.updateQuote(m1, q.id, { ...cur, notes: "trop tard" })).toBe("locked");
  });
  it("commentaires d'ouvrage : chaque partie écrit, l'autre est notifiée avec l'ouvrage visé ; un tiers ne voit rien", async () => {
    const lineId = line.id;
    expect(await wf.addLineComment(c1, q.id, { lineId, body: "Vitrage dépoli possible ?" })).toMatchObject({ side: "client" });
    expect(await wf.addLineComment(m1, q.id, { lineId, body: "Oui, +5 %" })).toMatchObject({ side: "menuisier" });
    expect(await wf.addLineComment(c1, q.id, { lineId: "inexistant", body: "x" })).toBe("not_found");
    expect(await wf.addLineComment(c2, q.id, { lineId, body: "intrus" })).toBe("not_found");
    expect(await wf.listLineComments(c2, q.id)).toBeNull();
    expect((await wf.listLineComments(m1, q.id))!.map((c) => c.body)).toEqual(["Vitrage dépoli possible ?", "Oui, +5 %"]);
    expect((await wf.listEvents(q.id)).some((e) => e.kind === "line_comment")).toBe(false);
    const n = (await notif.listNotifications(m1)).items.find((x) => x.kind === "line_comment");
    expect(n).toMatchObject({ quoteId: q.id, lineId, read: false });
    await notif.markNotificationsRead(m1, n!.id);
    expect((await notif.listNotifications(m1)).items.find((x) => x.id === n!.id)!.read).toBe(true);
    expect((await notif.listNotifications(c2)).items).toEqual([]);
  });
  it("le client ne peut pas commenter un devis pas encore envoyé", async () => {
    const d = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "requested", client: { name: "", phone: "", address: "", email: "" }, project: "", delay: "", notes: "", lines: [line], terms: { tva: 0, deposit: 0, validityDays: 30 } }), { clientId: c1 });
    expect(await wf.addLineComment(c1, d.id, { lineId: line.id, body: "?" })).toBe("not_allowed");
  });
});
