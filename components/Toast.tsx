"use client";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Notifications éphémères, une par action (côté client comme côté menuisier) : titre précis, détail, lien d'action facultatif.
// Les erreurs restent plus longtemps et sont annoncées en priorité aux lecteurs d'écran ; le tout respecte « réduire les animations ».
export type ToastKind = "success" | "error" | "info" | "warning";
export type ToastInput = { title: string; text?: string; action?: { label: string; href: string } };
type Item = ToastInput & { id: number; kind: ToastKind };
type Api = Record<ToastKind, (title: string, text?: string, action?: ToastInput["action"]) => void>;

const STYLE: Record<ToastKind, { Icon: typeof Info; bar: string; icon: string; ms: number }> = {
  success: { Icon: CheckCircle2, bar: "bg-good", icon: "text-ok", ms: 4500 },
  error: { Icon: CircleAlert, bar: "bg-critical", icon: "text-danger", ms: 8000 },
  info: { Icon: Info, bar: "bg-info", icon: "text-info", ms: 6000 },
  warning: { Icon: TriangleAlert, bar: "bg-warn", icon: "text-warn", ms: 7000 },
};
const MAX = 3;

const Ctx = createContext<Api>({ success() {}, error() {}, info() {}, warning() {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((cur) => cur.filter((x) => x.id !== id));
  }, []);
  const push = useCallback(
    (kind: ToastKind, title: string, text?: string, action?: ToastInput["action"]) => {
      const id = ++next.current;
      setItems((cur) => [...cur.filter((x) => !(x.title === title && x.text === text)), { id, kind, title, text, action }].slice(-MAX));
      timers.current.set(id, setTimeout(() => dismiss(id), STYLE[kind].ms));
    },
    [dismiss],
  );
  useEffect(() => { const m = timers.current; return () => m.forEach(clearTimeout); }, []);
  const api = useMemo<Api>(() => ({ success: (...a) => push("success", ...a), error: (...a) => push("error", ...a), info: (...a) => push("info", ...a), warning: (...a) => push("warning", ...a) }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div role="region" aria-label={t("toast.region")} className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:left-auto sm:right-0 sm:items-end sm:px-4 sm:pt-4">
        {items.map(({ id, kind, title, text, action }) => {
          const { Icon, bar, icon } = STYLE[kind];
          return (
            <div key={id} role={kind === "error" ? "alert" : "status"} className="toast-in pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface py-3 pl-5 pr-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:w-96">
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />
              <Icon size={20} aria-hidden className={`mt-0.5 shrink-0 ${icon}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{title}</p>
                {text && <p className="mt-0.5 break-words text-[13px] leading-snug text-muted">{text}</p>}
                {action && <Link href={action.href} onClick={() => dismiss(id)} className="mt-1.5 inline-block text-[13px] font-semibold text-primary hover:underline">{action.label}</Link>}
              </div>
              <button type="button" onClick={() => dismiss(id)} aria-label={t("toast.close")} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
                <X size={15} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
