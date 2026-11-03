import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { normalize } from "./calc";
import { salePrice } from "./costing";
import { getDb, schema } from "./db";
import { type Issuer, CHANGE_TOPICS, ISSUER_KEYS, LOSS_REASONS, type LineReview, type Quote, type QuoteRequest, REPORT_REASONS, type Role, type Status, lineSchema } from "./model";
import { clientAccountFor, discountFor, ensureContact } from "./contacts";
import { analyze, toLine } from "./intake";
import { imageSrc } from "./logo";
import { notify } from "./notifications";
import { StaleQuote, createQuote, findUserById, getSettings, unchanged } from "./repo";

// ---------- Actions possibles sur un devis lié à un client ----------
const msg = z.string().trim().max(1000);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("send"), message: msg.optional() }),
  z.object({ type: z.literal("decline"), message: msg.optional() }),
  z.object({ type: z.literal("progress"), progress: z.number().int().min(0).max(100), message: msg.optional() }),
  // rev : révision du devis que le client a sous les yeux ; si le menuisier l'a modifié entre-temps, la décision est refusée (quote_changed).
  z.object({ type: z.literal("accept"), message: msg.optional(), rev: z.number().int().optional() }),
  z.object({ type: z.literal("reject"), message: msg.optional(), reason: z.enum(LOSS_REASONS).optional(), rev: z.number().int().optional() }),
  z.object({ type: z.literal("request_change"), message: msg.min(1), topic: z.enum(CHANGE_TOPICS).optional(), discountPercent: z.number().min(0).max(90).optional(), rev: z.number().int().optional() }),
  // avis par ouvrage : « approved » (avis facultatif), « request » (demande précise : objet + texte), « clear » (retirer) ; approve_all valide tous les ouvrages d'un coup
  z.object({ type: z.literal("review_line"), lineId: z.string().min(1).max(64), state: z.enum(["approved", "request", "hold", "clear"]), topic: z.enum(CHANGE_TOPICS).optional(), message: msg.optional(), rev: z.number().int().optional() }),
  z.object({ type: z.literal("approve_all"), rev: z.number().int().optional() }),
  z.object({ type: z.literal("review"), rating: z.number().int().min(1).max(5), comment: msg.default("") }),
  z.object({ type: z.literal("report"), reason: z.enum(REPORT_REASONS), details: z.string().trim().max(1500).default("") }),
  z.object({ type: z.literal("message"), message: msg.min(1) }),
]);
export type Action = z.infer<typeof actionSchema>;
export type Side = "menuisier" | "client";

// Machine d'états : renvoie le nouveau statut, ou null si l'action est interdite dans cet état pour ce rôle.
export function transition(status: Status, a: Action, side: Side): Status | null {
  if (a.type === "message") return status;
  if (a.type === "report") return side === "client" ? status : null;
  if (side === "menuisier") {
    switch (a.type) {
      case "send":
        return ["requested", "draft", "negotiation", "rejected"].includes(status) ? "sent" : null; // « rejected » : le menuisier a adapté le devis refusé et le renvoie
      case "decline":
        return ["requested", "draft", "negotiation", "sent"].includes(status) ? "rejected" : null;
      case "progress":
        return ["accepted", "in_progress", "completed"].includes(status) ? (a.progress >= 100 ? "completed" : a.progress > 0 ? "in_progress" : "accepted") : null;
      default:
        return null;
    }
  }
  switch (a.type) {
    case "accept":
      return status === "sent" ? "accepted" : null;
    case "reject":
      return ["sent", "negotiation"].includes(status) ? "rejected" : null;
    case "request_change":
      return status === "sent" ? "negotiation" : null;
    case "review_line":
    case "approve_all":
      return status === "sent" ? status : null; // le client relit un devis reçu, le statut ne change pas
    case "review":
      return status === "completed" ? status : null;
    default:
      return null;
  }
}

// Le client ne voit les prix qu'une fois le devis envoyé, et jamais les coûts internes (prestations).
export const clientView = (q: Quote): Quote => {
  const services = q.services?.map((s) => ({ ...s, cost: undefined }));
  return q.status === "requested" || q.status === "draft" ? { ...q, discount: 0, lines: q.lines.map((l) => ({ ...l, unit: 0 })), services: services?.map((s) => ({ ...s, price: 0 })) } : { ...q, services };
};

