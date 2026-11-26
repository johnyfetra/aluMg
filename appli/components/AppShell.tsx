"use client";
import { ExternalLink, FileText, Plus, RefreshCw, Settings2, Wifi } from "lucide-react";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";
import { go, href, useRoute } from "../lib/route";
import { useQuotes, useSettings } from "../lib/store";
import { useTrial } from "../lib/trial";
import Editor from "./Editor";
import Preview from "./Preview";
import QuoteList, { blankQuote } from "./QuoteList";
import SettingsScreen from "./SettingsScreen";
import WorkshopScreen from "./WorkshopScreen";

// Application web : là où l'essai mène (compte menuisier, mêmes devis, envoi au client).
export const WEB_SIGNUP = "https://alumg.vercel.app/inscription?role=menuisier";

// Cadre de l'application : barre du haut, écran courant, barre d'onglets en bas (pouce).
export default function AppShell() {
  const { t } = useI18n();
  const { screen, params } = useRoute();
  const { settings } = useSettings();
  const { quotes, save } = useQuotes();
  const trial = useTrial();
  const id = params.get("id") ?? "";
  // nouvel écran : on repart du haut (la navigation par ancre garderait la position de l'écran précédent)
  useEffect(() => window.scrollTo(0, 0), [screen, id]);
  // impression : window.print() ne fait rien dans le WebView, le pont natif (MainActivity) ouvre le service d'impression d'Android
  useEffect(() => {
    const native = (window as { AluMgPrint?: { print: (title: string) => void } }).AluMgPrint;
    if (native) window.print = () => native.print(document.title);
  }, []);
  if (!settings || !quotes || trial.state === "loading") return <Splash />; // prérendu et premier contrôle de l'essai
  if (trial.state === "ended") return <TrialEnded />;
  if (trial.state === "activate") return <Activate retry={trial.retry} />;
  const left = trial.left;
  const create = () => {
    const q = blankQuote(settings, quotes);
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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-line bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur print:hidden">
        <LogoMark size={28} />
        <p className="text-base font-bold">AluMg <span className="font-medium text-muted">Devis</span></p>
        <a href={WEB_SIGNUP} target="_blank" rel="noopener" className="ml-auto rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn">{t("app.trialLeft").replace("{n}", String(left))}</a>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-40 pt-4">
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
        ) : screen === "reglages" ? (
          <SettingsScreen settings={settings} initialTab={params.get("tab")} />
        ) : (
          <QuoteList quotes={quotes} settings={settings} />
        )}
      </main>
      {/* nouveau devis depuis n'importe quel écran : au-dessus de la barre d'onglets, à droite (pouce), la page garde une marge en bas pour ne rien cacher */}
      <button type="button" onClick={create} aria-label={t("nav.new")} title={t("nav.new")} className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-[0_10px_24px_-6px_rgb(0_0_0/0.45)] transition-transform active:scale-95 print:hidden">
        <Plus size={28} strokeWidth={2.5} aria-hidden />
      </button>
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        {tabs.map(({ to, label, Icon, on }) => (
          <a key={to} href={href(to)} aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${on ? "text-primary" : "text-muted"}`}>
            <Icon size={22} aria-hidden />
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
