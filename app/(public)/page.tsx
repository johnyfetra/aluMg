"use client";
import { ArrowRight, FileSearch, HardHat, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { drawingSvg, type Drawable } from "@/lib/drawing";
import MenuisierCard from "@/components/MenuisierCard";
import { useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

const STEPS_CLIENT = [
  ["land.c1", "land.c1d", ShieldCheck],
  ["land.c2", "land.c2d", FileSearch],
  ["land.c3", "land.c3d", Sparkles],
] as const;
const STEPS_PRO = [
  ["land.p1", "land.p1d", ShieldCheck],
  ["land.p2", "land.p2d", FileSearch],
  ["land.p3", "land.p3d", HardHat],
] as const;

const demo = (over: Partial<Drawable>): Drawable => ({ category: "fenetre", opening: "coulissant", leaves: 3, shutter: "roulant", control: "manuel", guard: "barreaudage", infill: "vitree", finish: "chene-dore", glassType: "clair", thickness: "5", pattern: "none", range: "europeen", extras: [], width: 2400, height: 1200, ...over });

export default function Landing() {
  const { t } = useI18n();
  const { data } = useDirectory({ sort: "rating" });
  const top = (data ?? []).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-primary/10 via-bg to-c2/10">
        <div className="mx-auto max-w-[110rem] px-4 py-16 sm:px-8 sm:py-24 xl:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t("land.title")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">{t("land.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/menuisiers" className="btn-primary !min-h-12 !px-6 !text-base">
              {t("land.ctaFind")}
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/inscription?role=menuisier" className="btn-secondary !min-h-12 !px-6 !text-base">
              {t("land.ctaPro")}
            </Link>
          </div>
            </div>
            <div aria-hidden className="relative mx-auto hidden w-full max-w-xl lg:block">
              {[
                { o: demo({}), cls: "left-0 top-0 w-[78%] rotate-[-3deg]" },
                { o: demo({ opening: "ouvrant", leaves: 2, finish: "anthracite", width: 1400, height: 1400, glassType: "teinte-bronze" }), cls: "right-0 top-24 w-[62%] rotate-[2.5deg]" },
              ].map(({ o, cls }, i) => (
                <div key={i} className={`absolute rounded-2xl border border-line bg-white p-3 shadow-xl ${cls}`} dangerouslySetInnerHTML={{ __html: drawingSvg(o, `hero${i}`, 440, 300).svg }} />
              ))}
              <div className="invisible pb-[78%]" />
            </div>
          </div>
        </div>
      </section>

      {top.length > 0 && (
        <section className="mx-auto max-w-[110rem] px-4 py-14 sm:px-8 xl:px-10" aria-labelledby="h-top">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="h-top" className="text-2xl font-bold">
              {t("land.top")}
            </h2>
            <Link href="/menuisiers" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("land.seeAll")}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {top.map((m) => (
              <MenuisierCard key={m.slug} m={m} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-line bg-surface" aria-labelledby="h-how">
        <div className="mx-auto max-w-[110rem] px-4 py-14 sm:px-8 xl:px-10">
          <h2 id="h-how" className="mb-8 text-2xl font-bold">
            {t("land.how")}
          </h2>
          <div className="grid gap-10 lg:grid-cols-2">
            {[
              [t("land.clientSteps"), STEPS_CLIENT],
              [t("land.proSteps"), STEPS_PRO],
            ].map(([title, steps]) => (
              <div key={title as string}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">{title as string}</h3>
                <ol className="space-y-5">
                  {(steps as typeof STEPS_CLIENT).map(([k, d, Icon], i) => (
                    <li key={k} className="flex gap-4">
                      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                        <Icon size={20} />
                      </span>
                      <div>
                        <p className="font-semibold">
                          {i + 1}. {t(k)}
                        </p>
                        <p className="text-sm text-muted">{t(d)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