// ---------- Demande de devis d'un client ----------
export const requestSchema = z.object({
  menuisier: z.string().min(1).max(80), // slug du profil public
  project: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1500).default(""),
  siteAddress: z.string().trim().max(200).default(""),
  wantedDate: z.string().trim().max(40).default(""),
  lines: z.array(lineSchema).max(30).default([]), // vide : les ouvrages sont déduits du texte du client (lib/intake.ts)
  group: z.uuid().optional(), // la même demande envoyée à plusieurs menuisiers (un envoi par menuisier) : identifiant commun choisi par le formulaire
});

// Crée un devis « requested » chez le menuisier : ses tarifs et majorations remplissent déjà les prix (le client ne les voit pas encore).
export async function createRequest(clientId: string, input: z.infer<typeof requestSchema>): Promise<Quote | "no_menuisier" | "no_client" | "intake_empty"> {
  const db = await getDb();
  // profil publié (annuaire) ou lien de demande du menuisier : le slug suffit
  const [profile] = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.slug, input.menuisier));
  if (!profile) return "no_menuisier";
  const client = await findUserById(clientId);
  if (!client) return "no_client";
  const settings = await getSettings(profile.userId);
  const discount = await discountFor(profile.userId, { clientUserId: clientId, email: client.email ?? "" }); // remise habituelle de ce client
  // Sans ouvrages saisis, l'assistant les déduit de la description (titre + message) ; rien de compris : on redemande au client.
  const parsed = input.lines.length ? null : analyze(input.message.trim() || input.project);
  if (parsed && !parsed.items.length) return "intake_empty";
  const given = parsed ? parsed.items.map((i) => toLine(i.spec)) : input.lines;
  // Le n-ième ouvrage a la même référence chez chaque menuisier de la demande : c'est ce qui permet de le retirer des autres devis quand le client le valide.
  const lines = given.map((l, k) => {
    const n = normalize(l);
    return { ...n, id: crypto.randomUUID(), unit: salePrice(n, settings), ...(input.group ? { ref: `${input.group}-${k}` } : {}) };
  });
  const request: QuoteRequest = {
    ...(input.group ? { group: input.group } : {}),
    message: input.message, siteAddress: input.siteAddress || parsed?.address || "", wantedDate: input.wantedDate,
    ...(parsed ? { intake: { auto: true, checks: parsed.items.map((i, k) => ({ lineId: lines[k].id, keys: i.assumptions })).filter((c) => c.keys.length), unsupported: parsed.unsupported, urgent: parsed.urgent } } : {}),
  };
  const quote = await createQuote(
    profile.userId,
    {
      id: crypto.randomUUID(), number: "", date: "", status: "requested", client: { name: client.name, phone: client.phone, address: request.siteAddress, email: client.email ?? "" },
      project: input.project, delay: "", notes: "", lines, discount, progress: 0, rev: 0,
      terms: { tva: settings.tva, deposit: settings.deposit, validityDays: settings.validityDays },
    },
    { clientId, request },
  );
  await db.insert(schema.quoteEvents).values({ quoteId: quote.id, actorId: clientId, kind: "created", message: input.message });
  // le client entre dans le carnet du menuisier, qui est prévenu de la demande
  await ensureContact(profile.userId, { name: client.name, phone: client.phone, email: client.email ?? "", clientUserId: clientId });
  await notify(db, { userId: profile.userId, quoteId: quote.id, kind: "request", message: input.project || input.message });
  return quote;
}

// ---------- Accès et lecture ----------
// Quel est le rôle de cet utilisateur sur ce devis ? (menuisier propriétaire, client demandeur, ou aucun : on répond « introuvable »)
export async function sideOf(userId: string, quoteId: string): Promise<{ side: Side; row: typeof schema.quotes.$inferSelect } | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId));
  if (!row) return null;
  if (row.userId === userId) return { side: "menuisier", row };
  if (row.clientId === userId) return { side: "client", row };
  return null;
}

export type EventView = { id: string; kind: string; message: string; data: Record<string, unknown>; at: string; side: Side | "system"; actor: string };

