"use client";
import { Check, Copy, Link2, Mail, Pencil, Phone, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";
import ChatButton from "@/components/ChatButton";
import { useConfirm } from "@/components/ConfirmDialog";
import { Avatar, Field } from "@/components/ui";
import { ApiError, request, useContacts, useProfile } from "@/lib/client";
import type { ContactView } from "@/lib/contacts";
import { useI18n } from "@/lib/i18n";

type Draft = { name: string; phone: string; email: string; note: string };
const EMPTY: Draft = { name: "", phone: "", email: "", note: "" };

// Carnet de clients du menuisier : nom, téléphone, e-mail, compte AluMg ; un clic pour lui créer un devis ou lui écrire.
export default function ClientsPage() {
  const { t } = useI18n();
  const ask = useConfirm();
  const { data: list = [], isLoading } = useContacts();
  const { profile } = useProfile();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const shown = list.filter((c) => !q.trim() || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const origin = typeof location === "undefined" ? "" : location.origin;
  const requestLink = profile ? `${origin}/espace-client/nouvelle?menuisier=${profile.slug}` : "";

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* presse-papiers indisponible : le texte reste visible à l'écran */
    }
  };
  const open = (c?: ContactView) => {
    setError("");
    setEditing(c ? c.id : "new");
    setDraft(c ? { name: c.name, phone: c.phone, email: c.email, note: c.note } : EMPTY);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await (editing === "new" ? request("POST", "/api/contacts", draft) : request("PUT", `/api/contacts/${editing}`, draft));
      await mutate("/api/contacts");
      setEditing(null);
    } catch (err) {
      setError(err instanceof ApiError ? t("ct.error") : t("common.error"));
    }
  };
  const remove = async (c: ContactView) => {
    if (!(await ask({ message: t("ct.confirmDelete"), tone: "danger", confirmLabel: t("ct.delete") }))) return;
    await request("DELETE", `/api/contacts/${c.id}`);
    await mutate("/api/contacts");
  };

  const form = (
    <form onSubmit={save} className="card space-y-3 border-primary/40">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field htmlFor="ct-n" label={t("ct.name")}>
          <input id="ct-n" className="input" required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field htmlFor="ct-p" label={t("ct.phone")}>
          <input id="ct-p" className="input" type="tel" maxLength={40} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </Field>
        <Field htmlFor="ct-e" label={t("ct.email")}>
          <input id="ct-e" className="input" type="email" maxLength={160} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </Field>
      </div>
      <Field htmlFor="ct-o" label={t("ct.note")}>
        <input id="ct-o" className="input" maxLength={500} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      </Field>
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{t("ct.save")}</button>
        <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>{t("ct.cancel")}</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("ct.title")}</h1>
          <p className="max-w-2xl text-sm text-muted">{t("ct.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {requestLink && (
            <button type="button" className="btn-secondary" onClick={() => copy("link", requestLink)}>
              {copied === "link" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
              {copied === "link" ? t("ct.copied") : t("ct.copyLink")}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => open()}>
            <Plus size={16} aria-hidden />
            {t("ct.add")}
          </button>
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">{t("ct.linkHint")}</p>

      {editing === "new" && form}

      <div className="relative max-w-md">
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" type="search" aria-label={t("ct.search")} placeholder={t("ct.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!isLoading && list.length === 0 && editing !== "new" && <p className="card py-10 text-center text-muted">{t("ct.empty")}</p>}

      <ul className="grid gap-3 lg:grid-cols-2">
        {shown.map((c) =>
          editing === c.id ? (
            <li key={c.id} className="lg:col-span-2">{form}</li>
          ) : (
            <li key={c.id} className="card flex flex-col gap-3 !p-4">
              <div className="flex items-start gap-3">
                <Avatar name={c.account?.name || c.name} src={c.account?.avatar ?? ""} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{c.name}</span>
                    {c.account ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-ok"><UserCheck size={12} aria-hidden />{t("ct.account")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted"><UserX size={12} aria-hidden />{t("ct.noAccount")}</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
                    {c.phone && <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={13} aria-hidden />{c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail size={13} aria-hidden />{c.email}</a>}
                    <span>{c.quotes} {t("ct.quotes")}</span>
                  </p>
                  {c.note && <p className="mt-1 text-sm">{c.note}</p>}
                  {!c.account && c.email && <p className="mt-1 text-xs text-muted">{t("ct.noAccountHint")}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/devis/nouveau?contact=${c.id}`} className="btn-primary !min-h-9 !px-3 text-xs">
                  <Plus size={14} aria-hidden />
                  {t("ct.newQuote")}
                </Link>
                {c.account && c.quotes > 0 && <ChatButton target={{ client: c.account.id }} label={t("ct.write")} className="btn-secondary !min-h-9 !px-3 text-xs" />}
                {!c.account && c.email && (
                  <button type="button" className="btn-secondary !min-h-9 !px-3 text-xs" onClick={() => copy(c.id, `${t("ct.invite")} ${origin}/inscription?role=client`)}>
                    {copied === c.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                    {copied === c.id ? t("ct.copied") : t("ct.copyInvite")}
                  </button>
                )}
                <button type="button" className="btn-secondary !min-h-9 !px-3 text-xs" onClick={() => open(c)}><Pencil size={14} aria-hidden />{t("ct.edit")}</button>
                <button type="button" className="btn-danger !min-h-9 !px-3 text-xs" onClick={() => remove(c)} aria-label={`${t("ct.delete")} ${c.name}`}><Trash2 size={14} aria-hidden /></button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
