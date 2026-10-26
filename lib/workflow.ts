import { and, asc, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { normalize } from "./calc";
import { salePrice } from "./costing";
import { getDb, schema } from "./db";
import { type Issuer, ISSUER_KEYS, type Quote, type QuoteRequest, REPORT_REASONS, type Role, type Status, lineSchema } from "./model";
import { clientAccountFor, ensureContact } from "./contacts";
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
  z.object({ type: z.literal("reject"), message: msg.optional(), rev: z.number().int().optional() }),
  z.object({ type: z.literal("request_change"), message: msg.min(1), discountPercent: z.number().min(0).max(90).optional(), rev: z.number().int().optional() }),
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
        return ["requested", "draft", "negotiation"].includes(status) ? "sent" : null;
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
    case "review":
      return status === "completed" ? status : null;
    default:
      return null;
  }
}

// Le client ne voit les prix qu'une fois le devis envoyé.
export const clientView = (q: Quote): Quote =>
  q.status === "requested" || q.status === "draft" ? { ...q, discount: 0, lines: q.lines.map((l) => ({ ...l, unit: 0 })), services: q.services?.map((s) => ({ ...s, price: 0 })) } : q;

// ---------- Demande de devis d'un client ----------
export const requestSchema = z.object({
  menuisier: z.string().min(1).max(80), // slug du profil public
  project: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1500).default(""),
  siteAddress: z.string().trim().max(200).default(""),
  wantedDate: z.string().trim().max(40).default(""),
  lines: z.array(lineSchema).min(1).max(30),
});

// Crée un devis « requested » chez le menuisier : ses tarifs et majorations remplissent déjà les prix (le client ne les voit pas encore).
export async function createRequest(clientId: string, input: z.infer<typeof requestSchema>): Promise<Quote | "no_menuisier" | "no_client"> {
  const db = await getDb();
  // profil publié (annuaire) ou lien de demande du menuisier : le slug suffit
  const [profile] = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.slug, input.menuisier));
  if (!profile) return "no_menuisier";
  const client = await findUserById(clientId);
  if (!client) return "no_client";
  const settings = await getSettings(profile.userId);
  const lines = input.lines.map((l) => {
    const n = normalize(l);
    return { ...n, id: crypto.randomUUID(), unit: salePrice(n, settings) };
  });
  const request: QuoteRequest = { message: input.message, siteAddress: input.siteAddress, wantedDate: input.wantedDate };
  const quote = await createQuote(
    profile.userId,
    {
      id: crypto.randomUUID(), number: "", date: "", status: "requested", client: { name: client.name, phone: client.phone, address: input.siteAddress, email: client.email ?? "" },
      project: input.project, delay: "", notes: "", lines, discount: 0, progress: 0, rev: 0,
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

export type ClientQuote = { quote: Quote; menuisier: { id: string; name: string; slug: string; logo: string; phone: string; email: string; verified: boolean }; issuer: Issuer; reviewed: boolean };

async function toClientQuote(row: typeof schema.quotes.$inferSelect): Promise<ClientQuote> {
  const db = await getDb();
  const [m] = await db
    .select({ name: schema.users.name, phone: schema.users.phone, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, row.userId));
  const [p] = await db.select().from(schema.menuisierProfiles).where(eq(schema.menuisierProfiles.userId, row.userId));
  const [r] = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.quoteId, row.id));
  const settings = await getSettings(row.userId);
  return {
    quote: clientView({ ...row.data, status: row.status as Status, progress: row.progress }),
    issuer: Object.fromEntries(ISSUER_KEYS.map((k) => [k, settings[k]])) as Issuer,
    menuisier: { id: row.userId, name: p?.displayName || m?.name || "", slug: p?.slug ?? "", logo: p?.logo ?? "", phone: m?.phone ?? "", email: m?.email ?? "", verified: p?.verified ?? false },
    reviewed: !!r,
  };
}

export async function listClientQuotes(clientId: string): Promise<ClientQuote[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.quotes).where(eq(schema.quotes.clientId, clientId)).orderBy(desc(schema.quotes.createdAt));
  return Promise.all(rows.map(toClientQuote));
}

export async function getClientQuote(clientId: string, id: string): Promise<ClientQuote | null> {
  const s = await sideOf(clientId, id);
  return s && s.side === "client" ? toClientQuote(s.row) : null;
}

// ---------- Appliquer une action ----------
export type ActionResult = { ok: true; quote: Quote } | { ok: false; error: "not_found" | "invalid_transition" | "incomplete" | "already_reviewed" | "no_client_account" | "quote_changed" };

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
  if (side === "client" && ["accept", "reject", "request_change"].includes(a.type) && (!("rev" in a) || a.rev !== (row.data.rev ?? 0))) return { ok: false, error: "quote_changed" };
  if (a.type === "review") {
    const [done] = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.quoteId, quoteId));
    if (done) return { ok: false, error: "already_reviewed" };
  }

  const progress = a.type === "progress" ? a.progress : row.progress;
  const quote: Quote = { ...row.data, status: next, progress, clientId };
  try {
  await db.transaction(async (tx) => {
    if (next !== row.status || progress !== row.progress || clientId !== row.clientId) {
      // écriture conditionnelle : si le devis a changé depuis la lecture (révision, décision concurrente), on abandonne
      const done = await tx.update(schema.quotes).set({ status: next, progress, clientId, data: quote }).where(and(eq(schema.quotes.id, quoteId), unchanged(row.status, row.data.rev ?? 0))).returning({ id: schema.quotes.id });
      if (!done.length) throw new StaleQuote();
    }
    // l'autre partie est prévenue des étapes du devis
    const other = side === "menuisier" ? clientId : row.userId;
    const told = ["send", "decline", "accept", "reject", "request_change", "review"].includes(a.type) || (a.type === "progress" && progress !== row.progress);
    if (other && told) await notify(tx, { userId: other, quoteId, kind: a.type, message: "message" in a ? a.message : "comment" in a ? a.comment : "" });
    const log = (kind: string, message = "", data: Record<string, unknown> = {}) => tx.insert(schema.quoteEvents).values({ quoteId, actorId, kind, message, data });
    switch (a.type) {
      case "send": return void (await log("sent", a.message));
      case "decline": return void (await log("declined", a.message));
      case "accept": return void (await log("accepted", a.message));
      case "reject": return void (await log("rejected", a.message));
      case "request_change": return void (await log("change_requested", a.message, a.discountPercent ? { discountPercent: a.discountPercent } : {}));
      case "message": return void (await log("message", a.message));
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
