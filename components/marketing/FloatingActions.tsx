"use client";
import { CalendarCheck, MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ChatButton from "../ChatButton";
import { Field } from "../ui";
import { ApiError, request, useSession } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { marketing } from "@/lib/marketing";
import { isPhone } from "@/lib/phone";

const KEY = "alumg.contact"; // nom et numéro retenus dans ce navigateur, pour ne pas les retaper

// Boutons flottants de la vitrine : « Demander une démo » (après le premier écran, masqué quand le calendrier est visible) et bulle de discussion.
// Un visiteur donne son nom et son numéro avant d'écrire ; un compte connecté écrit dans son fil avec l'équipe (messagerie).
export default function FloatingActions() {
  const { locale } = useI18n();
  const c = marketing[locale];
  const path = usePathname();
  const { data: me } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [demoInView, setDemoInView] = useState(false);
  const [open, setOpen] = useState(false);
  // le formulaire n'est rendu qu'après un clic : lire le navigateur ici ne crée pas d'écart avec le rendu serveur
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      return { name: saved?.name ?? "", phone: saved?.phone ?? "", message: "" };
    } catch {
      return { name: "", phone: "", message: "" }; // serveur ou stockage indisponible
    }
  });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > innerHeight * 0.6);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    const demo = document.getElementById("demo");
    const io = demo && new IntersectionObserver(([e]) => setDemoInView(e.isIntersecting), { threshold: 0.15 });
    if (demo) io?.observe(demo);
    return () => { removeEventListener("scroll", onScroll); io?.disconnect(); };
  }, [path]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const phoneBad = form.phone.trim() !== "" && !isPhone(form.phone);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneBad) return;
    setState("busy");
    setError("");
    try {
      await request("POST", "/api/site-messages", { ...form, page: path });
      try { localStorage.setItem(KEY, JSON.stringify({ name: form.name, phone: form.phone })); } catch { /* sans stockage, on redemandera */ }
      setState("done");
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError && err.code === "too_many_requests" ? c.chatTooMany : c.chatErr);
    }
  };

  const showDemo = scrolled && !demoInView && !open;
  return (
    <>
      <Link
        href="/#demo"
        aria-hidden={!showDemo}
        tabIndex={showDemo ? 0 : -1}
        data-on={showDemo || undefined}
        className="fab-demo fixed left-1/2 z-40 inline-flex min-h-12 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-ink px-5 text-sm font-semibold text-bg shadow-xl"
      >
        <CalendarCheck size={17} aria-hidden className="fab-demo-icon" />
        {c.demoHero}
      </Link>

      {open && (
        <section role="dialog" aria-label={c.chatTitle} className="fab-panel fixed inset-x-3 z-40 flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[22rem]">
          <header className="flex shrink-0 items-start justify-between gap-3 bg-(--side-bg) px-5 py-4 text-(--side-fg)">
            <div>
              <p className="font-semibold">{c.chatTitle}</p>
              <p className="mt-0.5 text-xs text-(--side-muted)">{c.chatIntro}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={c.chatClose} className="rounded-full p-1.5 hover:bg-white/10"><X size={18} aria-hidden /></button>
          </header>
          <div className="overflow-y-auto overscroll-contain p-5">
            {me && me.role !== "admin" ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted">{c.chatLogged}</p>
                <ChatButton target={{ support: true }} label={c.chatGo} className="btn-primary w-full" />
              </div>
            ) : state === "done" ? (
              <div role="status" className="space-y-3 text-sm">
                <p className="font-semibold">{c.chatDoneTitle}</p>
                <p className="text-muted">{c.chatDone.replace("{phone}", form.phone)}</p>
                <button type="button" className="btn-secondary w-full" onClick={() => { setForm((f) => ({ ...f, message: "" })); setState("idle"); }}>{c.chatAgain}</button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-3">
                <Field htmlFor="fc-name" label={c.demoName} required>
                  <input id="fc-name" className="input" required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={set("name")} />
                </Field>
                <Field htmlFor="fc-phone" label={c.demoPhone} required error={phoneBad ? c.demoPhoneBad : undefined}>
                  <input id="fc-phone" className="input" type="tel" required inputMode="tel" autoComplete="tel" maxLength={40} placeholder="034 00 000 00" value={form.phone} onChange={set("phone")} aria-invalid={phoneBad || undefined} />
                </Field>
                <Field htmlFor="fc-msg" label={c.chatMsg} required>
                  <textarea id="fc-msg" className="input min-h-24" required minLength={2} maxLength={2000} value={form.message} onChange={set("message")} />
                </Field>
                {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={state === "busy" || phoneBad}>
                  <Send size={16} aria-hidden />
                  {state === "busy" ? c.demoSending : c.chatSend}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? c.chatClose : c.chatOpen}
        data-open={open || undefined}
        className="fab-chat fixed right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-xl ring-4 ring-bg/70 sm:right-6"
      >
        {/* les deux icônes restent montées : l'une tourne et s'efface pendant que l'autre arrive */}
        <MessageCircle size={24} aria-hidden className="fab-icon fab-icon-chat" />
        <X size={22} aria-hidden className="fab-icon fab-icon-close" />
      </button>
    </>
  );
}
