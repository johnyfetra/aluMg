"use client";
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, MapPin, Phone, Video } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Field } from "../ui";
import { ApiError, fetcher, request } from "@/lib/client";
import { DEMO_STEP_MIN, type DemoMode, bookableDays, hoursFor, overlaps, slotsFor } from "@/lib/booking";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { isPhone } from "@/lib/phone";
import Reveal from "./Reveal";

const ERRORS = { slot_taken: "demoErrTaken", already_booked: "demoErrBooked", slot_unavailable: "demoErrUnavailable", too_many_requests: "demoErrTooMany", invalid_body: "demoErrInvalid" } as const;

// Lundi = 0 : la grille du mois commence le lundi, comme les calendriers malgaches et français.
const mondayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
const monthOf = (day: string) => day.slice(0, 7);
const daysInMonth = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

// Rendez-vous de démonstration sur place : calendrier aux couleurs du thème, créneau, puis nom, téléphone et lieu précis.
export default function DemoBooking() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const { data, mutate } = useSWR<{ taken: string[] }>("/api/demo-bookings", fetcher, { revalidateOnFocus: false });
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<DemoMode>("onsite");
  const [form, setForm] = useState({ name: "", phone: "", place: "", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // calculé seulement côté navigateur (les créneaux arrivent après le chargement) : pas d'écart entre serveur et navigateur
  const open = data ? bookableDays(new Date()) : [];
  const months = [...new Set(open.map(monthOf))];
  const shown = months[Math.min(month, months.length - 1)];
  const taken = new Set(data?.taken);
  const takenOn = (d: string) => [...taken].filter((k) => k.startsWith(`${d} `)).map((k) => k.slice(11));
  const free = (d: string) => slotsFor(d).filter((s) => !overlaps(s, takenOn(d)));
  const halfHours = (d: string) => free(d).filter((s) => s.endsWith(":00") || s.endsWith(":30")); // heures libres proposées ; le champ accepte aussi les quarts d'heure
  const slotBad = !!day && !!slot && !free(day).includes(slot);
  const dateFmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString(DATE_LOCALE[locale], { timeZone: "UTC", ...o });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const phoneBad = form.phone.trim() !== "" && !isPhone(form.phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day || !slot || slotBad || phoneBad) return;
    setBusy(true);
    setError("");
    try {
      await request("POST", "/api/demo-bookings", { ...form, mode, day, slot });
      setDone(true);
    } catch (err) {
      const key = err instanceof ApiError ? ERRORS[err.code as keyof typeof ERRORS] : undefined;
      setError(c[key ?? "demoErrGeneric"]);
      if (err instanceof ApiError && err.code === "slot_taken") {
        setSlot(null);
        void mutate();
      }
    } finally {
      setBusy(false);
    }
  };

  const weekdays = Array.from({ length: 7 }, (_, i) => dateFmt(`2026-11-${String(9 + i).padStart(2, "0")}`, { weekday: "short" })); // 9 nov. 2026 = lundi

  return (
    <section id="demo" className="cv scroll-mt-28 border-t border-line" aria-labelledby="demo-title">
      <div className="public-container grid gap-10 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <Reveal>
          <p className="eyebrow">{c.demoEyebrow}</p>
          <h2 id="demo-title" className="mt-4 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">{c.demoTitle}</h2>
          <p className="mt-5 max-w-lg leading-7 text-muted">{c.demoIntro}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {([[Clock, c.demoPoint1], [MapPin, c.demoPoint2], [Phone, c.demoPoint3]] as const).map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-3"><Icon size={17} aria-hidden className="mt-0.5 shrink-0 text-primary" />{text}</li>
            ))}
          </ul>
        </Reveal>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
          {done && day && slot ? (
            <div role="status" className="space-y-4 py-6 text-center">
              <CalendarCheck size={40} aria-hidden className="mx-auto text-ok" />
              <h3 className="text-xl font-semibold">{c.demoDoneTitle}</h3>
              <p className="font-medium">{dateFmt(day, { weekday: "long", day: "numeric", month: "long" })} · {slot}</p>
              <p className="text-sm text-muted">{(mode === "online" ? c.demoDoneOnline : c.demoDoneText).replace("{phone}", form.phone)}</p>
            </div>
          ) : !data || !shown ? (
            <p className="py-16 text-center text-sm text-muted">{c.demoLoading}</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div role="radiogroup" aria-label={c.demoMode} className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-2/40 p-1">
                {([["onsite", MapPin, c.demoOnsite], ["online", Video, c.demoOnline]] as const).map(([id, Icon, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${mode === id ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                    <Icon size={16} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30" aria-label={c.demoPrev} disabled={month === 0} onClick={() => setMonth(0)}><ChevronLeft size={18} aria-hidden /></button>
                  <p className="font-semibold capitalize" aria-live="polite">{dateFmt(`${shown}-01`, { month: "long", year: "numeric" })}</p>
                  <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30" aria-label={c.demoNext} disabled={month >= months.length - 1} onClick={() => setMonth(1)}><ChevronRight size={18} aria-hidden /></button>
                </div>
                <div role="group" aria-label={c.demoPickDay} className="grid grid-cols-7 gap-1 text-center">
                  {weekdays.map((w) => <span key={w} aria-hidden className="pb-1 text-[11px] font-semibold uppercase text-muted">{w}</span>)}
                  {Array.from({ length: mondayIndex(`${shown}-01`) }, (_, i) => <span key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth(shown) }, (_, i) => {
                    const d = `${shown}-${String(i + 1).padStart(2, "0")}`;
                    const ok = open.includes(d) && free(d).length > 0;
                    const on = d === day;
                    return (
                      <button key={d} type="button" disabled={!ok} aria-pressed={on} aria-label={dateFmt(d, { weekday: "long", day: "numeric", month: "long" })} onClick={() => { setDay(d); setSlot(null); setError(""); }}
                        className={`h-10 rounded-xl text-sm font-medium tabular-nums transition-colors ${on ? "bg-primary text-on-primary shadow-sm" : ok ? "bg-surface-2/60 hover:bg-accent/20" : "text-muted/40"}`}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {day && (() => {
                const [min, max] = hoursFor(day) ?? ["08:00", "16:00"];
                return (
                  <div className="space-y-2">
                    <label htmlFor="demo-time" className="block text-sm font-semibold">{c.demoPickSlot} · <span className="font-normal capitalize text-muted">{dateFmt(day, { weekday: "long", day: "numeric", month: "long" })}</span></label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input id="demo-time" type="time" className="input !w-36 tabular-nums" required min={min} max={max} step={DEMO_STEP_MIN * 60} value={slot ?? ""} onChange={(e) => setSlot(e.target.value || null)} aria-invalid={slotBad || undefined} aria-describedby="demo-time-hint" />
                      {halfHours(day).map((s) => (
                        <button key={s} type="button" aria-pressed={slot === s} onClick={() => setSlot(s)}
                          className={`min-h-10 rounded-xl border px-3 text-sm font-semibold tabular-nums transition-colors ${slot === s ? "border-primary bg-primary text-on-primary" : "border-line hover:border-accent hover:bg-accent/10"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p id="demo-time-hint" className={`text-xs ${slotBad ? "font-medium text-danger" : "text-muted"}`}>
                      {slotBad ? c.demoTimeBad : c.demoTimeHint.replace("{min}", min).replace("{max}", max)}
                      {takenOn(day).length > 0 && ` ${c.demoTaken} ${takenOn(day).sort().join(", ")}.`}
                    </p>
                  </div>
                );
              })()}

              {slot && !slotBad && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field htmlFor="demo-name" label={c.demoName} required>
                    <input id="demo-name" className="input" required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={set("name")} />
                  </Field>
                  <Field htmlFor="demo-phone" label={c.demoPhone} hint={c.demoPhoneHint} required error={phoneBad ? c.demoPhoneBad : undefined}>
                    <input id="demo-phone" className="input" type="tel" required inputMode="tel" autoComplete="tel" maxLength={40} placeholder="034 00 000 00" value={form.phone} onChange={set("phone")} aria-invalid={phoneBad || undefined} />
                  </Field>
                  {mode === "onsite" && <div className="sm:col-span-2">
                    <Field htmlFor="demo-place" label={c.demoPlace} hint={c.demoPlaceHint} required>
                      <input id="demo-place" className="input" required minLength={5} maxLength={200} autoComplete="street-address" value={form.place} onChange={set("place")} />
                    </Field>
                  </div>}
                  <div className="sm:col-span-2">
                    <Field htmlFor="demo-note" label={c.demoNote}>
                      <textarea id="demo-note" className="input min-h-20" maxLength={500} value={form.note} onChange={set("note")} />
                    </Field>
                  </div>
                </div>
              )}

              {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full !min-h-12" disabled={!slot || slotBad || busy || phoneBad}>
                <CalendarCheck size={18} aria-hidden />
                {busy ? c.demoSending : slot && day ? `${mode === "online" ? c.demoSubmitOnline : c.demoSubmit} · ${dateFmt(day, { day: "numeric", month: "short" })} ${slot}` : c.demoSubmit}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
