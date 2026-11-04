"use client";
import { useI18n } from "@/lib/i18n";

// Pastille du rôle d'un compte, à côté de son nom : une couleur par rôle (menuisier = bois, client = bleu, équipe AluMg = vert).
const TONES = {
  menuisier: ["bg-primary/12 text-primary", "msg.joiner"],
  client: ["bg-info/15 text-info", "msg.client"],
  admin: ["bg-ok/15 text-ok", "msg.team"],
} as const;

export default function RoleBadge({ role, className = "" }: Readonly<{ role: keyof typeof TONES; className?: string }>) {
  const { t } = useI18n();
  const [tone, key] = TONES[role];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${tone} ${className}`}>{t(key)}</span>;
}
