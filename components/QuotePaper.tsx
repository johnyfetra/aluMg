"use client";
import { billedArea, fmt, lineTotal } from "@/lib/calc";
import { lineDetails, lineTitle } from "@/lib/describe";
import { drawingSvg } from "@/lib/drawing";
import { DATE_LOCALE, type T } from "@/lib/i18n";
import { DOC_PRESETS, type Issuer, type Quote } from "@/lib/model";
import { serviceTotal, totals } from "@/lib/totals";
import { amountInWords } from "@/lib/words";

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
  // personnalisation cadrée : seule la mise en page varie, jamais les mentions (voir lib/docStyle.ts)
  const st = { ...DOC_PRESETS.classique, ...(q.docStyle ?? s.docStyle) };
  const compact = st.density === "compact";
  const cell = compact ? "px-3 py-2" : "px-3 py-4";
  const th = `px-3 ${compact ? "py-2" : "py-2.5"}`;
  const boxed = st.table === "boxed";
  const headFill = st.table !== "lines";

  const logo = s.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={s.logo} alt="" className={`${st.header === "center" ? "mx-auto" : ""} h-16 max-w-32 object-contain`} />
  ) : null;
  const identity = (withName: boolean) => (
    <div className="min-w-0 space-y-0.5">
      {withName && <p className="text-xl font-bold leading-tight">{s.company || "—"}</p>}
      {s.address && <p className={small}>{s.address}</p>}
      {(s.phone || s.email) && <p className={small}>{[s.phone, s.email].filter(Boolean).join("  ·  ")}</p>}
      {s.website && <p className={small}>{s.website}</p>}
      {(s.nif || s.stat) && <p className={small}>{[s.nif && `NIF ${s.nif}`, s.stat && `STAT ${s.stat}`].filter(Boolean).join("  ·  ")}</p>}
    </div>
  );
  const meta = (
    <dl className={`mt-3 inline-grid gap-x-6 gap-y-1 rounded-lg bg-slate-50 px-4 py-3 text-left text-sm ${st.header === "center" ? "grid-cols-[auto_auto_auto_auto_auto_auto]" : "grid-cols-[auto_auto]"}`}>
      <dt className="text-slate-500">{t("pdf.number")}</dt>
      <dd className="text-right font-bold tabular-nums">{q.number}</dd>
      <dt className="text-slate-500">{t("pdf.date")}</dt>
      <dd className="text-right font-semibold">{d(date)}</dd>
      <dt className="text-slate-500">{t("pdf.validUntil")}</dt>
      <dd className="text-right font-semibold">{d(until)}</dd>
    </dl>
  );
  const title = <p className="text-3xl font-bold uppercase tracking-wide" style={{ color: accent }}>{t("pdf.quote")}</p>;

  return (
    <article id="quote-paper" aria-label={`${t("pdf.quote")} ${q.number}`} className="mx-auto w-full max-w-[56rem] overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg ring-1 ring-black/5 print:max-w-none print:rounded-none print:shadow-none print:ring-0" style={st.font === "serif" ? { fontFamily: 'Georgia, "Times New Roman", serif' } : undefined}>
      {st.header === "banner" ? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 text-white sm:px-10" style={{ background: accent }}>
          <div className="flex items-center gap-4">
            {s.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt="" className="h-14 max-w-28 rounded bg-white/95 object-contain p-1" />
            )}
            <p className="text-2xl font-bold leading-tight">{s.company || "—"}</p>
          </div>
          <p className="text-2xl font-bold uppercase tracking-wide">{t("pdf.quote")}</p>
        </div>
      ) : (
        <div className="h-2" style={{ background: accent }} />
      )}
      <div className="space-y-8 p-6 sm:p-10">
        {/* entête */}
        {st.header === "split" && (
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 items-start gap-4">
              {logo}
              {identity(true)}
            </div>
            <div className="text-right">
              {title}
              {meta}
            </div>
          </header>
        )}
        {st.header === "center" && (
          <header className="flex flex-col items-center gap-2 text-center">
            {logo}
            {identity(true)}
            <div className="mt-2 w-full border-t border-slate-200 pt-4">
              {title}
              {meta}
            </div>
          </header>
        )}
        {st.header === "banner" && (
          <header className="flex flex-wrap items-start justify-between gap-6">
            {identity(false)}
            <div className="text-right">{meta}</div>
          </header>
        )}

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
                <tr className={`text-left text-xs font-semibold uppercase tracking-wide ${headFill ? "text-white" : "border-b-2 text-slate-700"}`} style={headFill ? { background: accent } : { borderColor: accent }}>
                  <th className={th}>{t("pdf.designation")}</th>
                  <th className={`${th} text-center`}>{t("pdf.qty")}</th>
                  <th className={`${th} text-right`}>{t("pdf.unit")}</th>
                  <th className={`${th} text-right`}>{t("pdf.total")}</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l, i) => {
                  const sk = drawingSvg(l, `pv${i}`, 200, 150);
                  return (
                    <tr key={l.id} className={`break-inside-avoid border-b border-slate-200 align-top ${st.table === "zebra" ? "odd:bg-white even:bg-slate-50/60" : ""} ${boxed ? "[&>td]:border [&>td]:border-slate-300" : ""}`}>
                      <td className={cell}>
                        <div className="flex gap-4">
                          {st.drawings && <div aria-hidden className={`shrink-0 [&>svg]:h-full [&>svg]:w-full ${compact ? "h-16 w-24" : "h-24 w-32"}`} dangerouslySetInnerHTML={{ __html: sk.svg }} />}
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold">{cap(lineTitle(l, t))}</p>
                            {l.room && <p className="text-sm font-semibold text-slate-700">{l.room}</p>}
                            <p className={small}>{l.width} × {l.height} {t("common.mm")}  ·  {t("pdf.area")} {fmt(Math.round(billedArea(l, s.minArea) * 100) / 100)} m²</p>
                            {lineDetails(l, t).map((x) => (
                              <p key={x} className={small}>{x}</p>
                            ))}
                            {l.note && <p className={`${small} italic`}>{l.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={`${cell} text-center tabular-nums`}>{l.qty}</td>
                      <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>{fmt(l.unit)}</td>
                      <td className={`${cell} whitespace-nowrap text-right font-bold tabular-nums`}>{fmt(lineTotal(l))}</td>
                    </tr>
                  );
                })}
                {(q.services ?? []).map((v) => (
                  <tr key={v.id} className="break-inside-avoid border-b border-slate-200 align-top">
                    <td className="px-3 py-2.5 font-semibold">{v.label || t(`svc.${v.kind}`)}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{v.qty}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmt(v.price)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">{fmt(serviceTotal(v))}</td>
                  </tr>
                ))}
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
              {(q.warranty ?? 0) > 0 && <li>{t("svc.warrantyLine")} : <strong className="text-slate-900">{q.warranty} {t("svc.months")}</strong></li>}
              {s.paymentInfo && <li>{t("pdf.payment")} : {s.paymentInfo}</li>}
              {q.notes && <li>{t("pdf.notes")} : {q.notes}</li>}
              {locale === "fr" && <li className="pt-1 italic">{t("pdf.words").replace("{w}", amountInWords(ttc))}</li>}
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
        {st.footer && <p className="whitespace-pre-line border-t border-slate-200 pt-4 text-center text-xs text-slate-500">{st.footer}</p>}
      </div>
    </article>
  );
}