export async function listEvents(quoteId: string): Promise<EventView[]> {
  const db = await getDb();
  const [q] = await db.select({ userId: schema.quotes.userId }).from(schema.quotes).where(eq(schema.quotes.id, quoteId));
  const rows = await db
    .select({ e: schema.quoteEvents, name: schema.users.name })
    .from(schema.quoteEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.quoteEvents.actorId))
    .where(and(eq(schema.quoteEvents.quoteId, quoteId), ne(schema.quoteEvents.kind, "line_comment"))) // les commentaires d'ouvrage vivent avec leur ouvrage
    .orderBy(asc(schema.quoteEvents.createdAt));
  return rows.map(({ e, name }) => ({
    id: e.id, kind: e.kind, message: e.message, data: e.data, at: e.createdAt.toISOString(),
    side: e.actorId ? (e.actorId === q?.userId ? "menuisier" : "client") : "system", actor: name ?? "",
  }));
}

export type ClientQuote = { siblings: SiblingQuote[]; quote: Quote; menuisier: { id: string; name: string; slug: string; logo: string; city: string; phone: string; email: string; verified: boolean }; issuer: Issuer; reviewed: boolean };

async function toClientQuote(row: typeof schema.quotes.$inferSelect, withSiblings = false): Promise<ClientQuote> {
  const db = await getDb();
  const [m] = await db
    .select({ name: schema.users.name, phone: schema.users.phone, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, row.userId));
  const [p] = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, row.userId));
  const [r] = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.quoteId, row.id));
  const settings = await getSettings(row.userId);
  return {
    siblings: withSiblings ? await openSiblings(row) : [], // seule la fiche d'un devis en a besoin (la liste n'en fait pas la requête)
    quote: clientView({ ...row.data, status: row.status as Status, progress: row.progress }),
    issuer: { ...(Object.fromEntries(ISSUER_KEYS.map((k) => [k, settings[k]])) as Issuer), company: settings.company || p?.displayName || m?.name || "" }, // entête jamais remplie : le nom du menuisier plutôt qu'un tiret
    menuisier: { id: row.userId, name: p?.displayName || m?.name || "", slug: p?.slug ?? "", logo: imageSrc(p?.slug ?? "", "logo", p?.logo ?? ""), city: p?.city ?? "", phone: m?.phone ?? "", email: m?.email ?? "", verified: p?.verified ?? false },
    reviewed: !!r,
  };
}

export async function listClientQuotes(clientId: string): Promise<ClientQuote[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.quotes).where(eq(schema.quotes.clientId, clientId)).orderBy(desc(schema.quotes.createdAt));
  // la liste n'a pas besoin du logo ni de la signature de l'entreprise (lourds, répétés à chaque devis) : seule la fiche d'un devis les porte
  return (await Promise.all(rows.map((r) => toClientQuote(r)))).map((c) => ({ ...c, issuer: { ...c.issuer, logo: "", signature: "" } }));
}

export async function getClientQuote(clientId: string, id: string): Promise<ClientQuote | null> {
  const s = await sideOf(clientId, id);
  return s && s.side === "client" ? toClientQuote(s.row, true) : null;
}

// ---------- Une même demande envoyée à plusieurs menuisiers ----------
// Chaque menuisier a son devis (même `request.group`, mêmes `ref` d'ouvrages). Dès que le client valide un ouvrage, ou le devis entier, chez l'un d'eux,
// cet ouvrage n'est plus valable chez les autres : il y est marqué (`taken`), ne compte plus dans le prix, et le menuisier concerné est prévenu
// (nom du menuisier retenu, devis, nombre d'ouvrages). Seul ce qui est validé tombe : les autres ouvrages des autres devis restent valables.
const OPEN_STATUSES: Status[] = ["requested", "draft", "sent", "negotiation"];
type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

async function menuisierName(db: Pick<Awaited<ReturnType<typeof getDb>>, "select">, userId: string) {
  const [p] = await db.select({ name: schema.menuisierProfiles.displayName }).from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, userId));
  if (p?.name) return p.name;
  const [u] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, userId));
  return u?.name ?? "";
}

// Devis encore ouverts de la même demande, hors celui-ci.
const siblingsOf = (db: Pick<Awaited<ReturnType<typeof getDb>>, "select">, row: typeof schema.quotes.$inferSelect) =>
  row.clientId && row.data.request?.group
    ? db.select().from(schema.quotes).where(and(eq(schema.quotes.clientId, row.clientId), ne(schema.quotes.id, row.id), inArray(schema.quotes.status, OPEN_STATUSES), sql`${schema.quotes.data}->'request'->>'group' = ${row.data.request.group}`))
    : Promise.resolve([]);

