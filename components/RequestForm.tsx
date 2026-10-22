"use client";
import { Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import { LineCard, newLine } from "./QuoteEditor";
import { Avatar, Field, Stars } from "./ui";
import { normalize } from "@/lib/calc";
import { ApiError, request, useDirectory } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_SETTINGS, type Line, lineSchema } from "@/lib/model";
import Select from "./Select";

// Formulaire de demande de devis d'un client : il décrit ses ouvrages (sans voir de prix) ; le menuisier répond avec son devis.
export default function RequestForm() {
  const { t } = useI18n();
  const router = useRouter();
  const preset = useSearchParams().get("menuisier") ?? "";
  const { data: directory = [] } = useDirectory({});
  const [slug, setSlug] = useState(preset);
  const [project, setProject] = useState("");
  const [message, setMessage] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [wantedDate, setWantedDate] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(DEFAULT_SETTINGS)]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = directory.find((m) => m.slug === slug);

  const valid = (l: Line) => lineSchema.safeParse(l).success;
  const setLine = (i: number, patch: Partial<Line>) => setLines((cur) => cur.map((l, j) => (j === i ? normalize({ ...l, ...patch }) : l)));
  const num = (v: string) => Number(v) || 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return setError(t("req.pickJoiner"));
    if (!lines.every(valid)) return setError(t("editor.needLine"));
    setBusy(true);
    setError("");
    try {
      const q = await request<{ id: string }>("POST", "/api/requests", { menuisier: slug, project, message, siteAddress, wantedDate, lines });
      await mutate("/api/client/quotes");
      router.replace(`/espace-client/devis/${q.id}`);
    } catch (err) {
      setError(err instanceof ApiError && err.code === "no_menuisier" ? t("mp.notFound") : t("common.error"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("req.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("req.hint")}</p>
      </div>

      <section className="card space-y-4" aria-labelledby="h-to">
        <h2 id="h-to" className="text-lg font-semibold">
          {t("req.joiner")}
        </h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Field htmlFor="rq-m" label={t("req.joiner")}>
            <Select id="rq-m" required value={slug} onChange={setSlug} options={[{ value: "", label: t("req.pickJoiner") }, ...directory.map((m) => ({ value: m.slug, label: `${m.name}${m.city ? ` — ${m.city}` : ""}` }))]} />
          </Field>
          {chosen && (
            <Link href={`/menuisiers/${chosen.slug}`} target="_blank" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2">
              <Avatar name={chosen.name} src={chosen.logo} size={48} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{chosen.name}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  {chosen.reviews > 0 ? (
                    <>
                      <Stars value={chosen.rating} size={14} /> {chosen.rating.toFixed(1)} ({chosen.reviews})
                    </>
                  ) : (
                    t("dir.noReviews")
                  )}
                </span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="h-need">
        <h2 id="h-need" className="text-lg font-semibold">
          {t("req.project")}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field htmlFor="rq-p" label={t("editor.project")}>
            <input id="rq-p" className="input" maxLength={200} value={project} onChange={(e) => setProject(e.target.value)} />
          </Field>
          <Field htmlFor="rq-a" label={t("editor.clientAddress")}>
            <input id="rq-a" className="input" maxLength={200} value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
          </Field>
          <Field htmlFor="rq-d" label={t("req.wantedDate")}>
            <input id="rq-d" type="date" className="input" value={wantedDate} onChange={(e) => setWantedDate(e.target.value)} />
          </Field>
        </div>
        <Field htmlFor="rq-msg" label={t("req.message")} hint={t("req.messageHint")}>
          <textarea id="rq-msg" className="input min-h-28" maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4" aria-labelledby="h-items">
        <h2 id="h-items" className="text-lg font-semibold">
          {t("editor.lines")}
        </h2>
        {lines.map((l, i) => (
          <LineCard
            key={l.id}
            l={l}
            i={i}
            t={t}
            settings={DEFAULT_SETTINGS}
            valid={valid(l)}
            clientMode
            onChange={(p) => setLine(i, p)}
            onRemove={lines.length > 1 ? () => setLines(lines.filter((_, j) => j !== i)) : undefined}
            onDuplicate={() => setLines([...lines.slice(0, i + 1), { ...l, id: crypto.randomUUID() }, ...lines.slice(i + 1)])}
            onNeeds={() => {}}
            num={num}
          />
        ))}
        <button type="button" className="btn-secondary" onClick={() => setLines([...lines, newLine(DEFAULT_SETTINGS)])}>
          + {t("editor.addLine")}
        </button>
      </section>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary !min-h-12 !px-6" disabled={busy}>
          <Send size={18} aria-hidden />
          {t("req.submit")}
        </button>
        <p className="text-sm text-muted">{t("req.noPrice")}</p>
      </div>
    </form>
  );
}
