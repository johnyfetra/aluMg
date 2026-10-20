"use client";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/ui";
import { usePortfolio } from "@/lib/client";
import { compressImage, thumbnail } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/model";
import type { PortfolioItem } from "@/lib/profiles";

type Draft = { id?: string; title: string; description: string; category: PortfolioItem["category"]; year: number | null; images: string[] };
const EMPTY: Draft = { title: "", description: "", category: "", year: new Date().getFullYear(), images: [] };

export default function PortfolioPage() {
  const { t } = useI18n();
  const { items = [], loading, save, remove } = usePortfolio();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files || !draft) return;
    setBusy(true);
    try {
      const room = 8 - draft.images.length;
      const next = await Promise.all([...files].slice(0, room).map((f) => compressImage(f)));
      setDraft({ ...draft, images: [...draft.images, ...next] });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || draft.images.length === 0) {
      setMsg(t("port.needImage"));
      return;
    }
    setBusy(true);
    try {
      await save({ title: draft.title, description: draft.description, category: draft.category, year: draft.year, images: draft.images, thumb: await thumbnail(draft.images[0]) }, draft.id);
      setDraft(null);
      setMsg("");
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("port.title")}</h1>
        {!draft && (
          <button type="button" className="btn-primary" onClick={() => setDraft(EMPTY)}>
            <Plus size={18} aria-hidden />
            {t("port.add")}
          </button>
        )}
      </div>
      <p className="max-w-3xl text-sm text-muted">{t("port.hint")}</p>

      {draft && (
        <form onSubmit={submit} className="card space-y-4" aria-labelledby="h-form">
          <div className="flex items-center justify-between">
            <h2 id="h-form" className="text-lg font-semibold">
              {draft.id ? t("port.edit") : t("port.add")}
            </h2>
            <button type="button" className="btn-secondary !px-3" onClick={() => setDraft(null)} aria-label={t("common.back")}>
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field htmlFor="pt-title" label={t("port.name")}>
              <input id="pt-title" className="input" required maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field htmlFor="pt-cat" label={t("port.category")}>
                <select id="pt-cat" className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft["category"] })}>
                  <option value="">—</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {t(`spec.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field htmlFor="pt-year" label={t("port.year")}>
                <input id="pt-year" type="number" className="input" min={1990} max={2100} value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>
          </div>
          <Field htmlFor="pt-desc" label={t("port.description")}>
            <textarea id="pt-desc" className="input min-h-24" maxLength={1500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">{t("port.photos")}</p>
            <ul className="mb-3 flex flex-wrap gap-3">
              {draft.images.map((src, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-24 w-32 rounded-lg border border-line object-cover" />
                  <button type="button" className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-danger text-white shadow" aria-label={t("common.remove")} onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })}>
                    <X size={14} aria-hidden />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{t("port.cover")}</span>}
                </li>
              ))}
              {draft.images.length < 8 && (
                <li>
                  <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs text-muted hover:bg-surface-2 focus-within:outline-3 focus-within:outline-primary">
                    <ImagePlus size={20} aria-hidden />
                    {busy ? t("common.loading") : t("port.addPhotos")}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                  </label>
                </li>
              )}
            </ul>
            <p className="text-xs text-muted">{t("port.photosHint")}</p>
          </div>
          {msg && (
            <p role="alert" className="text-sm font-medium text-danger">
              {msg}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {t("common.save")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
              {t("common.back")}
            </button>
          </div>
        </form>
      )}

      {!loading && items.length === 0 && !draft ? (
        <div className="card py-12 text-center text-muted">{t("port.empty")}</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((it) => (
            <li key={it.id} className="card overflow-hidden !p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb || it.images[0]} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="space-y-2 p-4">
                <p className="font-semibold">{it.title}</p>
                <p className="text-xs text-muted">{[it.category && t(`spec.${it.category as "fenetres"}`), it.year, `${it.images.length} ${t("port.photosCount")}`].filter(Boolean).join(" · ")}</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary !min-h-9" onClick={() => setDraft({ id: it.id, title: it.title, description: it.description, category: it.category, year: it.year, images: it.images })}>
                    <Pencil size={14} aria-hidden />
                    {t("common.edit")}
                  </button>
                  <button type="button" className="btn-danger !min-h-9" aria-label={`${t("common.delete")} ${it.title}`} onClick={() => confirm(t("port.confirmDelete")) && remove(it.id)}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
