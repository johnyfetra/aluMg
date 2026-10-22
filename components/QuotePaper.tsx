"use client";
import { billedArea, fmt, lineTotal } from "@/lib/calc";
import { lineDetails, lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { DATE_LOCALE, type T } from "@/lib/i18n";
import type { Issuer, Quote } from "@/lib/model";
import { totals } from "@/lib/totals";

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

// La « feuille » du devis, telle qu'elle sera remise au client : entête de l'entreprise, client, ouvrages détaillés, totaux, conditions, signatures.
// Elle reste blanche quel que soit le thème, pour ressembler au PDF ; l'impression ne garde que la feuille.
export default function QuotePaper({ q, s, t, locale }: { q: Quote; s: Issuer; t: T; locale: keyof typeof DATE_LOCALE }) {
  const { gross, discount, ht, tva, ttc } = totals(q);
  const date = new Date(q.date);
  const until = new Date(date.getTime() + q.terms.validityDays * 86_400_000);
  const d = (x: Date) => x.toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" });
  const deposit = Math.round((ttc * q.terms.deposit) / 100);
  const accent = s.accent || "#1d4ed8";
  const cur = t("common.currency");
  const small = "text-xs text-slate-500";
  const label = "text-[10px] font-bold uppercase tracking-wider";

  return (
    <article id="quote-paper" aria-label={`${t("pdf.quote")} ${q.number}`} className="mx-auto w-full max-w-[56rem] overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg ring-1 ring-black/5 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
      <div className="h-2" style={{ background: accent }} />
      <div className="space-y-8 p-6 sm:p-10">
        {/* entête */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            {s.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt="" className="h-16 max-w-32 object-contain" />
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="text-xl font-bold leading-tight">{s.company || "—"}</p>
              {s.address && <p className={small}>{s.address}</p>}
              {(s.phone || s.email) && <p className={small}>{[s.phone, s.email].filter(Boolean).join("  ·  ")}</p>}
              {s.website && <p className={small}>{s.website}</p>}
              {(s.nif || s.stat) && <p className={small}>{[s.nif && `NIF ${s.nif}`, s.stat && `STAT ${s.stat}`].filter(Boolean).join("  ·  ")}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold uppercase tracking-wide" style={{ color: accent }}>{t("pdf.quote")}</p>
            <dl className="mt-3 inline-grid grid-cols-[auto_auto] gap-x-6 gap-y-1 rounded-lg bg-slate-50 px-4 py-3 text-left text-sm">
              <dt className="text-slate-500">{t("pdf.number")}</dt>
              <dd className="text-right font-bold tabular-nums">{q.number}</dd>
              <dt className="text-slate-500">{t("pdf.date")}</dt>
              <dd className="text-right font-semibold">{d(date)}</dd>
              <dt className="text-slate-500">{t("pdf.validUntil")}</dt>
              <dd className="text-right font-semibold">{d(until)}</dd>
            </dl>
          </div>
        </header>

        {/* client et projet */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className={label} style={{ color: accent }}>{t("pdf.client")}</p>
            <p className="mt-1 text-base font-bold">{q.client.name || "—"}</p>
            {q.client.phone && <p className={small}>{q.client.phone}</p>}
            {q.client.address && <p className={small}>{q.client.address}</p>}
          </div>
          {(q.project || q.delay) && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className={label} style={{ color: accent }}>{t("pdf.project")}</p>
              {q.project && <p className="mt-1 text-base font-semibold">{q.project}</p>}
              {q.delay && <p className={small}>{t("pdf.delay")} : {q.delay}</p>}
            </div>
          )}
        </section>

        {/* ouvrages */}
        <section aria-label={t("editor.lines")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-white" style={{ background: accent }}>
                  <th className="rounded-tl-md px-3 py-2.5">{t("pdf.designation")}</th>
                  <th className="px-3 py-2.5 text-center">{t("pdf.qty")}</th>
                  <th className="px-3 py-2.5 text-right">{t("pdf.unit")}</th>
                  <th className="rounded-tr-md px-3 py-2.5 text-right">{t("pdf.total")}</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l, i) => {
                  const sk = drawingSvg(l, `pv${i}`, 200, 150);
                  return (
                    <tr key={l.id} className="break-inside-avoid border-b border-slate-200 align-top odd:bg-white even:bg-slate-50/60">
                      <td className="px-3 py-4">
                        <div className="flex gap-4">
                          <div aria-hidden className="h-24 w-32 shrink-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: sk.svg }} />
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold">{cap(lineTitle(l, t))}</p>
                            <p className={small}>{l.width} × {l.height} {t("common.mm")}  ·  {t("pdf.area")} {fmt(Math.round(billedArea(l, s.minArea) * 100) / 100)} m²</p>
                            {lineDetails(l, t).map((x) => (
                              <p key={x} className={small}>{x}</p>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center tabular-nums">{l.qty}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{fmt(l.unit)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-right font-bold tabular-nums">{fmt(lineTotal(l))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* totaux et conditions */}
        <section className="grid gap-8 break-inside-avoid sm:grid-cols-[1fr_20rem]">
          <div className="space-y-1.5">
            <p className={label} style={{ color: accent }}>{t("pdf.conditions")}</p>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>{t("pdf.deposit")} : <strong className="text-slate-900">{q.terms.deposit} %</strong> ({fmt(deposit)} {cur})</li>
              <li>{t("pdf.balance")} : <strong className="text-slate-900">{fmt(ttc - deposit)} {cur}</strong></li>
              {s.paymentInfo && <li>{t("pdf.payment")} : {s.paymentInfo}</li>}
              {q.notes && <li>{t("pdf.notes")} : {q.notes}</li>}
            </ul>
          </div>
          <dl className="space-y-1.5 text-sm">
            {discount > 0 && (
              <>
                <div className="flex justify-between"><dt className="text-slate-500">{t("pdf.subtotal")}</dt><dd className="tabular-nums">{fmt(gross)} {cur}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">{t("pdf.discount")} {q.discount} %</dt><dd className="tabular-nums">− {fmt(discount)} {cur}</dd></div>
              </>
            )}
            <div className="flex justify-between"><dt className="text-slate-500">{t("pdf.totalHt")}</dt><dd className="font-semibold tabular-nums">{fmt(ht)} {cur}</dd></div>
            {q.terms.tva > 0 && <div className="flex justify-between"><dt className="text-slate-500">{t("pdf.totalTva")} {q.terms.tva} %</dt><dd className="tabular-nums">{fmt(tva)} {cur}</dd></div>}
            <div className="mt-2 flex items-baseline justify-between rounded-lg px-4 py-3 text-white" style={{ background: accent }}>
              <dt className="font-semibold">{t("pdf.totalTtc")}</dt>
              <dd className="text-xl font-bold tabular-nums">{fmt(ttc)} {cur}</dd>
            </div>
          </dl>
        </section>

        {/* signatures */}
        <section className="grid gap-4 break-inside-avoid sm:grid-cols-2">
          {([[t("pdf.signSupplier"), true], [t("pdf.signClient"), false]] as const).map(([title, mine]) => (
            <div key={title} className="min-h-32 rounded-lg border border-slate-300 p-4">
              <p className="text-xs font-bold">{title}</p>
              {mine && s.signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.signature} alt="" className="mt-2 h-14 object-contain" />
              )}
              {mine && s.signer && <p className="mt-2 text-xs text-slate-600">{s.signer}</p>}
            </div>
          ))}
        </section>
      </div>
    </article>
  );
}
