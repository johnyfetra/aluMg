import { FinishSwatch } from "./Swatch";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { fmt, lineTotal } from "@/lib/calc";
import { lineTitle } from "@/lib/describe";
import type { T } from "@/lib/i18n";
import { FINISHES, type Line, leafMarks } from "@/lib/model";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Vue tableau des ouvrages : une ligne par ouvrage, pour comparer et chiffrer d'un coup d'œil.
export default function LinesTable({ lines, t, marks, validIds, onEdit, onDuplicate, onRemove, locked }: { lines: Line[]; t: T; marks: string[]; validIds: Set<string>; onEdit: (i: number) => void; onDuplicate: (i: number) => void; onRemove?: (i: number) => void; locked: boolean }) {
  const total = lines.reduce((s, l) => s + (validIds.has(l.id) ? lineTotal(l) : 0), 0);
  // En-tête, repère (1re colonne) et total restent visibles : le tableau défile dans les deux sens sans perdre ses repères.
  const th = "sticky top-0 z-10 whitespace-nowrap bg-surface-2 px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted";
  const num = "whitespace-nowrap px-2 py-3 text-right tabular-nums";
  return (
    <div className="card overflow-hidden !p-0">
      <div className="max-h-[70vh] overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label={t("editor.lines")}>
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead className="shadow-[0_1px_0_var(--border)]">
            <tr>
              <th scope="col" className={`${th} left-0 z-20 w-16`}>{t("editor.mark")}</th>
              <th scope="col" className={th}>{t("editor.colDesignation")}</th>
              <th scope="col" className={th}>{t("editor.colSize")}</th>
              <th scope="col" className={th}>{t("editor.leafSummary")}</th>
              <th scope="col" className={th}>{t("editor.colProfile")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.colQty")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.colUnit")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.colTotal")}</th>
              <th scope="col" className="w-px px-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l, i) => {
              const ok = validIds.has(l.id);
              const f = FINISHES.find((x) => x.id === l.finish);
              return (
                <tr key={l.id} className="hover:bg-surface-2/60">
                  <td className="sticky left-0 z-[1] whitespace-nowrap bg-surface px-2 py-3 font-semibold tabular-nums">{marks[i]}</td>
                  <td className="min-w-[8rem] px-2 py-3 font-medium">{cap(lineTitle(l, t))}{l.room && <span className="block text-xs font-normal text-muted">{l.room}</span>}</td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {ok ? `${l.width} × ${l.height} mm` : <span className="font-medium text-danger">{t("editor.invalidSize")}</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 tabular-nums text-muted">{ok && l.leaves > 1 && l.category !== "garde-corps" && l.category !== "volet" ? leafMarks(l).join(" · ") : "-"}</td>
                  <td className="whitespace-nowrap px-2 py-3">
                    <span className="inline-flex items-center gap-2" title={t(`range.${l.range}`)}>
                      <FinishSwatch id={f?.id ?? "blanc"} size={16} />
                      {f ? t(f.label) : l.finish}
                    </span>
                  </td>
                  <td className={num}>{l.qty}</td>
                  <td className={num}>{fmt(l.unit)}</td>
                  <td className={`${num} font-semibold`}>{ok ? fmt(lineTotal(l)) : "-"}</td>
                  <td className="whitespace-nowrap px-1.5 py-1.5 text-right [&>button]:ml-1">
                    <button type="button" className="btn-secondary !min-h-8 !px-2" onClick={() => onEdit(i)} aria-label={`${t("editor.edit")} ${t("editor.line")} ${i + 1}`} title={t("editor.edit")}>
                      <Pencil size={15} aria-hidden />
                    </button>
                    {!locked && (
                      <>
                        <button type="button" className="btn-secondary !min-h-8 !px-2" onClick={() => onDuplicate(i)} aria-label={`${t("editor.duplicateLine")} ${t("editor.line")} ${i + 1}`} title={t("editor.duplicateLine")}>
                          <Copy size={15} aria-hidden />
                        </button>
                        {onRemove && (
                          <button type="button" className="btn-danger !min-h-8 !px-2" onClick={() => onRemove(i)} aria-label={`${t("editor.removeLine")} ${i + 1}`} title={t("editor.removeLine")}>
                            <Trash2 size={15} aria-hidden />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-surface-2 shadow-[0_-1px_0_var(--border)]">
            <tr>
              <th scope="row" colSpan={7} className="px-2 py-3 text-right text-sm font-semibold">{t("editor.totalHt")}</th>
              <td className={`${num} font-bold text-primary`}>{fmt(total)} {t("common.currency")}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
