"use client";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { notificationHref, request, useNotifications, useSession } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/fr";

// Cloche de l'en-tête : événements des devis qui concernent l'utilisateur. Un clic ouvre le devis (et l'ouvrage visé) et marque lu.
export default function NotificationBell() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: me } = useSession();
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!me || (me.role !== "client" && me.role !== "menuisier")) return null;
  const go = async (n: NonNullable<typeof data>["items"][number]) => {
    setOpen(false);
    if (!n.read) await request("POST", "/api/notifications", { id: n.id }).then(() => mutate("/api/notifications"));
    router.push(notificationHref(me.role, n));
  };
  const readAll = async () => {
    await request("POST", "/api/notifications", {});
    await mutate("/api/notifications");
  };

  return (
    <div ref={box} className="relative">
      <button type="button" className="btn-secondary relative w-11 !px-0" aria-label={`${t("notif.open")}${unread ? ` (${unread})` : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-on-primary">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={t("notif.title")} className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">{t("notif.title")}</h2>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-semibold text-primary hover:underline">
                {t("notif.markAll")}
              </button>
            )}
          </div>
          {(data?.items.length ?? 0) === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{t("notif.empty")}</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {data!.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => go(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 ${n.read ? "" : "bg-primary/5"}`}>
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{t(`notif.${n.kind}` as keyof Messages)}</span>
                      <span className="block truncate text-xs text-muted">{n.number}{n.project ? ` · ${n.project}` : ""}</span>
                      {n.message && <span className="mt-0.5 block line-clamp-2 text-sm text-ink/80">« {n.message} »</span>}
                      <span className="mt-0.5 block text-[11px] text-muted">{new Date(n.at).toLocaleString(DATE_LOCALE[locale], { dateStyle: "short", timeStyle: "short" })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
