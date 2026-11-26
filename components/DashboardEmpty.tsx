import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

type Kind = "quote" | "chart" | "inbox" | "calm";

function Art({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 220 150" className="h-full w-full" aria-hidden focusable="false">
      <path d="M25 126c-10-25-4-72 28-94 31-21 91-20 123 1 31 21 31 69 8 92-24 24-148 26-159 1Z" fill="var(--primary)" opacity=".08" />
      <circle cx="184" cy="28" r="13" fill="var(--c2)" opacity=".22" />
      <circle cx="38" cy="43" r="5" fill="var(--c4)" opacity=".35" />
      {kind === "quote" && (
        <>
          <rect x="57" y="25" width="106" height="106" rx="13" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          <path d="M74 47h48M74 61h71M74 75h58" stroke="var(--muted)" strokeWidth="5" strokeLinecap="round" opacity=".5" />
          <rect x="74" y="91" width="71" height="22" rx="7" fill="var(--primary)" opacity=".14" />
          <path d="M109.5 96v12M103.5 102h12" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
          <path d="M146 21v22M135 32h22" stroke="var(--c2)" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {kind === "chart" && (
        <>
          <rect x="42" y="31" width="136" height="94" rx="14" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          <path d="M62 104h96" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
          <rect x="68" y="78" width="17" height="26" rx="5" fill="var(--c3)" opacity=".75" />
          <rect x="101" y="61" width="17" height="43" rx="5" fill="var(--c1)" opacity=".85" />
          <rect x="134" y="45" width="17" height="59" rx="5" fill="var(--c4)" opacity=".8" />
          <path d="m70 57 29-13 24 5 30-22" fill="none" stroke="var(--c2)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "inbox" && (
        <>
          <path d="M54 66h112l14 49a10 10 0 0 1-10 13H50a10 10 0 0 1-10-13l14-49Z" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          <path d="M43 104h39l9 12h38l9-12h39" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinejoin="round" />
          <rect x="72" y="24" width="76" height="67" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          <path d="M87 45h46M87 59h35" stroke="var(--muted)" strokeWidth="5" strokeLinecap="round" opacity=".48" />
          <path d="m101 76 7 7 15-17" fill="none" stroke="var(--c4)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "calm" && (
        <>
          <rect x="53" y="29" width="114" height="96" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          <path d="M65 41h90v72H65z" fill="var(--primary)" opacity=".12" />
          <path d="M110 41v72M65 79h90" stroke="var(--surface)" strokeWidth="6" />
          <path d="m79 92 13 13 35-40" fill="none" stroke="var(--c4)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M159 27v18M150 36h18" stroke="var(--c2)" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function DashboardEmpty({ kind, title, action, href, compact = false }: { kind: Kind; title: string; action?: string; href?: string; compact?: boolean }) {
  if (compact) return (
    <div className="flex min-h-28 items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5">
      <div className="h-20 w-28 shrink-0"><Art kind={kind} /></div>
      <p className="text-sm font-medium leading-snug text-muted">{title}</p>
    </div>
  );
  return (
    <div className="card grid items-center gap-5 overflow-hidden py-7 text-center sm:grid-cols-[minmax(0,1fr)_15rem] sm:px-8 sm:text-left">
      <div className="sm:order-1">
        <h2 className="text-xl font-bold">{title}</h2>
        {action && href && (
          <Link href={href} className="btn-primary mt-4">
            <Plus size={17} aria-hidden />
            {action}
            <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
      <div className="mx-auto h-36 w-52 sm:order-2"><Art kind={kind} /></div>
    </div>
  );
}
