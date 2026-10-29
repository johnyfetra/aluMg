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
// révision actuelle du devis (le client y rattache sa décision)
const revOf = async (ownerId: string, id: string) => (await repo.getQuote(ownerId, id))!.rev ?? 0;
// updateQuote renvoie aussi « locked » / null : ce raccourci échoue explicitement si la mise à jour n'a pas eu lieu
const upd = async (userId: string, id: string, q: Quote) => {
  const r = await repo.updateQuote(userId, id, q);
  if (r === null || r === "locked" || r === "incomplete") throw new Error(`updateQuote: ${r}`);
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
  it("menuisier : envoyer depuis demande, brouillon, négociation ou devis refusé (renvoi) seulement", () => {
    for (const s of ["requested", "draft", "negotiation", "rejected"] as const) expect(t(s, A({ type: "send" }), "menuisier")).toBe("sent");
    for (const s of ["sent", "accepted", "in_progress", "completed"] as const) expect(t(s, A({ type: "send" }), "menuisier")).toBeNull();
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
    expect(wf.actionSchema.safeParse({ type: "reject", reason: "price" }).success).toBe(true);
    expect(wf.actionSchema.safeParse({ type: "reject", reason: "pas-un-motif" }).success).toBe(false);
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

  it("le lien de demande d'un menuisier (profil non publié) vaut invitation ; un lien inconnu est refusé", async () => {
    const p2 = await pf.getOwnProfile(m2, "x");
    expect(typeof (await wf.createRequest(c1, { ...req, menuisier: p2.slug }))).toBe("object");
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
    const r = await wf.applyAction(c1, q.id, A({ type: "request_change", message: "Une remise possible ?", discountPercent: 10, rev: await revOf(m1, q.id) }));
    expect(r.ok && r.quote.status).toBe("negotiation");
    // le PUT du menuisier ne change pas le statut d'un devis lié à un client…
    const revised = await upd(m1, q.id, quoteSchema.parse({ ...q, discount: 10, status: "accepted" }));
    expect(revised.status).toBe("negotiation");
    expect(revised.discount).toBe(10);
    const sent = await wf.applyAction(m1, q.id, A({ type: "send", message: "Remise de 10 % accordée" }));
    expect(sent.ok && sent.quote.status).toBe("sent");
    const ev = await wf.listEvents(q.id);
    expect(ev.map((e) => e.kind)).toEqual(["created", "sent", "revised", "revised", "change_requested", "revised", "sent"]);
    expect(ev[4]).toMatchObject({ side: "client", message: "Une remise possible ?", data: { discountPercent: 10 } });
    expect((await repo.getQuote(m1, q.id))!.changeTopic).toBeUndefined(); // sans objet précisé
  });

  it("acceptation puis chantier : l'avancement fait évoluer le statut", async () => {
    expect((await wf.applyAction(c1, q.id, A({ type: "accept", rev: await revOf(m1, q.id) }))).ok).toBe(true);
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
    // personne à prévenir : il reste modifiable (le menuisier corrige une coquille), sans révision ni notification
    expect(await repo.updateQuote(m1, w.id, { ...sent, notes: "modifié après envoi" })).toMatchObject({ notes: "modifié après envoi", rev: 0, status: "sent" });
    expect(await repo.updateQuote(m1, w.id, { ...sent, status: "accepted" })).toMatchObject({ status: "accepted" });
    const accepted = (await repo.getQuote(m1, w.id))!;
    expect(await repo.updateQuote(m1, w.id, { ...accepted, status: "completed" })).toMatchObject({ status: "completed" });
    expect(await repo.updateQuote(m1, w.id, { ...accepted, status: "completed", notes: "trop tard" })).toBe("locked"); // un chantier terminé est figé
  });

  it("un devis saisi pour un client sans compte ne s'envoie pas par l'action « send »", async () => {
    const walk = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "requested", client: { name: "Sans compte", phone: "", address: "" }, project: "", delay: "", notes: "", lines: [{ ...line, unit: 1000 }], terms: { tva: 20, deposit: 50, validityDays: 30 } }));
    expect(walk.status).toBe("draft"); // « requested » est réservé aux demandes de clients
    expect(await wf.applyAction(m1, walk.id, A({ type: "send" }))).toEqual({ ok: false, error: "no_client_account" });
    expect(await repo.deleteQuote(m1, walk.id)).toBe(true);
  });

  it("le coût interne des prestations ne sort jamais vers le client ; le motif de refus est conservé", async () => {
    const r = (await wf.createRequest(c1, { ...req, menuisier: slug1 })) as Quote;
    const priced = quoteSchema.parse({ ...r, services: [{ id: "s1", kind: "pose", label: "Pose", qty: 1, price: 150000, cost: 90000 }] });
    expect((await upd(m1, r.id, priced)).services?.[0].cost).toBe(90000); // le menuisier le garde
    expect(JSON.stringify((await wf.getClientQuote(c1, r.id))!.quote)).not.toContain("90000");
    const sent = await wf.applyAction(m1, r.id, A({ type: "send" }));
    expect(sent.ok && sent.quote.services?.[0].cost).toBe(90000);
    expect((await wf.getClientQuote(c1, r.id))!.quote.services?.[0]).toEqual({ id: "s1", kind: "pose", label: "Pose", qty: 1, price: 150000 });
    const rejected = await wf.applyAction(c1, r.id, A({ type: "reject", reason: "price", rev: await revOf(m1, r.id) }));
    expect(rejected.ok && rejected.quote.lostReason).toBe("price");
    expect((await repo.getQuote(m1, r.id))?.lostReason).toBe("price");
    expect((await wf.listEvents(r.id)).find((e) => e.kind === "rejected")?.data).toEqual({ reason: "price" });
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
  it("une décision sans révision est refusée", async () => {
    const x = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "H", phone: "", address: "", email: "c1@ex.mg" }, project: "", delay: "", notes: "", lines: [{ ...line, unit: 1000 }], terms: { tva: 0, deposit: 0, validityDays: 30 } }));
    expect((await wf.applyAction(m1, x.id, A({ type: "send" }))).ok).toBe(true);
    expect(await wf.applyAction(c1, x.id, A({ type: "accept" }))).toEqual({ ok: false, error: "quote_changed" });
  });
  it("une révision qui remet un prix à zéro est refusée ; une écriture sur un état périmé aussi", async () => {
    const x = (await repo.listQuotes(m1)).find((y) => y.status === "sent" && y.client.email === "c1@ex.mg")!;
    expect(await repo.updateQuote(m1, x.id, { ...x, lines: [{ ...x.lines[0], unit: 0 }] })).toBe("incomplete");
    // le client accepte, puis le menuisier enregistre une modification lue avant l'acceptation : l'acceptation est annulée (nouvelle validation requise)
    const stale = { ...x, notes: "révision tardive" };
    expect((await wf.applyAction(c1, x.id, A({ type: "accept", rev: x.rev ?? 0 }))).ok).toBe(true);
    expect(await repo.updateQuote(m1, x.id, stale)).toMatchObject({ status: "sent", rev: (x.rev ?? 0) + 1 });
    expect(await wf.applyAction(c1, x.id, A({ type: "accept", rev: x.rev ?? 0 }))).toEqual({ ok: false, error: "quote_changed" }); // l'ancienne version ne peut plus être acceptée
    expect((await wf.applyAction(c1, x.id, A({ type: "accept", rev: (x.rev ?? 0) + 1 }))).ok).toBe(true);
  });
  it("le client ne lit ni n'est prévenu des commentaires du menuisier avant l'envoi", async () => {
    const d = await repo.createQuote(m1, quoteSchema.parse({ id: crypto.randomUUID(), number: "", date: "", status: "draft", client: { name: "", phone: "", address: "", email: "" }, project: "", delay: "", notes: "", lines: [line], terms: { tva: 0, deposit: 0, validityDays: 30 } }), { clientId: c2 });
    expect(await wf.addLineComment(m1, d.id, { lineId: line.id, body: "je compte 450 000 Ar" })).toMatchObject({ side: "menuisier" });
    expect(await wf.listLineComments(c2, d.id)).toEqual([]);
    expect((await notif.listNotifications(c2)).items.some((n) => n.quoteId === d.id)).toBe(false);
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

describe("modifier un devis selon son statut (côté menuisier)", () => {
  const req = { menuisier: "", project: "Villa", message: "Je voudrais 2 fenêtres", siteAddress: "Ivandry", wantedDate: "2026-12-01", lines: [{ ...line, width: 1500, height: 1200 }] };
  const fresh = async () => {
    const r = (await wf.createRequest(c1, { ...req, menuisier: slug1 })) as Quote;
    await upd(m1, r.id, quoteSchema.parse(r)); // le menuisier prépare la demande
    return r.id;
  };
  const kinds = async (id: string) => (await wf.listEvents(id)).map((e) => e.kind);

  it("accepté : modifier annule l'acceptation (statut « envoyé », révision, client prévenu) ; sans changement, rien ne bouge", async () => {
    const id = await fresh();
    await wf.applyAction(m1, id, A({ type: "send" }));
    await wf.applyAction(c1, id, A({ type: "accept", rev: await revOf(m1, id) }));
    const cur = (await repo.getQuote(m1, id))!;
    expect(cur.status).toBe("accepted");
    expect(await repo.updateQuote(m1, id, cur)).toMatchObject({ status: "accepted", rev: cur.rev }); // enregistrer sans rien changer
    expect(await repo.updateQuote(m1, id, { ...cur, discount: 3 })).toMatchObject({ status: "sent", rev: (cur.rev ?? 0) + 1, discount: 3 });
    expect((await wf.listEvents(id)).find((e) => e.kind === "revised")?.data).toMatchObject({ from: "accepted" });
    expect((await notif.listNotifications(c1)).items.filter((n) => n.quoteId === id && n.kind === "revised")).toHaveLength(1); // une seule notification « modifié »
    expect((await wf.getClientQuote(c1, id))!.quote).toMatchObject({ status: "sent", discount: 3 });
    expect((await wf.applyAction(c1, id, A({ type: "accept", rev: await revOf(m1, id) }))).ok).toBe(true); // le client valide la nouvelle version
  });

  it("chantier en cours : avenant (révision notifiée), avancement et statut conservés ; terminé : figé", async () => {
    const id = await fresh();
    await wf.applyAction(m1, id, A({ type: "send" }));
    await wf.applyAction(c1, id, A({ type: "accept", rev: await revOf(m1, id) }));
    await wf.applyAction(m1, id, A({ type: "progress", progress: 40 }));
    const cur = (await repo.getQuote(m1, id))!;
    expect(await repo.updateQuote(m1, id, { ...cur, notes: "Ajout d'un volet demandé sur place", progress: 0, status: "draft" })).toMatchObject({ status: "in_progress", progress: 40, rev: (cur.rev ?? 0) + 1 });
    expect(await kinds(id)).toContain("revised");
    await wf.applyAction(m1, id, A({ type: "progress", progress: 100 }));
    expect(await repo.updateQuote(m1, id, { ...(await repo.getQuote(m1, id))!, notes: "trop tard" })).toBe("locked");
  });

  it("refusé : le menuisier l'adapte, le renvoie, le motif est effacé et le client peut l'accepter", async () => {
    const id = await fresh();
    await wf.applyAction(m1, id, A({ type: "send" }));
    await wf.applyAction(c1, id, A({ type: "reject", reason: "price", rev: await revOf(m1, id) }));
    const cur = (await repo.getQuote(m1, id))!;
    expect(cur).toMatchObject({ status: "rejected", lostReason: "price" });
    const adapted = await repo.updateQuote(m1, id, { ...cur, discount: 8 });
    expect(adapted).toMatchObject({ status: "rejected", lostReason: "price", discount: 8, rev: (cur.rev ?? 0) + 1 }); // rien n'est renvoyé tant que le menuisier ne le décide pas
    const sent = await wf.applyAction(m1, id, A({ type: "send", message: "Nouvelle proposition avec 8 % de remise" }));
    expect(sent.ok && sent.quote).toMatchObject({ status: "sent", discount: 8 });
    expect((await repo.getQuote(m1, id))!.lostReason).toBeUndefined();
    expect((await wf.applyAction(c1, id, A({ type: "accept", rev: await revOf(m1, id) }))).ok).toBe(true);
  });

  it("négociation : modifier crée une révision ; la demande et le brouillon restent libres", async () => {
    const id = await fresh();
    await wf.applyAction(m1, id, A({ type: "send" }));
    await wf.applyAction(c1, id, A({ type: "request_change", message: "Moins cher ?", topic: "price", rev: await revOf(m1, id) }));
    const cur = (await repo.getQuote(m1, id))!;
    expect(cur.changeTopic).toBe("price");
    expect((await wf.listEvents(id)).find((e) => e.kind === "change_requested")?.data).toEqual({ topic: "price" });
    expect(await repo.updateQuote(m1, id, { ...cur, discount: 5 })).toMatchObject({ status: "negotiation", changeTopic: "price", rev: (cur.rev ?? 0) + 1 });
    await wf.applyAction(m1, id, A({ type: "send" }));
    expect((await repo.getQuote(m1, id))!.changeTopic).toBeUndefined(); // la demande est traitée
    expect(wf.actionSchema.safeParse({ type: "request_change", message: "x", topic: "autre" }).success).toBe(false);
    const draft = await fresh();
    const d = (await repo.getQuote(m1, draft))!;
    expect(await repo.updateQuote(m1, draft, { ...d, notes: "brouillon" })).toMatchObject({ status: "draft", rev: 0 });
  });
});

describe("demande de devis assistée par l'analyse du texte", () => {
  it("sans ouvrages saisis, les ouvrages sont déduits du message, chiffrés, avec les points à vérifier", async () => {
    const r = (await wf.createRequest(c1, { menuisier: slug1, project: "Maison Ivandry", message: "Bonjour, je voudrais 2 fenêtres coulissantes 150x120 anthracite et une porte d'entrée pour la maison à Ivandry", siteAddress: "", wantedDate: "", lines: [] })) as Quote;
    expect(r.status).toBe("requested");
    expect(r.lines.map((l) => [l.category, l.qty])).toEqual([["fenetre", 2], ["porte", 1]]);
    expect(r.lines.every((l) => l.unit > 0)).toBe(true); // chiffré avec les tarifs du menuisier
    expect(r.request?.intake?.auto).toBe(true);
    expect(r.request?.intake?.checks.some((c) => c.lineId === r.lines[1].id && c.keys.includes("size"))).toBe(true); // la porte n'a pas de cotes
    expect(r.request?.siteAddress).toBe("Ivandry");
    expect((await wf.getClientQuote(c1, r.id))!.quote.lines[0].unit).toBe(0); // le client ne voit pas les prix
  });
  it("rien de compréhensible : la demande est refusée pour que le client précise ; des ouvrages saisis passent comme avant", async () => {
    expect(await wf.createRequest(c1, { menuisier: slug1, project: "", message: "Bonjour, pouvez-vous m'appeler ?", siteAddress: "", wantedDate: "", lines: [] })).toBe("intake_empty");
    const manual = (await wf.createRequest(c1, { menuisier: slug1, project: "", message: "", siteAddress: "", wantedDate: "", lines: [line] })) as Quote;
    expect(manual.request?.intake).toBeUndefined();
  });
});

describe("avis du client par ouvrage", () => {
  const req = { menuisier: "", project: "Villa", message: "", siteAddress: "", wantedDate: "", lines: [{ ...line, width: 1500, height: 1200 }, { ...line, id: crypto.randomUUID(), width: 900, height: 2100 }] };
  const sentQuote = async () => {
    const r = (await wf.createRequest(c1, { ...req, menuisier: slug1 })) as Quote;
    await upd(m1, r.id, quoteSchema.parse(r));
    await wf.applyAction(m1, r.id, A({ type: "send" }));
    return (await repo.getQuote(m1, r.id))!;
  };
  const rev = (id: string) => revOf(m1, id);

  it("valider un ouvrage, faire une demande précise, la retirer ; le statut ne bouge pas", async () => {
    const q = await sentQuote();
    const [a, b] = q.lines;
    expect((await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: a.id, state: "approved", message: "Parfait", rev: await rev(q.id) }))).ok).toBe(true);
    expect((await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: b.id, state: "request", topic: "details", message: "En 950 mm de large ?", rev: await rev(q.id) }))).ok).toBe(true);
    const cur = (await repo.getQuote(m1, q.id))!;
    expect(cur.status).toBe("sent");
    expect(cur.lineReviews?.[a.id]).toMatchObject({ state: "approved", message: "Parfait" });
    expect(cur.lineReviews?.[b.id]).toMatchObject({ state: "request", topic: "details", message: "En 950 mm de large ?" });
    expect((await wf.listEvents(q.id)).filter((e) => e.kind === "line_review")).toHaveLength(2);
    expect((await notif.listNotifications(m1)).items.some((n) => n.quoteId === q.id && n.kind === "review_line")).toBe(true); // la demande prévient le menuisier
    expect(await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: b.id, state: "request", message: "", rev: await rev(q.id) }))).toEqual({ ok: false, error: "message_required" });
    expect(await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: "inconnu", state: "approved", rev: await rev(q.id) }))).toEqual({ ok: false, error: "not_found" });
    await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: b.id, state: "clear", rev: await rev(q.id) }));
    expect((await repo.getQuote(m1, q.id))!.lineReviews?.[b.id]).toBeUndefined();
  });
  it("tout valider d'un coup ; seul le client, seulement sur un devis envoyé, sur la version qu'il a sous les yeux", async () => {
    const q = await sentQuote();
    expect(await wf.applyAction(m1, q.id, A({ type: "approve_all", rev: 0 }))).toEqual({ ok: false, error: "invalid_transition" });
    expect(await wf.applyAction(c1, q.id, A({ type: "approve_all", rev: 99 }))).toEqual({ ok: false, error: "quote_changed" });
    expect((await wf.applyAction(c1, q.id, A({ type: "approve_all", rev: await rev(q.id) }))).ok).toBe(true);
    expect(Object.values((await repo.getQuote(m1, q.id))!.lineReviews ?? {}).map((r) => r.state)).toEqual(["approved", "approved"]);
  });
  it("accepter le devis valide les ouvrages restants mais garde une demande non traitée", async () => {
    const q = await sentQuote();
    await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: q.lines[1].id, state: "request", message: "Plus clair ?", rev: await rev(q.id) }));
    await wf.applyAction(c1, q.id, A({ type: "accept", rev: await rev(q.id) }));
    const cur = (await repo.getQuote(m1, q.id))!;
    expect(cur.lineReviews?.[q.lines[0].id]?.state).toBe("approved");
    expect(cur.lineReviews?.[q.lines[1].id]?.state).toBe("request");
  });
  it("modifier un ouvrage efface son avis, les autres restent ; renvoyer le devis traite les demandes", async () => {
    const q = await sentQuote();
    await wf.applyAction(c1, q.id, A({ type: "approve_all", rev: await rev(q.id) }));
    const cur = (await repo.getQuote(m1, q.id))!;
    const edited = await repo.updateQuote(m1, q.id, { ...cur, lines: [{ ...cur.lines[0], width: 1600 }, cur.lines[1]] });
    expect(edited).toMatchObject({ status: "sent" });
    expect(Object.keys((edited as Quote).lineReviews ?? {})).toEqual([q.lines[1].id]); // l'ouvrage retouché est à revalider
    await wf.applyAction(c1, q.id, A({ type: "review_line", lineId: q.lines[0].id, state: "request", message: "Encore 1 cm", rev: await rev(q.id) }));
    await wf.applyAction(c1, q.id, A({ type: "request_change", message: "voir ouvrage F-01", rev: await rev(q.id) }));
    await wf.applyAction(m1, q.id, A({ type: "send" }));
    expect(Object.values((await repo.getQuote(m1, q.id))!.lineReviews ?? {}).every((r) => r.state === "approved")).toBe(true);
  });
});

