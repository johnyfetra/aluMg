import { Copy, Pencil, Trash2 } from "lucide-react";
import { fmt, lineTotal } from "@/lib/calc";
import { lineTitle } from "@/lib/describe";
import type { T } from "@/lib/i18n";
import { FINISHES, type Line } from "@/lib/model";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Vue tableau des ouvrages : une ligne par ouvrage, pour comparer et chiffrer d'un coup d'œil.
export default function LinesTable({ lines, t, validIds, onEdit, onDuplicate, onRemove, locked }: { lines: Line[]; t: T; validIds: Set<string>; onEdit: (i: number) => void; onDuplicate: (i: number) => void; onRemove?: (i: number) => void; locked: boolean }) {
  const total = lines.reduce((s, l) => s + (validIds.has(l.id) ? lineTotal(l) : 0), 0);
  const th = "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted";
  const num = "whitespace-nowrap px-3 py-3 text-right tabular-nums";
  return (
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              <th scope="col" className={`${th} w-10`}>#</th>
              <th scope="col" className={th}>{t("editor.colDesignation")}</th>
              <th scope="col" className={th}>{t("editor.colSize")}</th>
              <th scope="col" className={th}>{t("editor.colProfile")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.qty")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.unit")}</th>
              <th scope="col" className={`${th} text-right`}>{t("editor.lineTotal")}</th>
              <th scope="col" className="w-px px-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l, i) => {
              const ok = validIds.has(l.id);
              const f = FINISHES.find((x) => x.id === l.finish);
              return (
                <tr key={l.id} className="hover:bg-surface-2/60">
                  <td className="px-3 py-3 text-muted tabular-nums">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{cap(lineTitle(l, t))}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {ok ? `${l.width} × ${l.height} mm` : <span className="font-medium text-danger">{t("editor.invalidSize")}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="size-3.5 rounded-full border border-line" style={{ background: f?.hex }} />
                      {t(`range.${l.range}`)} · {f ? t(f.label) : l.finish}
                    </span>
                  </td>
                  <td className={num}>{l.qty}</td>
                  <td className={num}>{fmt(l.unit)}</td>
                  <td className={`${num} font-semibold`}>{ok ? fmt(lineTotal(l)) : "—"}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <button type="button" className="btn-secondary !min-h-9 !px-2.5" onClick={() => onEdit(i)} aria-label={`${t("editor.edit")} ${t("editor.line")} ${i + 1}`} title={t("editor.edit")}>
                      <Pencil size={15} aria-hidden />
                    </button>{" "}
                    {!locked && (
                      <>
                        <button type="button" className="btn-secondary !min-h-9 !px-2.5" onClick={() => onDuplicate(i)} aria-label={`${t("editor.duplicateLine")} ${t("editor.line")} ${i + 1}`} title={t("editor.duplicateLine")}>
                          <Copy size={15} aria-hidden />
                        </button>{" "}
                        {onRemove && (
                          <button type="button" className="btn-danger !min-h-9 !px-2.5" onClick={() => onRemove(i)} aria-label={`${t("editor.removeLine")} ${i + 1}`} title={t("editor.removeLine")}>
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
          <tfoot className="border-t border-line bg-surface-2">
            <tr>
              <th scope="row" colSpan={6} className="px-3 py-3 text-right text-sm font-semibold">{t("editor.totalHt")}</th>
              <td className={`${num} font-bold text-primary`}>{fmt(total)} {t("common.currency")}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