async function cascadeTaken(tx: Tx, winner: typeof schema.quotes.$inferSelect, refs: string[], whole: boolean) {
  const siblings = await siblingsOf(tx, winner);
  if (!siblings.length) return;
  const by = await menuisierName(tx, winner.userId);
  const at = new Date().toISOString();
  for (const s of siblings) {
    const hit = s.data.lines.filter((l) => l.ref && refs.includes(l.ref) && !s.data.taken?.[l.id]);
    if (!hit.length) continue;
    const taken = { ...(s.data.taken ?? {}), ...Object.fromEntries(hit.map((l) => [l.id, { by, at }])) };
    const closed = s.data.lines.every((l) => taken[l.id]); // plus aucun ouvrage valable : le devis est annulé
    const lineReviews = Object.fromEntries(Object.entries(s.data.lineReviews ?? {}).filter(([id]) => !taken[id]));
    const status: Status = closed ? "rejected" : (s.status as Status);
    await tx.update(schema.quotes).set({ status, data: { ...s.data, status, taken, lineReviews: Object.keys(lineReviews).length ? lineReviews : undefined, ...(closed ? { lostReason: "competitor" as const } : {}) } }).where(eq(schema.quotes.id, s.id));
    await tx.insert(schema.quoteEvents).values({ quoteId: s.id, actorId: winner.clientId, kind: "taken", message: by, data: { by, lines: hit.map((l) => l.id), whole, closed } });
    await notify(tx, { userId: s.userId, quoteId: s.id, kind: "taken", message: JSON.stringify({ by, n: hit.length, whole, closed }) });
  }
}

// Pour l'avertissement du client avant de valider : les autres menuisiers de la demande et les ouvrages qui leur restent (références).
export type SiblingQuote = { menuisier: string; number: string; refs: string[] };
async function openSiblings(row: typeof schema.quotes.$inferSelect): Promise<SiblingQuote[]> {
  const db = await getDb();
  const rows = await siblingsOf(db, row);
  return Promise.all(rows.map(async (s) => ({ menuisier: await menuisierName(db, s.userId), number: s.number, refs: s.data.lines.filter((l) => l.ref && !s.data.taken?.[l.id]).map((l) => l.ref!) })));
}

// ---------- Appliquer une action ----------
export type ActionResult = { ok: true; quote: Quote } | { ok: false; error: "not_found" | "invalid_transition" | "incomplete" | "already_reviewed" | "no_client_account" | "quote_changed" | "message_required" | "nothing_to_accept" | "line_taken" };

