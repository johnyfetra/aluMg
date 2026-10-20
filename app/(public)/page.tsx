"use client";
import { AppWindow, ArrowRight, Blinds, BadgeCheck, Check, DoorOpen, Fence, GlassWater, Hammer, Layers, MessageCircle, PanelsTopLeft, Ruler, Search, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MenuisierCard from "@/components/MenuisierCard";
import { drawingSvg, type Drawable } from "@/lib/drawing";
import { useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

const CATS = [
  ["fenetres", AppWindow],
  ["portes", DoorOpen],
  ["volets", Blinds],
  ["garde-corps", Fence],
  ["cloisons", PanelsTopLeft],
  ["vitrerie", GlassWater],
  ["renovation", Hammer],
  ["sur-mesure", Ruler],
] as const;

const STEPS: [keyof Messages, keyof Messages, typeof Search][] = [
  ["land.c1", "land.c1d", ShieldCheck],
  ["land.c2", "land.c2d", Layers],
  ["land.c3", "land.c3d", MessageCircle],
];

const demo = (over: Partial<Drawable>): Drawable => ({ category: "fenetre", opening: "coulissant", leaves: 3, shutter: "roulant", control: "manuel", guard: "barreaudage", infill: "vitree", finish: "chene-dore", glassType: "clair", thickness: "5", pattern: "none", range: "europeen", extras: [], width: 2400, height: 1200, ...over });

export default function Landing() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data = [] } = useDirectory({ sort: "rating" });
  const top = data.slice(0, 4);
  const covers = data.map((m) => m.cover).filter(Boolean).slice(0, 3);
  const jobs = data.reduce((s, m) => s + m.completed, 0);
  const projects = data.reduce((s, m) => s + m.portfolio, 0);
  const rated = data.filter((m) => m.reviews > 0);
  const avg = rated.length ? rated.reduce((s, m) => s + m.rating * m.reviews, 0) / rated.reduce((s, m) => s + m.reviews, 0) : 0;
  const stats: [string, string][] = [
    [String(data.length), t("land2.stat.joiners")],
    [String(jobs), t("land2.stat.jobs")],
    [avg ? avg.toFixed(1) : "—", t("land2.stat.rating")],
    [String(projects), t("land2.stat.projects")],
  ];
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/menuisiers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <>
      {/* ---------- héros : toujours sombre (comme la barre latérale), halos de couleur ---------- */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-(--hero-from) to-(--hero-to) text-white">
        <div aria-hidden className="absolute -left-24 top-10 -z-10 size-96 rounded-full bg-blue-500/30 blur-3xl" />
        <div aria-hidden className="absolute right-0 top-0 -z-10 size-[28rem] rounded-full bg-violet-500/25 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 left-1/3 -z-10 size-80 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="mx-auto grid max-w-[110rem] items-center gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_1fr] xl:px-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur">
              <Sparkles size={14} aria-hidden style={{ color: "#f5a524" }} />
              {t("land2.eyebrow")}
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">{t("land2.title")}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-blue-100/80">{t("land2.subtitle")}</p>

            <form onSubmit={go} role="search" className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 text-slate-900 shadow-2xl shadow-black/30 focus-within:ring-4 focus-within:ring-blue-400/50">
              <Search size={20} aria-hidden className="text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("land2.search")} placeholder={t("land2.searchPlaceholder")} className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400" />
              <button type="submit" className="btn-accent !min-h-12 !rounded-full !px-6 !text-base">
                {t("land2.search")}
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>
            <ul className="mt-5 flex flex-wrap gap-2">
              {CATS.slice(0, 4).map(([k]) => (
                <li key={k}>
                  <Link href={`/menuisiers?specialty=${k}`} className="rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-blue-50 transition hover:bg-white/15">
                    {t(`spec.${k}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-100/80">
              {(["land2.badge1", "land2.badge2", "land2.badge3"] as const).map((k) => (
                <li key={k} className="inline-flex items-center gap-2">
                  <Check size={16} aria-hidden className="text-teal-300" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>

          {/* collage : vraies réalisations des menuisiers, sinon schémas */}
          <div aria-hidden className="relative mx-auto hidden h-[30rem] w-full max-w-xl lg:block">
            {(covers.length >= 3
              ? [
                  { src: covers[0], cls: "left-0 top-6 h-64 w-72 -rotate-3" },
                  { src: covers[1], cls: "right-0 top-0 h-56 w-64 rotate-3" },
                  { src: covers[2], cls: "bottom-0 left-16 h-60 w-80 rotate-1" },
                ].map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={c.cls} src={c.src} alt="" className={`absolute rounded-2xl border-4 border-white/90 object-cover shadow-2xl shadow-black/40 ${c.cls}`} />
                ))
              : [
                  { o: demo({}), cls: "left-0 top-6 w-[78%] -rotate-3" },
                  { o: demo({ opening: "ouvrant", leaves: 2, finish: "anthracite", width: 1400, height: 1400, glassType: "teinte-bronze" }), cls: "right-0 top-32 w-[62%] rotate-3" },
                ].map(({ o, cls }, i) => <div key={i} className={`absolute rounded-2xl bg-white p-3 shadow-2xl ${cls}`} dangerouslySetInnerHTML={{ __html: drawingSvg(o, `hero${i}`, 440, 300).svg }} />))}
            <div className="absolute -right-2 bottom-24 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-2xl">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <Star size={20} fill="currentColor" />
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-none">{avg ? avg.toFixed(1) : "5.0"} / 5</span>
                <span className="text-xs text-slate-500">{t("land2.badge2")}</span>
              </span>
            </div>
            <div className="absolute -left-4 bottom-4 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-xl">
              <BadgeCheck size={16} aria-hidden />
              {t("dir.verified")}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- chiffres ---------- */}
      <section aria-label="AluMg" className="border-b border-line bg-surface">
        <dl className="mx-auto grid max-w-[110rem] grid-cols-2 gap-6 px-4 py-8 sm:px-8 md:grid-cols-4 xl:px-10">
          {stats.map(([v, l]) => (
            <div key={l} className="text-center md:text-left">
              <dd className="bg-gradient-to-r from-primary to-c4 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">{v}</dd>
              <dt className="mt-1 text-sm text-muted">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- catégories ---------- */}
      <section className="mx-auto max-w-[110rem] px-4 py-16 sm:px-8 xl:px-10" aria-labelledby="h-cat">
        <h2 id="h-cat" className="text-3xl font-extrabold tracking-tight">
          {t("land2.cat.title")}
        </h2>
        <p className="mt-2 text-muted">{t("land2.cat.sub")}</p>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATS.map(([k, Icon]) => (
            <li key={k}>
              <Link href={`/menuisiers?specialty=${k}`} className="group flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-c4/15 text-primary transition group-hover:from-primary group-hover:to-c4 group-hover:text-white">
                  <Icon size={24} aria-hidden />
                </span>
                <span className="flex items-center justify-between font-semibold">
                  {t(`spec.${k}`)}
                  <ArrowRight size={16} aria-hidden className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- menuisiers les mieux notés ---------- */}
      {top.length > 0 && (
        <section className="border-y border-line bg-surface-2/60" aria-labelledby="h-top">
          <div className="mx-auto max-w-[110rem] px-4 py-16 sm:px-8 xl:px-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <h2 id="h-top" className="text-3xl font-extrabold tracking-tight">
                {t("land.top")}
              </h2>
              <Link href="/menuisiers" className="btn-secondary !rounded-full">
                {t("land.seeAll")}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {top.map((m) => (
                <MenuisierCard key={m.slug} m={m} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- comment ça marche ---------- */}
      <section className="mx-auto max-w-[110rem] px-4 py-16 sm:px-8 xl:px-10" aria-labelledby="h-how">
        <h2 id="h-how" className="text-3xl font-extrabold tracking-tight">
          {t("land.how")}
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(([k, d, Icon], i) => (
            <li key={k} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-7">
              <span aria-hidden className="absolute -right-2 -top-6 text-9xl font-black text-primary/[0.07]">
                {i + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary">
                <Icon size={24} aria-hidden />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-primary">
                {t("land2.step")} {i + 1}
              </p>
              <h3 className="mt-1 text-xl font-bold">{t(k)}</h3>
              <p className="mt-2 text-muted">{t(d)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- bandeau menuisiers ---------- */}
      <section className="px-4 pb-16 sm:px-8 xl:px-10">
        <div className="relative mx-auto max-w-[110rem] overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-8 text-white sm:p-14">
          <div aria-hidden className="absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-100">
                <TrendingUp size={16} aria-hidden />
                {t("land.proSteps")}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("land2.pro.title")}</h2>
              <p className="mt-4 max-w-xl text-blue-100/90">{t("land2.pro.sub")}</p>
              <Link href="/inscription?role=menuisier" className="btn-accent mt-7 !min-h-12 !px-6 !text-base">
                {t("land2.pro.cta")}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <ul className="space-y-3">
              {(["land2.pro.f1", "land2.pro.f2", "land2.pro.f3", "land2.pro.f4"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-emerald-950">
                    <Check size={14} aria-hidden strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- appel final ---------- */}
      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("land2.final.title")}</h2>
        <p className="mt-3 text-muted">{t("land2.final.sub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/menuisiers" className="btn-primary !min-h-12 !rounded-full !px-7 !text-base">
            {t("land.ctaFind")}
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/inscription?role=client" className="btn-secondary !min-h-12 !rounded-full !px-7 !text-base">
            {t("pub.signup")}
          </Link>
        </div>
      </section>
    </>
  );
}
