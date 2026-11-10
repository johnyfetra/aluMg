import { and, asc, count, eq, gte, ne } from "drizzle-orm";
import { z } from "zod";
import { MAX_PAGE, PAGE_SIZE } from "./admin";
import { DEMO_MODES, DEMO_STATUSES, type DemoStatus, isBookable, madaDay, overlaps } from "./booking";
import { getDb, schema } from "./db";
import { isPhone, normalizePhone } from "./phone";
import { formatPhone } from "./phone";
import { isUniqueViolation } from "./phones";
import { sendMail, sendSms } from "./senders";

// Rendez-vous de démonstration : pris par un visiteur sans compte, traités par l'administration.

export const demoSchema = z.object({
  mode: z.enum(DEMO_MODES).default("onsite"),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).refine(isPhone),
  place: z.string().trim().max(200).default(""),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(500).default(""),
}).refine((d) => d.mode === "online" || d.place.length >= 5, { path: ["place"] }) // sur place : il faut savoir où aller
  .transform((d) => (d.mode === "online" ? { ...d, place: "" } : d));
export type DemoInput = z.infer<typeof demoSchema>;

const t = () => schema.demoBookings;

// Créneaux déjà pris à partir d'aujourd'hui : seulement jour et heure, jamais qui les a pris.
export async function takenSlots(now = new Date()) {
  const db = await getDb();
  const rows = await db.select({ day: t().day, slot: t().slot }).from(t()).where(and(gte(t().day, madaDay(now)), ne(t().status, "cancelled")));
  return rows.map((r) => `${r.day} ${r.slot}`);
}

export type BookResult = { ok: true } | { ok: false; error: "slot_unavailable" | "slot_taken" | "already_booked" };

export async function bookDemo(input: DemoInput, now = new Date()): Promise<BookResult> {
  if (!isBookable(input.day, input.slot, now)) return { ok: false, error: "slot_unavailable" };
  const phone = normalizePhone(input.phone)!; // validé par le schéma
  const db = await getDb();
  // un seul rendez-vous à venir par numéro : on le déplace en écrivant à l'équipe, pas en en prenant un second
  const [{ n }] = await db.select({ n: count() }).from(t()).where(and(eq(t().phone, phone), gte(t().day, madaDay(now)), ne(t().status, "cancelled")));
  if (n > 0) return { ok: false, error: "already_booked" };
  // une heure entre deux démonstrations ; shortcut: vérifié avant l'insertion (deux réservations simultanées à 30 min d'écart passent), l'index unique ne bloque que la même heure
  const sameDay = await db.select({ slot: t().slot }).from(t()).where(and(eq(t().day, input.day), ne(t().status, "cancelled")));
  if (overlaps(input.slot, sameDay.map((r) => r.slot))) return { ok: false, error: "slot_taken" };
  try {
    await db.insert(t()).values({ ...input, phone });
    void notifyTeam({ ...input, phone }).catch((e) => console.error("[alumg] avis de rendez-vous non envoyé", e)); // l'e-mail ne bloque jamais la réservation
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slot_taken" }; // deux visiteurs sur le même créneau : l'index unique tranche
    throw e;
  }
}

// Avis à l'équipe : DEMO_NOTIFY_EMAIL (adresses séparées par des virgules), sinon les e-mails des comptes administrateurs.
async function notifyTeam(b: DemoInput) {
  const fixed = (process.env.DEMO_NOTIFY_EMAIL ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const to = fixed.length ? fixed : (await (await getDb()).select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.role, "admin"))).map((u) => u.email).filter((e): e is string => !!e);
  const where = b.mode === "online" ? "En ligne (envoyer le lien de visio)" : `Sur place : ${b.place}`;
  await sendMail(to, `Démo AluMg : ${b.name}, ${b.day} à ${b.slot}`, [`Nouvelle demande de démonstration`, ``, `Nom : ${b.name}`, `Téléphone : ${formatPhone(b.phone)}`, `Date : ${b.day} à ${b.slot} (heure de Madagascar)`, where, b.note ? `Remarque : ${b.note}` : null, ``, `À confirmer par téléphone, puis dans l'administration : /admin/rendez-vous`].filter((l) => l !== null).join("\n"));
}

// Administration : rendez-vous par date (le plus proche d’abord), filtrables par statut.
export async function listDemos(f: { status?: DemoStatus; page?: number } = {}) {
  const db = await getDb();
  const page = Math.min(Math.max(1, Math.trunc(f.page ?? 1) || 1), MAX_PAGE);
  const where = f.status ? eq(t().status, f.status) : undefined;
  const [[{ total }], [{ news }], items] = await Promise.all([
    db.select({ total: count() }).from(t()).where(where),
    db.select({ news: count() }).from(t()).where(eq(t().status, "new")),
    db.select().from(t()).where(where).orderBy(asc(t().day), asc(t().slot)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);
  return { items, total, news, page, pageSize: PAGE_SIZE };
}
export type DemoRow = Awaited<ReturnType<typeof listDemos>>["items"][number];

export async function setDemoStatus(id: string, status: DemoStatus) {
  const db = await getDb();
  try {
    const r = await db.update(t()).set({ status }).where(eq(t().id, id)).returning();
    if (!r.length) return "not_found";
    // confirmé par l'équipe : le client reçoit un SMS (l'échec d'envoi ne bloque pas la confirmation)
    if (status === "confirmed") {
      const b = r[0];
      const where = b.mode === "online" ? "en ligne : nous vous envoyons le lien de la visio" : `à ${b.place}`;
      void sendSms(b.phone, `AluMg : votre démonstration du ${b.day.split("-").reverse().join("/")} à ${b.slot} est confirmée, ${where}. À bientôt !`).catch((e) => console.error("[alumg] SMS de confirmation non envoyé", e));
    }
    return "ok";
  } catch (e) {
    if (isUniqueViolation(e)) return "slot_taken"; // réactiver un rendez-vous annulé dont le créneau a été repris
    throw e;
  }
}

export const demoStatusSchema = z.object({ status: z.enum(DEMO_STATUSES) });