export async function applyAction(actorId: string, quoteId: string, a: Action): Promise<ActionResult> {
  const found = await sideOf(actorId, quoteId);
  if (!found) return { ok: false, error: "not_found" };
  const { side, row } = found;
  const next = transition(row.status as Status, a, side);
  if (!next) return { ok: false, error: "invalid_transition" };
  const db = await getDb();

  let clientId = row.clientId;
  if (a.type === "send") {
    if (row.data.lines.some((l) => !(l.unit > 0))) return { ok: false, error: "incomplete" };
    if (!clientId) {
      // devis créé par le menuisier : on retrouve le compte client par l'e-mail saisi, sinon par son téléphone
      const c = await clientAccountFor({ email: row.data.client.email ?? "", phone: row.data.client.phone });
      if (!c) return { ok: false, error: "no_client_account" };
      clientId = c.id;
    }
  }
  // la décision du client porte sur une révision précise (obligatoire : sans elle, rien ne prouve ce qu'il a vu)
  if (side === "client" && ["accept", "reject", "request_change", "review_line", "approve_all"].includes(a.type) && (!("rev" in a) || a.rev !== (row.data.rev ?? 0))) return { ok: false, error: "quote_changed" };
  if (a.type === "review") {
    const [done] = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.quoteId, quoteId));
    if (done) return { ok: false, error: "already_reviewed" };
  }

  // avis par ouvrage du client : un par ouvrage, effacé si l'ouvrage change (voir updateQuote) ; accepter le devis valide les ouvrages restants
  const now = new Date().toISOString();
  let reviews: Record<string, LineReview> | undefined = row.data.lineReviews;
  if (a.type === "review_line") {
    if (!row.data.lines.some((l) => l.id === a.lineId)) return { ok: false, error: "not_found" };
    if (row.data.taken?.[a.lineId] && a.state !== "clear") return { ok: false, error: "line_taken" }; // validé chez un autre menuisier
    if (a.state === "request" && !a.message?.trim()) return { ok: false, error: "message_required" };
    const { [a.lineId]: _old, ...rest } = reviews ?? {};
    void _old;
    reviews = a.state === "clear" ? rest : { ...rest, [a.lineId]: { state: a.state, ...(a.state === "request" && a.topic ? { topic: a.topic } : {}), message: a.message?.trim() ?? "", at: now } };
  } else if (a.type === "approve_all" || a.type === "accept") {
    // accepter avec tous les ouvrages en attente n'a pas de sens : rien à faire poser
    const live = row.data.lines.filter((l) => !row.data.taken?.[l.id]); // un ouvrage validé chez un autre menuisier ne peut plus l'être ici
    if (!live.length || (a.type === "accept" && live.every((l) => reviews?.[l.id]?.state === "hold"))) return { ok: false, error: "nothing_to_accept" };
    // les ouvrages en attente le restent ; à l'acceptation, une demande non traitée aussi
    reviews = Object.fromEntries(live.map((l) => {
      const r = reviews?.[l.id];
      return [l.id, r?.state === "hold" || (a.type === "accept" && r?.state === "request") ? r : { state: "approved" as const, message: r?.state === "approved" ? r.message : "", at: r?.at ?? now }];
    }));
  } else if (a.type === "send" && reviews) {
    reviews = Object.fromEntries(Object.entries(reviews).filter(([, r]) => r.state === "approved")); // les demandes sont traitées par le nouvel envoi
  }
  const reviewsChanged = JSON.stringify(reviews ?? null) !== JSON.stringify(row.data.lineReviews ?? null);
  // Ouvrages que le client valide maintenant : ils cessent d'être valables chez les autres menuisiers de la même demande.
  const validated = side === "client" && (a.type === "review_line" ? a.state === "approved" : a.type === "approve_all" || a.type === "accept")
    ? row.data.lines.filter((l) => l.ref && reviews?.[l.id]?.state === "approved" && (a.type !== "review_line" || l.id === a.lineId)).map((l) => l.ref!)
    : [];

  const progress = a.type === "progress" ? a.progress : row.progress;
  const quote: Quote = { ...row.data, status: next, progress, clientId, lineReviews: reviews, ...(a.type === "reject" && a.reason ? { lostReason: a.reason } : {}), ...(a.type === "send" ? { lostReason: undefined, changeTopic: undefined } : {}), ...(a.type === "request_change" && a.topic ? { changeTopic: a.topic } : {}), ...(a.type === "decline" ? { lostReason: "declined" as const } : {}) };
  try {
  await db.transaction(async (tx) => {
    if (next !== row.status || progress !== row.progress || clientId !== row.clientId || reviewsChanged) {
      // écriture conditionnelle : si le devis a changé depuis la lecture (révision, décision concurrente), on abandonne
      const done = await tx.update(schema.quotes).set({ status: next, progress, clientId, data: quote }).where(and(eq(schema.quotes.id, quoteId), unchanged(row.status, row.data.rev ?? 0))).returning({ id: schema.quotes.id });
      if (!done.length) throw new StaleQuote();
    }
    if (validated.length) await cascadeTaken(tx, row, validated, a.type !== "review_line");
    // l'autre partie est prévenue des étapes du devis
    const other = side === "menuisier" ? clientId : row.userId;
    const told = ["send", "decline", "accept", "reject", "request_change", "review", "approve_all", "message"].includes(a.type) || (a.type === "review_line" && a.state === "request") || (a.type === "progress" && progress !== row.progress);
    if (other && told) await notify(tx, { userId: other, quoteId, kind: a.type, message: "message" in a ? a.message : "comment" in a ? a.comment : "" });
    const log = (kind: string, message = "", data: Record<string, unknown> = {}) => tx.insert(schema.quoteEvents).values({ quoteId, actorId, kind, message, data });
    switch (a.type) {
      case "send": return void (await log("sent", a.message));
      case "decline": return void (await log("declined", a.message));
      case "accept": return void (await log("accepted", a.message));
      case "reject": return void (await log("rejected", a.message, a.reason ? { reason: a.reason } : {}));
      case "request_change": return void (await log("change_requested", a.message, { ...(a.topic ? { topic: a.topic } : {}), ...(a.discountPercent ? { discountPercent: a.discountPercent } : {}) }));
      case "message": return void (await log("message", a.message));
      case "review_line": return void (await log("line_review", a.message ?? "", { lineId: a.lineId, state: a.state, ...(a.topic ? { topic: a.topic } : {}) }));
      case "approve_all": return void (await log("approve_all"));
      case "progress": {
        await log("progress", a.message, { progress: a.progress });
        if (a.progress >= 100 && row.progress < 100) await log("completed");
        return;
      }
      case "review": {
        await tx.insert(schema.reviews).values({ quoteId, clientId: actorId, menuisierId: row.userId, rating: a.rating, comment: a.comment });
        return void (await log("reviewed", a.comment, { rating: a.rating }));
      }
      case "report":
        // un signalement reste confidentiel : il n'apparaît pas dans l'historique que le menuisier consulte
        return void (await tx.insert(schema.reports).values({ reporterId: actorId, menuisierId: row.userId, quoteId, reason: a.reason, details: a.details }));
    }
  });
  } catch (e) {
    if (e instanceof StaleQuote) return { ok: false, error: "quote_changed" };
    throw e;
  }
  if (a.type === "send" && clientId) await ensureContact(row.userId, { name: row.data.client.name, phone: row.data.client.phone, email: row.data.client.email ?? "", clientUserId: clientId });
  return { ok: true, quote: side === "client" ? clientView(quote) : quote }; // le client ne reçoit jamais les prix avant l'envoi
}

