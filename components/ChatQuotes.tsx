"use client";
import { FilePlus2, Hash } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "./ui";
import { useCitableQuotes, useContacts } from "@/lib/client";
import { type T } from "@/lib/i18n";
import type { ConversationView } from "@/lib/chat";
import type { Status } from "@/lib/model";

type Citable = { id: string; number: string; project: string; status: string };

// Bandeau « devis » d'une conversation : les devis échangés entre les deux parties (un clic pour en citer un dans le message),
// et le raccourci pour en demander un (client) ou en préparer un pour ce client (menuisier).
export default function ChatQuotes({ conv, onCite, t }: { conv: ConversationView; onCite: (q: Citable) => void; t: T }) {
  const { data: quotes = [] } = useCitableQuotes(conv.id, true);
  const toClient = conv.other.role === "client"; // l'utilisateur connecté est le menuisier
  const { data: contacts = [] } = useContacts(toClient);
  const contact = contacts.find((c) => c.account?.id === conv.other.id);
  const action = toClient
    ? { href: `/devis/nouveau?${contact ? `contact=${contact.id}&` : ""}conv=${conv.id}`, label: t("msg.newQuote") }
    : conv.other.slug ? { href: `/espace-client/nouvelle?menuisier=${conv.other.slug}`, label: t("msg.askQuote") } : null;
  if (!quotes.length && !action) return null;
  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
      <ul aria-label={t("msg.quotesBar")} className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {quotes.length === 0 && <li className="whitespace-nowrap py-1 text-xs text-muted">{t("msg.noQuotes")}</li>}
        {quotes.map((q) => (
          <li key={q.id} className="shrink-0">
            <button type="button" onClick={() => onCite(q)} title={q.project || q.number} aria-label={`${t("msg.cite")} ${q.number}`} className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2/50 py-1 pl-2.5 pr-1.5 text-xs font-semibold transition-colors hover:border-primary">
              <Hash size={13} aria-hidden className="text-primary" />
              {q.number.replace(/^DV-\d{4}-/, "")}
              <StatusBadge status={q.status as Status} label={t(`status.${q.status as Status}`)} />
            </button>
          </li>
        ))}
      </ul>
      {action && (
        <Link href={action.href} className="btn-secondary !min-h-9 shrink-0 !px-3 text-xs">
          <FilePlus2 size={15} aria-hidden />
          <span className="max-sm:sr-only">{action.label}</span>
        </Link>
      )}
    </div>
  );
}
