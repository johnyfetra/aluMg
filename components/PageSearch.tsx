"use client";
import { ArrowUpRight, Clock, FileText, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { fold, matchItems, type SearchItem } from "@/lib/search";

// Recherche de la barre du haut, à la manière de LinkedIn. Elle n'existe que sur les pages qui ont une liste à fouiller :
// la page la « prend » (usePageSearch) avec son libellé et ses éléments ; la barre propose alors recherches récentes,
// éléments consultés et suggestions, et filtre la liste de la page en direct. Historique propre à chaque page, gardé sur l'appareil.
export type { SearchItem };
type Page = { label: string; scope: string };
type Ctx = { q: string; setQ: (v: string) => void; page: Page | null; items: SearchItem[]; claim: (p: Page | null, q: string) => void; setItems: (i: SearchItem[]) => void };
const SearchCtx = createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const claim = (p: Page | null, initial: string) => { setPage(p); setQ(initial); if (!p) setItems([]); };
  return <SearchCtx.Provider value={{ q, setQ, page, items, claim, setItems }}>{children}</SearchCtx.Provider>;
}

export const useSearchActive = () => !!useContext(SearchCtx)?.page;

// Renvoie [q, setQ] : le même texte que la barre du haut. Hors du Shell (aucun fournisseur), un simple état local.
export function usePageSearch(label: string, { scope, initial = "" }: { scope: string; initial?: string }) {
  const c = useContext(SearchCtx);
  const local = useState(initial);
  const claim = c?.claim;
  useEffect(() => {
    claim?.({ label, scope }, initial);
    return () => claim?.(null, "");
  }, [label, scope]); // eslint-disable-line react-hooks/exhaustive-deps -- la valeur initiale ne compte qu'à l'arrivée sur la page
  return c ? ([c.q, c.setQ] as const) : local;
}