// ---------- Commentaires par ouvrage ----------
// Le client et le menuisier discutent d'un ouvrage précis. Stockés comme événements « line_comment » (data.lineId) ; l'autre partie est notifiée, le clic mène à l'ouvrage.
export const commentSchema = z.object({ lineId: z.string().min(1).max(64), body: z.string().trim().min(1).max(1000) });
export type LineComment = { id: string; lineId: string; body: string; at: string; side: Side };

export async function listLineComments(userId: string, quoteId: string): Promise<LineComment[] | null> {
  const found = await sideOf(userId, quoteId);
  if (!found) return null;
  const db = await getDb();
  if (found.side === "client" && ["requested", "draft"].includes(found.row.status)) return []; // avant l'envoi, les échanges du menuisier ne sont pas visibles
  const rows = await db.select().from(schema.quoteEvents).where(and(eq(schema.quoteEvents.quoteId, quoteId), eq(schema.quoteEvents.kind, "line_comment"))).orderBy(asc(schema.quoteEvents.createdAt));
  return rows.map((e) => ({ id: e.id, lineId: String(e.data.lineId ?? ""), body: e.message, at: e.createdAt.toISOString(), side: e.actorId === found.row.userId ? "menuisier" : "client" }));
}

export async function addLineComment(userId: string, quoteId: string, input: z.infer<typeof commentSchema>): Promise<LineComment | "not_found" | "not_allowed"> {
  const found = await sideOf(userId, quoteId);
  if (!found) return "not_found";
  const { side, row } = found;
  if (!row.clientId || !row.data.lines.some((l) => l.id === input.lineId)) return "not_found";
  if (side === "client" && ["requested", "draft"].includes(row.status)) return "not_allowed"; // le client ne voit pas encore le devis
  const db = await getDb();
  const other = side === "menuisier" ? row.clientId : row.userId;
  const [e] = await db.transaction(async (tx) => {
    const ev = await tx.insert(schema.quoteEvents).values({ quoteId, actorId: userId, kind: "line_comment", message: input.body, data: { lineId: input.lineId } }).returning();
    if (!(side === "menuisier" && ["requested", "draft"].includes(row.status))) await notify(tx, { userId: other, quoteId, lineId: input.lineId, kind: "line_comment", message: input.body }); // le client n'est pas prévenu avant l'envoi
    return ev;
  });
  return { id: e.id, lineId: input.lineId, body: input.body, at: e.createdAt.toISOString(), side };
}

export type { Role };
