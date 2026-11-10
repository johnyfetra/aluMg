// Rendez-vous de démonstration, en ligne ou sur place (page d’accueil) : règles des créneaux, partagées par le calendrier et l'API.
// Fonctions pures : aucune dépendance au navigateur ni à la base.

export const DEMO_STATUSES = ["new", "confirmed", "done", "cancelled"] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];
export const DEMO_MODES = ["onsite", "online"] as const; // sur place (lieu précis demandé) ou en ligne (lien envoyé par téléphone)
export type DemoMode = (typeof DEMO_MODES)[number];

// Madagascar : UTC+3 toute l'année, sans heure d'été.
const MADA_OFFSET_MS = 3 * 3600_000;
export const DEMO_HORIZON_DAYS = 30; // on réserve de demain à J+30
// Le client choisit son heure, par quart d'heure ; une démonstration occupe l'équipe une heure.
// shortcut: horaires fixes et jours fériés ignorés ; passer à un planning réglable dans l'administration quand l'équipe grandit.
export const DEMO_STEP_MIN = 15;
export const DEMO_LENGTH_MIN = 60;
const WEEKDAY_HOURS: [string, string] = ["08:00", "16:00"]; // première et dernière heure de début
const SATURDAY_HOURS: [string, string] = ["08:00", "11:00"];

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Date du jour à Madagascar, au format AAAA-MM-JJ.
export const madaDay = (now: Date) => new Date(now.getTime() + MADA_OFFSET_MS).toISOString().slice(0, 10);

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = dimanche

export const hoursFor = (day: string): [string, string] | null => {
  const w = weekday(day);
  return w === 0 ? null : w === 6 ? SATURDAY_HOURS : WEEKDAY_HOURS;
};

// Toutes les heures de début possibles d'un jour (par quart d'heure).
export const slotsFor = (day: string) => {
  const h = hoursFor(day);
  const out: string[] = [];
  if (h) for (let m = toMin(h[0]); m <= toMin(h[1]); m += DEMO_STEP_MIN) out.push(toTime(m));
  return out;
};

// Deux démonstrations le même jour doivent être espacées d'au moins une heure.
export const overlaps = (time: string, others: string[]) => others.some((o) => Math.abs(toMin(o) - toMin(time)) < DEMO_LENGTH_MIN);

// Jours ouverts à la réservation : de demain à l'horizon, sans les dimanches.
export const bookableDays = (now: Date) => {
  const today = madaDay(now);
  return Array.from({ length: DEMO_HORIZON_DAYS }, (_, i) => addDays(today, i + 1)).filter((d) => slotsFor(d).length > 0);
};

export const isBookable = (day: string, time: string, now: Date) => /^\d{4}-\d{2}-\d{2}$/.test(day) && bookableDays(now).includes(day) && slotsFor(day).includes(time);

export const slotKey = (day: string, slot: string) => `${day} ${slot}`;