// Éléments proposés en suggestion (appelé une fois les données chargées)
export function useSearchItems(items: SearchItem[]) {
  const setItems = useContext(SearchCtx)?.setItems;
  const key = items.map((i) => `${i.id}${i.title}${i.sub ?? ""}`).join("|");
  useEffect(() => { setItems?.(items); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- comparé par contenu : la page recrée le tableau à chaque rendu
}

// ---------- historique (localStorage, par page) ----------
type History = { k: string[]; v: SearchItem[] };
const store = (scope: string) => `alumg.search.${scope}`;
function readHistory(scope: string): History {
  try {
    const h = JSON.parse(localStorage.getItem(store(scope)) ?? "") as History;
    return { k: Array.isArray(h.k) ? h.k.slice(0, 6) : [], v: Array.isArray(h.v) ? h.v.slice(0, 5) : [] };
  } catch { return { k: [], v: [] }; }
}
function writeHistory(scope: string, h: History) {
  try { localStorage.setItem(store(scope), JSON.stringify(h)); } catch {}
}

// Met en gras la partie qui correspond (insensible aux accents et à la casse ; même longueur une fois replié, sauf ligatures rares)
function Mark({ text, q }: { text: string; q: string }) {
  const i = fold(text).indexOf(fold(q.trim()));
  if (!q.trim() || i < 0) return <>{text}</>;
  const j = i + q.trim().length;
  return <>{text.slice(0, i)}<b className="font-semibold text-ink">{text.slice(i, j)}</b>{text.slice(j)}</>;
}

type Option = { id: string; word?: string; item?: SearchItem }; // une ligne de la liste : appliquer un mot, ou ouvrir un élément

export default function TopSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const c = useContext(SearchCtx);
  const input = useRef<HTMLInputElement>(null);
  const list = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hist, setHist] = useState<History>({ k: [], v: [] });
  const page = c?.page;

  // Ctrl K / ⌘ K place le curseur dans la recherche
  useEffect(() => {
    if (!page) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [page]);

  if (!c || !page) return null;
  const q = c.q;
  const save = (h: History) => { setHist(h); writeHistory(page.scope, h); };
  const keep = (word: string) => {
    const w = word.trim();
    if (w.length >= 2) save({ ...hist, k: [w, ...hist.k.filter((x) => fold(x) !== fold(w))].slice(0, 6) });
  };
  const close = () => { setOpen(false); setActive(-1); };
  const pick = (item: SearchItem) => {
    const h = { k: q.trim().length >= 2 ? [q.trim(), ...hist.k.filter((x) => fold(x) !== fold(q))].slice(0, 6) : hist.k, v: [item, ...hist.v.filter((x) => x.id !== item.id)].slice(0, 5) };
    save(h);
    close();
    if (item.href) { c.setQ(""); input.current?.blur(); router.push(item.href); }
    else c.setQ(item.title); // pas de fiche : on filtre la liste sur cet élément
  };
  const apply = (word = q) => { c.setQ(word); keep(word); close(); input.current?.blur(); };

  const found = matchItems(c.items, q);
  const options: Option[] = q.trim()
    ? [{ id: "go", word: q }, ...found.map((i) => ({ id: `i-${i.id}`, item: i }))]
    : [...hist.k.map((k, n) => ({ id: `k-${n}`, word: k })), ...hist.v.map((i) => ({ id: `v-${i.id}`, item: i }))];
  const run = (o?: Option) => { if (o?.item) pick(o.item); else if (o) apply(o.word); };
  const optId = (id: string) => `${list}-${id}`;
  const opt = (id: string) => {
    const n = options.findIndex((o) => o.id === id);
    return { id: optId(id), role: "option", "aria-selected": n === active, onMouseEnter: () => setActive(n), className: `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${n === active ? "bg-surface-2" : ""}` };
  };

  return (
    <div className="relative hidden w-full max-w-lg lg:block">
      <form role="search" className="group relative" onSubmit={(e) => { e.preventDefault(); if (active >= 0) run(options[active]); else apply(); }}>
        <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
        <input ref={input} type="search" role="combobox" aria-label={page.label} placeholder={page.label} value={q} maxLength={80} autoComplete="off"
          aria-expanded={open} aria-controls={list} aria-autocomplete="list" aria-activedescendant={active >= 0 && options[active] ? optId(options[active].id) : undefined}
          onFocus={() => { setHist(readHistory(page.scope)); setOpen(true); }}
          onBlur={close}
          onChange={(e) => { c.setQ(e.target.value); setActive(-1); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              if (options.length) setActive((a) => (e.key === "ArrowDown" ? (a + 1) % options.length : (a <= 0 ? options.length : a) - 1));
            } else if (e.key === "Escape") { if (open) close(); else c.setQ(""); }
          }}
          className="bare-focus h-11 w-full rounded-full border border-transparent bg-surface-2 pl-11 pr-16 text-sm outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted hover:border-line focus:border-primary/50 focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_15%,transparent)] [&::-webkit-search-cancel-button]:hidden" />
        {q ? (
          <button type="button" aria-label={t("search.clear")} onMouseDown={(e) => e.preventDefault()} onClick={() => { c.setQ(""); input.current?.focus(); }} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
            <X size={16} aria-hidden />
          </button>
        ) : (
          <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">Ctrl K</kbd>
        )}
      </form>

      {open && (
        // mousedown retenu : le champ garde le focus pendant le clic sur une proposition
        <div onMouseDown={(e) => e.preventDefault()} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-(--radius-card) border border-line bg-surface p-2 shadow-(--shadow-overlay)">
          {/* un seul écouteur pour toutes les lignes (les boutons « retirer » arrêtent le clic avant) */}
          <div id={list} role="listbox" aria-label={page.label} className="max-h-[min(26rem,70dvh)] overflow-y-auto"
            onClick={(e) => { const id = (e.target as HTMLElement).closest("[role=option]")?.id; run(options.find((o) => optId(o.id) === id)); }}>
            {q.trim() ? (
              <>
                <div {...opt("go")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary"><Search size={15} aria-hidden /></span>
                  <span className="min-w-0 truncate">{t("search.for")} <b className="font-semibold">« {q.trim()} »</b></span>
                </div>
                {found.length > 0 && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("search.results")}</p>}
                {found.map((i) => <Row key={i.id} item={i} q={q} props={opt(`i-${i.id}`)} />)}
                {found.length === 0 && c.items.length > 0 && <p className="px-3 py-3 text-sm text-muted">{t("search.none")}</p>}
              </>
            ) : hist.k.length + hist.v.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">{t("search.hint")}</p>
            ) : (
              <>
                {hist.k.length > 0 && (
                  <div className="flex items-center justify-between px-3 pb-1 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("search.recent")}</p>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => save({ ...hist, k: [] })}>{t("search.clearAll")}</button>
                  </div>
                )}
                {hist.k.map((k, n) => (
                  <div key={k} {...opt(`k-${n}`)}>
                    <Clock size={16} aria-hidden className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{k}</span>
                    <button type="button" aria-label={`${t("search.remove")} ${k}`} onClick={(e) => { e.stopPropagation(); save({ ...hist, k: hist.k.filter((x) => x !== k) }); }} className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                ))}
                {hist.v.length > 0 && (
                  <div className="flex items-center justify-between px-3 pb-1 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("search.viewed")}</p>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => save({ ...hist, v: [] })}>{t("search.clearAll")}</button>
                  </div>
                )}
                {hist.v.map((i) => <Row key={i.id} item={i} q="" props={opt(`v-${i.id}`)} />)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TINTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
function Row({ item, q, props }: { item: SearchItem; q: string; props: Record<string, unknown> }) {
  const tint = TINTS[[...item.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length]; // couleur stable par élément
  return (
    <div {...props}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: tint }}>{item.doc ? <FileText size={15} /> : item.title.trim().slice(0, 1).toUpperCase() || "#"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-muted"><Mark text={item.title} q={q} /></span>
        {item.sub && <span className="block truncate text-xs text-muted"><Mark text={item.sub} q={q} /></span>}
      </span>
      {item.href && <ArrowUpRight size={15} aria-hidden className="shrink-0 text-muted" />}
    </div>
  );
}
