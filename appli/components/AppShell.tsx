"use client";
import { ArrowLeft, ExternalLink, Moon, Sun, FileText, Plus, RefreshCw, Settings2, Wifi } from "lucide-react";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/theme";
import type { WorkType } from "@/lib/model";
import { go, href, useRoute } from "../lib/route";
import { useQuotes, useSettings } from "../lib/store";
import { useTrial } from "../lib/trial";
import Editor from "./Editor";
import Preview from "./Preview";
import QuoteList, { blankQuote } from "./QuoteList";
import SettingsScreen from "./SettingsScreen";
import WorkPicker, { lineOf } from "@/components/quote/WorkPicker";
import WorkshopScreen from "./WorkshopScreen";

// Application web : là où l'essai mène (compte menuisier, mêmes devis, envoi au client).
export const WEB_HOME = "https://alumg.vercel.app";
export const WEB_SIGNUP = `${WEB_HOME}/inscription?role=menuisier`;

// Cadre de l'application : barre du haut, écran courant, barre d'onglets en bas (pouce).
export default function AppShell() {
  const { t } = useI18n();
  const { screen, params } = useRoute();
  const { settings } = useSettings();
  const { quotes, save } = useQuotes();
  const trial = useTrial();
  const theme = useTheme();
  const id = params.get("id") ?? "";
  // nouvel écran : on repart du haut (la navigation par ancre garderait la position de l'écran précédent)
  // corps en bloc : les WebView récents font renvoyer une promesse à scrollTo, que React prendrait pour la fonction de nettoyage
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, id]);
  // impression : window.print() ne fait rien dans le WebView, le pont natif (MainActivity) ouvre le service d'impression d'Android
  useEffect(() => {
    const native = (window as { AluMgPrint?: { print: (title: string) => void } }).AluMgPrint;
    if (native) window.print = () => native.print(document.title);
  }, []);
  if (!settings || !quotes || trial.state === "loading") return <Splash />; // prérendu et premier contrôle de l'essai
  if (trial.state === "ended") return <TrialEnded />;
  if (trial.state === "activate") return <Activate retry={trial.retry} />;
  const left = trial.left;
  // le devis n'est créé qu'une fois l'ouvrage choisi : pas de devis vide laissé dans la liste
  const create = (w: WorkType) => {
    const q = blankQuote(settings, quotes, lineOf(w, settings));
    save(q);
    go("devis", { id: q.id });
  };
  const quote = quotes.find((q) => q.id === id);
  const needsQuote = screen === "devis" || screen === "atelier" || screen === "apercu";
  const tabs = [
    { to: "list", label: t("nav.quotes"), Icon: FileText, on: screen !== "reglages" },
    { to: "reglages", label: t("nav.settings"), Icon: Settings2, on: screen === "reglages" },
  ] as const;

  return (
    // barre du haut compacte (3rem) : --head est sa hauteur, sous laquelle se collent l'aperçu de l'ouvrage et le zoom du PDF.
    // Marges latérales réduites : les blocs prennent presque toute la largeur du téléphone.
    <div className="flex min-h-dvh flex-col" style={{ "--head": "3rem" } as React.CSSProperties}>
      <header className="sticky top-0 z-30 flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-2 border-b border-line bg-surface/90 px-2.5 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
        <a href={WEB_HOME} target="_blank" rel="noopener" className="flex min-w-0 items-center gap-2">
          <LogoMark size={24} />
          <span className="truncate text-sm font-bold">AluMg <span className="font-medium text-muted">Devis</span></span>
        </a>
        <a href={WEB_SIGNUP} target="_blank" rel="noopener" title={t("app.trialLeft").replace("{n}", String(left))} className="ml-auto whitespace-nowrap rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn">{t("app.trialShort").replace("{n}", String(left))}</a>
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t("theme.toggle")} title={t("theme.toggle")} className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted">
          {theme === "dark" ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
        </button>
      </header>
      <main className={`mx-auto w-full max-w-3xl flex-1 px-2.5 pt-3 ${screen === "list" ? "pb-36" : "pb-20"}`}>
        {needsQuote && !quote ? (
          <p className="card">
            {t("editor.notFound")}{" "}
            <a href={href("list")} className="text-primary underline">{t("common.back")}</a>
          </p>
        ) : screen === "devis" ? (
          <Editor key={quote!.id} quote={quote!} settings={settings} />
        ) : screen === "atelier" ? (
          <WorkshopScreen quote={quote!} settings={settings} />
        ) : screen === "apercu" ? (
          <Preview quote={quote!} settings={settings} />
        ) : screen === "nouveau" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <a href={href("list")} className="btn-secondary !min-h-10 !px-2.5" aria-label={t("common.back")}>
                <ArrowLeft size={18} aria-hidden />
              </a>
              <h1 className="text-xl font-bold">{t("editor.titleNew")}</h1>
            </div>
            <WorkPicker onPick={create} />
          </div>
        ) : screen === "reglages" ? (
          <SettingsScreen settings={settings} initialTab={params.get("tab")} />
        ) : (
          <QuoteList quotes={quotes} />
        )}
      </main>
      {/* nouveau devis depuis la liste (ailleurs il cacherait des champs) : au-dessus de la barre d'onglets, à droite (pouce), la page garde une marge en bas pour ne rien cacher */}
      {screen === "list" && <button type="button" onClick={() => go("nouveau")} aria-label={t("nav.new")} title={t("nav.new")} className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-3 z-40 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-[0_10px_24px_-6px_rgb(0_0_0/0.45)] transition-transform active:scale-95 print:hidden">
        <Plus size={28} strokeWidth={2.5} aria-hidden />
      </button>}
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        {tabs.map(({ to, label, Icon, on }) => (
          <a key={to} href={href(to)} aria-current={on ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-primary" : "text-muted"}`}>
            <Icon size={20} aria-hidden />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// Fin de l'essai : plus d'accès à l'outil, seulement le chemin vers l'application web (le lien externe s'ouvre dans le navigateur du téléphone).
function TrialEnded() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark size={56} />
      <h1 className="text-2xl font-bold">{t("app.trialEndTitle")}</h1>
      <p className="leading-7 text-muted">{t("app.trialEndText")}</p>
      <a href={WEB_SIGNUP} target="_blank" rel="noopener" className="btn-primary !min-h-12 !px-6">
        {t("app.goWeb")}
        <ExternalLink size={17} aria-hidden />
      </a>
    </main>
  );
}

// Premier lancement sans réseau : l'essai s'active une seule fois en ligne (il est attaché au téléphone, pas à l'installation).
function Activate({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Wifi size={48} aria-hidden className="text-primary" />
      <h1 className="text-2xl font-bold">{t("app.activateTitle")}</h1>
      <p className="leading-7 text-muted">{t("app.activateText")}</p>
      <button type="button" className="btn-primary !min-h-12 !px-6" onClick={retry}>
        <RefreshCw size={17} aria-hidden />
        {t("app.activateRetry")}
      </button>
    </main>
  );
}

// Écran de chargement : rendu dans le HTML exporté, il s'affiche dès l'ouverture, avant que l'application ne lise ses données.
function Splash() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg" aria-busy="true">
      <div className="splash-logo flex flex-col items-center gap-4">
        <span className="grid size-24 place-items-center rounded-[1.75rem] bg-[#1A74C7] shadow-[0_20px_50px_-12px_rgb(26_116_199/0.6)]">
          <svg viewBox="0 0 32 32" className="size-14" aria-hidden><path d="M4 4h8v16h16v8H4z" fill="#EEF3F8" /><path d="M16 4h12v12H16z" fill="#FF9F43" /></svg>
        </span>
        <p className="text-xl font-bold">AluMg <span className="font-medium text-muted">Devis</span></p>
      </div>
      <span className="h-1 w-32 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="AluMg Devis">
        <span className="splash-bar block h-full w-2/5 rounded-full bg-primary" />
      </span>
    </main>
  );
}
