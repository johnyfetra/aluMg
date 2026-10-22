"use client";
import { ArrowLeft, Camera, Download, FileText, Hash, Image as ImageIcon, MessageCircle, Paperclip, Reply, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import CameraDialog from "./CameraDialog";
import Lightbox from "./Lightbox";
import { Avatar, StatusBadge } from "./ui";
import { ATTACH, ATTACH_MIME, isImageMime, mimeOfName, sizeLabel } from "@/lib/attach";
import { fmt } from "@/lib/calc";
import { ApiError, request, useConversations, useMessages } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { compressImage } from "@/lib/image";
import type { ConversationView, MessageView } from "@/lib/chat";
import type { Status } from "@/lib/model";

// Messagerie : liste des conversations à gauche, fil à droite (un seul volet à la fois sur mobile).
export default function Messenger() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const selected = useSearchParams().get("c");
  const { data: convs = [], isLoading } = useConversations();
  const current = convs.find((c) => c.id === selected) ?? null;
  const time = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    return d.toDateString() === today.toDateString() ? d.toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("msg.title")}</h1>
      <div className="grid h-[calc(100vh-11rem)] min-h-[34rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className={`min-h-0 flex-col border-r border-line ${current ? "hidden lg:flex" : "flex"}`} aria-label={t("msg.conversations")}>
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">{t("msg.conversations")}</div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {!isLoading && convs.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("msg.empty")}</li>}
            {convs.map((c) => (
              <li key={c.id}>
                <button type="button" aria-current={c.id === selected ? "true" : undefined} onClick={() => router.replace(`/messages?c=${c.id}`)} className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-2 ${c.id === selected ? "bg-primary/10" : ""}`}>
                  <Avatar name={c.other.name} src={c.other.role === "menuisier" ? c.other.logo || c.other.avatar : c.other.avatar} size={44} round={c.other.role === "client"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other.name}</span>
                      {c.last && <span className="shrink-0 text-[11px] text-muted">{time(c.last.at)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-medium text-ink" : "text-muted"}`}>{c.last ? `${c.last.mine ? `${t("msg.you")} : ` : ""}${c.last.body || (c.last.quote ? t("msg.quoteWord") : t("msg.attachment"))}` : t("msg.noMessage")}</span>
                      {c.unread > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary" aria-label={`${c.unread} ${t("msg.unread")}`}>
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`min-h-0 min-w-0 flex-col ${current ? "flex" : "hidden lg:flex"}`} aria-label={t("msg.thread")}>
          {current ? <Thread key={current.id} conv={current} onBack={() => router.replace("/messages")} /> : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <MessageCircle size={40} aria-hidden className="mx-auto mb-3 opacity-40" />
                <p>{t("msg.pick")}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type Pending = { id: string; name: string; mime: string; size: number; data: string; preview: string };
type Citable = { id: string; number: string; project: string; status: string };

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

function Thread({ conv, onBack }: { conv: ConversationView; onBack: () => void }) {
  const { t, locale } = useI18n();
  const { data: msgs = [] } = useMessages(conv.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [replyTo, setReplyTo] = useState<MessageView | null>(null);
  const [quote, setQuote] = useState<Citable | null>(null);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<{ query: string; from: "tag" | "menu" } | null>(null);
  const [camera, setCamera] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const { data: citable = [] } = useSWR<Citable[]>(picker ? `/api/conversations/${conv.id}/quotes` : null);

  // lire un fil change le compteur de non-lus de la navigation
  useEffect(() => {
    if (msgs.length) void Promise.all([mutate("/api/messages/unread"), mutate("/api/conversations")]);
  }, [msgs.length]);

  // défilement vers le bas à l'ouverture et quand un message arrive, sauf si on relit plus haut
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const near = b.scrollHeight - b.scrollTop - b.clientHeight < 160;
    if (count.current === 0 || near) end.current?.scrollIntoView({ block: "end" });
    count.current = msgs.length;
  }, [msgs.length]);

  // Ajoute des fichiers au message : photos réduites en JPEG, autres types vérifiés (type, poids, nombre).
  const addFiles = async (list: File[]) => {
    setError("");
    const next = [...pending];
    for (const f of list) {
      if (next.length >= ATTACH.maxFiles) return setError(t("msg.tooMany"));
      try {
        let file: Blob = f;
        let name = f.name || "photo.jpg";
        let mime = f.type || mimeOfName(name);
        let preview = "";
        if (isImageMime(mime) && mime !== "image/gif") {
          const url = await compressImage(f, 1600, 0.82);
          file = await (await fetch(url)).blob();
          mime = "image/jpeg";
          name = `${name.replace(/\.[^.]+$/, "")}.jpg`;
          preview = url;
        } else if (mime === "image/gif") preview = URL.createObjectURL(f);
        if (!ATTACH_MIME[mime]?.includes(name.split(".").pop()?.toLowerCase() ?? "")) return setError(t("msg.badFile"));
        if (file.size > ATTACH.maxFile || next.reduce((s, p) => s + p.size, 0) + file.size > ATTACH.maxTotal) return setError(t("msg.tooBig"));
        next.push({ id: crypto.randomUUID(), name, mime, size: file.size, data: await toBase64(file), preview });
      } catch {
        return setError(t("msg.badFile"));
      } finally {
        setPending([...next]);
      }
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !pending.length && !quote) || sending) return;
    setSending(true);
    setError("");
    try {
      const m = await request<MessageView>("POST", `/api/conversations/${conv.id}/messages`, {
        body,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        ...(quote ? { quoteId: quote.id } : {}),
        files: pending.map(({ name, mime, data }) => ({ name, mime, data })),
      });
      await mutate(`/api/conversations/${conv.id}/messages`, [...msgs, m], { revalidate: true });
      await mutate("/api/conversations");
      setText("");
      setPending([]);
      setReplyTo(null);
      setQuote(null);
      setPicker(null);
      end.current?.scrollIntoView({ block: "end" });
    } catch (e) {
      setError(e instanceof ApiError && e.code === "too_big" ? t("msg.tooBig") : e instanceof ApiError && e.code === "bad_file" ? t("msg.badFile") : t("common.error"));
    } finally {
      setSending(false);
    }
  };

  // « # » dans le texte ouvre la liste des devis à citer ; le texte tapé après filtre la liste.
  const onText = (v: string) => {
    setText(v);
    const m = /(^|\s)#([^\s#]*)$/.exec(v);
    setPicker(m ? { query: m[2].toLowerCase(), from: "tag" } : (cur) => (cur?.from === "menu" ? cur : null));
  };
  const pickQuote = (q: Citable) => {
    setQuote(q);
    if (picker?.from === "tag") setText((v) => v.replace(/(^|\s)#[^\s#]*$/, "$1"));
    setPicker(null);
    input.current?.focus();
  };
  const shown = citable.filter((q) => !picker?.query || `${q.number} ${q.project}`.toLowerCase().includes(picker.query));

  const images = msgs.flatMap((m) => m.attachments.filter((a) => isImageMime(a.mime)).map((a) => `/api/attachments/${a.id}`));
  const jump = (id: string) => {
    const el = document.getElementById(`m-${id}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.classList.add("ring-2", "ring-primary");
    setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 1400);
  };

  const day = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALE[locale], { weekday: "long", day: "numeric", month: "long" });
  const hour = (iso: string) => new Date(iso).toLocaleTimeString(DATE_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
  const o = conv.other;
  const menuAct = (kind: "file" | "photo" | "camera" | "quote") => {
    if (kind === "file") fileInput.current?.click();
    else if (kind === "photo") photoInput.current?.click();
    else if (kind === "camera") {
      if (hasCamera) setCamera(true);
      else captureInput.current?.click();
    }
    else setPicker({ query: "", from: "menu" });
  };
  const hasCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const preview = (m: { body: string; files: number }) => m.body || (m.files ? t("msg.attachment") : t("msg.original"));

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void addFiles([...e.dataTransfer.files]);
      }}
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <Avatar name={o.name} src={o.role === "menuisier" ? o.logo || o.avatar : o.avatar} size={40} round={o.role === "client"} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{o.name}</p>
          <p className="text-xs text-muted">{o.role === "menuisier" ? t("msg.joiner") : t("msg.client")}</p>
        </div>
        {o.role === "menuisier" && o.slug && (
          <Link href={`/menuisiers/${o.slug}`} className="text-sm font-medium text-primary hover:underline">
            {t("dir.viewProfile")}
          </Link>
        )}
      </header>

      <div ref={box} className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-surface-2/40 px-4 py-4" role="log" aria-live="polite" aria-label={t("msg.thread")}>
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("msg.startHint")}</p>}
        {msgs.map((m, i) => {
          const newDay = i === 0 || new Date(msgs[i - 1].at).toDateString() !== new Date(m.at).toDateString();
          const imgs = m.attachments.filter((a) => isImageMime(a.mime));
          const docs = m.attachments.filter((a) => !isImageMime(a.mime));
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs font-medium capitalize text-muted">{day(m.at)}</p>}
              <div className={`group flex items-end gap-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                <div id={`m-${m.id}`} className={`max-w-[82%] space-y-1.5 rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-shadow ${m.mine ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md border border-line bg-surface"}`}>
                  {m.replyTo && (
                    <button type="button" onClick={() => jump(m.replyTo!.id)} className={`block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs ${m.mine ? "border-white/70 bg-white/15" : "border-primary bg-surface-2"}`}>
                      <span className="block font-semibold">{m.replyTo.mine ? t("msg.you") : o.name}</span>
                      <span className="block truncate opacity-80">{preview(m.replyTo)}</span>
                    </button>
                  )}
                  {imgs.length > 0 && (
                    <div className={`grid gap-1.5 ${imgs.length > 1 ? "grid-cols-2" : ""}`}>
                      {imgs.map((a) => (
                        <button key={a.id} type="button" onClick={() => setZoom(images.indexOf(`/api/attachments/${a.id}`))} aria-label={`${t("msg.zoom")} — ${a.name}`} className="overflow-hidden rounded-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/attachments/${a.id}`} alt={a.name} loading="lazy" className="max-h-60 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {docs.map((a) => (
                    <a key={a.id} href={`/api/attachments/${a.id}?download`} download={a.name} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${m.mine ? "bg-white/15 hover:bg-white/25" : "bg-surface-2 hover:bg-line/60"}`}>
                      <FileText size={20} aria-hidden className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{a.name}</span>
                        <span className="opacity-70">{sizeLabel(a.size)}</span>
                      </span>
                      <Download size={16} aria-label={t("msg.download")} className="shrink-0" />
                    </a>
                  ))}
                  {m.quote && (
                    <Link href={m.quote.href} className="block rounded-xl border border-line bg-surface p-3 text-ink shadow-sm hover:border-primary">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold">{m.quote.number}</span>
                        <StatusBadge status={m.quote.status as Status} label={t(`status.${m.quote.status as Status}`)} />
                      </span>
                      {m.quote.project && <span className="mt-0.5 block truncate text-xs text-muted">{m.quote.project}</span>}
                      <span className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-primary">{t("msg.openQuote")} →</span>
                        {m.quote.total !== null && <span className="text-sm font-bold tabular-nums">{fmt(m.quote.total)} {t("common.currency")}</span>}
                      </span>
                    </Link>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <p className={`text-right text-[10px] ${m.mine ? "text-on-primary/70" : "text-muted"}`}>{hour(m.at)}</p>
                </div>
                <button type="button" onClick={() => { setReplyTo(m); input.current?.focus(); }} aria-label={`${t("msg.reply")} — ${preview({ body: m.body, files: m.attachments.length })}`} title={t("msg.reply")} className="mb-1 grid size-8 shrink-0 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-surface hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-60">
                  <Reply size={15} aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="relative border-t border-line p-3">
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-primary bg-surface-2 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">{t("msg.replyingTo")} {replyTo.mine ? t("msg.you") : o.name}</p>
              <p className="truncate text-muted">{preview({ body: replyTo.body, files: replyTo.attachments.length })}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label={t("msg.cancel")} className="grid size-7 place-items-center rounded-full hover:bg-line/60">
              <X size={14} aria-hidden />
            </button>
          </div>
        )}
        {(quote || pending.length > 0) && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {quote && (
              <li className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-xs">
                <Hash size={14} aria-hidden className="text-primary" />
                <span className="font-semibold">{quote.number}</span>
                {quote.project && <span className="max-w-40 truncate text-muted">{quote.project}</span>}
                <button type="button" onClick={() => setQuote(null)} aria-label={`${t("msg.remove")} ${quote.number}`} className="grid size-5 place-items-center rounded-full hover:bg-line/60">
                  <X size={12} aria-hidden />
                </button>
              </li>
            )}
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-1.5 pr-2 text-xs">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt="" className="size-10 rounded-md object-cover" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-md bg-surface"><FileText size={18} aria-hidden /></span>
                )}
                <span className="min-w-0">
                  <span className="block max-w-36 truncate font-medium">{p.name}</span>
                  <span className="text-muted">{sizeLabel(p.size)}</span>
                </span>
                <button type="button" onClick={() => setPending((l) => l.filter((x) => x.id !== p.id))} aria-label={`${t("msg.remove")} ${p.name}`} className="grid size-6 place-items-center rounded-full hover:bg-line/60">
                  <X size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mb-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {picker && (
          <div role="listbox" aria-label={t("msg.pickQuote")} className="absolute inset-x-3 bottom-full z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted">{t("msg.pickQuote")}</p>
            {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted">{t("msg.noQuote")}</p>}
            {shown.map((q) => (
              <button key={q.id} type="button" role="option" aria-selected={false} onClick={() => pickQuote(q)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="font-semibold">{q.number}</span>
                  {q.project && <span className="ml-2 truncate text-muted">{q.project}</span>}
                </span>
                <StatusBadge status={q.status as Status} label={t(`status.${q.status as Status}`)} />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative">
            <button type="button" className="btn-secondary !min-h-11 !px-3" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)} aria-label={t("msg.attach")} title={t("msg.attach")}>
              <Paperclip size={18} aria-hidden />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
                <ul role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-xl">
                  {([
                    { icon: FileText, label: t("msg.file"), kind: "file" },
                    { icon: ImageIcon, label: t("msg.photo"), kind: "photo" },
                    { icon: Camera, label: t("msg.takePhoto"), kind: "camera" },
                    { icon: Hash, label: t("msg.quote"), kind: "quote" },
                  ] as const).map(({ icon: Icon, label, kind }) => (
                    <li key={kind} role="none">
                      <button type="button" role="menuitem" onClick={() => { setMenu(false); menuAct(kind); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                        <Icon size={17} aria-hidden className="text-primary" />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <input ref={fileInput} type="file" multiple hidden accept={Object.values(ATTACH_MIME).flat().map((e) => `.${e}`).join(",")} onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
            <input ref={photoInput} type="file" multiple hidden accept="image/*" onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
            <input ref={captureInput} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </div>
          <label htmlFor="chat-input" className="sr-only">
            {t("msg.write")}
          </label>
          <textarea
            ref={input}
            id="chat-input"
            rows={1}
            maxLength={2000}
            value={text}
            placeholder={t("msg.write")}
            onChange={(e) => onText(e.target.value)}
            onPaste={(e) => {
              const files = [...e.clipboardData.files].filter((f) => isImageMime(f.type));
              if (files.length) {
                e.preventDefault();
                void addFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && picker) setPicker(null);
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (picker && shown[0]) pickQuote(shown[0]);
                else void send();
              }
            }}
            className="input max-h-36 min-h-11 flex-1 resize-none"
          />
          <button type="submit" className="btn-primary !min-h-11" disabled={sending || (!text.trim() && !pending.length && !quote)}>
            <Send size={16} aria-hidden />
            <span className="hidden sm:inline">{sending ? t("msg.sending") : t("tl.send")}</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{t("msg.hint")}</p>
      </form>

      {drag && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-lg font-semibold text-primary backdrop-blur-[1px]">{t("msg.drop")}</div>
      )}
      {camera && <CameraDialog t={t} onClose={() => setCamera(false)} onCapture={(f) => { setCamera(false); void addFiles([f]); }} />}
      {zoom !== null && images.length > 0 && <Lightbox images={images} index={Math.min(zoom, images.length - 1)} onIndex={setZoom} onClose={() => setZoom(null)} label={t("msg.photoWord")} />}
    </div>
  );
}
