"use client";
import { Bell, CheckCircle2, FileText, Handshake, Hammer, MessageCircle, PencilLine, Star, XCircle } from "lucide-react";
import IconButton from "./IconButton";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import CountBadge from "./CountBadge";
import { useToast } from "./Toast";
import { notificationHref, request, useNotifications, useSession } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

// Cloche de l'en-tête : événements des devis qui concernent l'utilisateur. Un clic ouvre le devis (et l'ouvrage visé) et marque lu.
// « taken » porte un JSON {by, n, whole, closed} : le texte est composé ici pour suivre la langue de l'interface
function takenText(raw: string, t: (k: keyof Messages) => string) {
  try {
    const d = JSON.parse(raw) as { by: string; n: number; whole: boolean; closed: boolean };
    return `${d.by} · ${t(d.closed ? "taken.closed" : d.whole ? "taken.whole" : "taken.some")}${d.closed || d.whole ? "" : ` (${d.n})`}`;
  } catch {
    return "";
  }
}

// Pastille colorée par type d'événement, comme une légende : on reconnaît la nouvelle avant de la lire.
const KIND: Record<string, [typeof Bell, string]> = {
  send: [FileText, "var(--c1)"], request: [FileText, "var(--c1)"], revised: [PencilLine, "var(--c3)"],
  accept: [CheckCircle2, "var(--c4)"], reject: [XCircle, "var(--critical)"], decline: [XCircle, "var(--critical)"],
  request_change: [PencilLine, "var(--c2)"], review_line: [PencilLine, "var(--c2)"], approve_all: [CheckCircle2, "var(--c4)"],
  line_comment: [MessageCircle, "var(--info)"], progress: [Hammer, "var(--c2)"], review: [Star, "var(--c2)"], message: [MessageCircle, "var(--info)"], taken: [Handshake, "var(--c3)"],
};

export default function NotificationBell() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: me } = useSession();
  const { data, error: loadError, isLoading, mutate: reload } = useNotifications();
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  // une notification arrivée pendant la session s'affiche en toast ; celles déjà là au chargement restent dans la cloche
  useEffect(() => {
    if (!data || !me) return;
    const known = seen.current;
    seen.current = new Set(data.items.map((n) => n.id));
    if (!known) return;
    for (const n of data.items.filter((x) => !x.read && !known.has(x.id)).slice(0, 2)) {
      toast.info(t(`notif.${n.kind}` as keyof Messages), [n.number, n.project].filter(Boolean).join(" · "), { label: t("toast.view"), href: notificationHref(me.role, n) });
    }
  }, [data, me]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) {
        setOpen(false);
        if (e instanceof KeyboardEvent) trigger.current?.focus(); // le focus revient sur la cloche
      }
    };
    panel.current?.focus(); // le focus entre dans le panneau à l'ouverture
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!me || (me.role !== "client" && me.role !== "menuisier")) return null;
  const go = async (n: NonNullable<typeof data>["items"][number]) => {
    if (busy) return;
    setError(false);
    setBusy(true);
    try {
      if (!n.read) await request("POST", "/api/notifications", { id: n.id }).then(() => mutate("/api/notifications"));
      setOpen(false);
      router.push(notificationHref(me.role, n));
    } catch { setError(true); }
    finally { setBusy(false); }
  };
  const readAll = async () => {
    setBusy(true);
    setError(false);
    try {
      await request("POST", "/api/notifications", {});
      await mutate("/api/notifications");
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  return (
    <div ref={box} className="relative">
      <IconButton ref={trigger} data-tour="bell" label={`${t("notif.open")}${unread ? ` (${unread})` : ""}`} tip={false} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} aria-hidden className={unread ? "bell-ring" : undefined} />
        <CountBadge n={unread} className="absolute -right-1 -top-1" />
      </IconButton>
      {open && (
        <div ref={panel} tabIndex={-1} role="dialog" aria-label={t("notif.title")} className="outline-none fixed inset-x-3 top-[5.25rem] z-50 overflow-hidden rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-overlay) sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[25rem]">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">{t("notif.title")}{unread > 0 && <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-bold text-primary">{unread}</span>}</h2>
            {unread > 0 && (
              <button type="button" disabled={busy} onClick={readAll} className="min-h-9 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                {t("notif.markAll")}
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-4 py-3 text-sm text-danger">{t("common.error")}</p>}
          {loadError ? <div role="alert" className="space-y-3 p-4"><p className="text-sm text-danger">{t("common.error")}</p><button type="button" className="btn-secondary" onClick={() => { void reload(); }}>{t("ui.retry")}</button></div> : isLoading ? <p role="status" className="p-8 text-center text-sm text-muted">{t("common.loading")}</p> : (data?.items.length ?? 0) === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{t("notif.empty")}</p>
          ) : (
            <ul className="max-h-[min(28rem,65dvh)] space-y-1 overflow-y-auto p-2">
              {data!.items.map((n) => {
                const [Icon, color] = KIND[n.kind] ?? [Bell, "var(--c1)"];
                return (
                <li key={n.id}>
                  <button type="button" disabled={busy} onClick={() => go(n)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-50 ${n.read ? "" : "bg-primary/6"}`}>
                    <span aria-hidden className="relative grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }}>
                      <Icon size={18} />
                      {!n.read && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-surface" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{t(`notif.${n.kind}` as keyof Messages)}</span>
                      <span className="block truncate text-xs text-muted">{n.number}{n.project ? ` · ${n.project}` : ""}</span>
                      {n.message && <span className="mt-0.5 block line-clamp-2 text-sm text-ink/80">{n.kind === "taken" ? takenText(n.message, t) : `« ${n.message} »`}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted">{new Date(n.at).toLocaleString(DATE_LOCALE[locale], { dateStyle: "short", timeStyle: "short" })}</span>
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
