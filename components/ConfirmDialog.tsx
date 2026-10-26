"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

// Boîte de confirmation de l'app (remplace window.confirm) : <dialog> natif (focus piégé, Échap = annuler), aux couleurs du thème, adaptée au mobile.
type Options = { message: string; title?: string; confirmLabel?: string; tone?: "danger" | "primary" };
type Ask = (o: Options | string) => Promise<boolean>;
const Ctx = createContext<Ask>(async () => false);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const resolve = useRef<((ok: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);

  const ask = useCallback<Ask>((o) => new Promise<boolean>((res) => {
    resolve.current?.(false);
    resolve.current = res;
    setOpts(typeof o === "string" ? { message: o } : o);
  }), []);
  useEffect(() => {
    if (opts && !dialog.current?.open) dialog.current?.showModal();
  }, [opts]);

  const done = (ok: boolean) => {
    resolve.current?.(ok);
    resolve.current = null;
    dialog.current?.close();
    setOpts(null);
  };
  const danger = opts?.tone === "danger";
  const Icon = danger ? AlertTriangle : CheckCircle2;

  return (
    <Ctx.Provider value={ask}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="cf-title"
        aria-describedby="cf-msg"
        onCancel={(e) => { e.preventDefault(); done(false); }}
        onClick={(e) => e.target === dialog.current && done(false)}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
      >
        {opts && (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ${danger ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary"}`}>
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="cf-title" className="text-base font-semibold">{opts.title ?? t(danger ? "dlg.titleDanger" : "dlg.title")}</h2>
                <p id="cf-msg" className="mt-1 text-sm leading-relaxed text-muted">{opts.message}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => done(false)}>{t("dlg.cancel")}</button>
              <button type="button" autoFocus className={danger ? "btn-primary !bg-danger !text-white hover:!brightness-110" : "btn-primary"} onClick={() => done(true)}>
                {opts.confirmLabel ?? t("dlg.confirm")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}
