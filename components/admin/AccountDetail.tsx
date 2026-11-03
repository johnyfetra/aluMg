"use client";
import { ArrowLeft, BadgeCheck, KeyRound, ShieldAlert, Trash2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { mutate } from "swr";
import { AccountStatus, adminError, ListSkeleton, TempPassword } from "@/components/admin/AdminUi";
import { useConfirm } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/Feedback";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/ui";
import { request, useAdminUser } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { ROLES, type Role } from "@/lib/model";

const refreshAdmin = () => mutate((k) => typeof k === "string" && k.startsWith("/api/admin/"));

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex justify-between gap-3 py-2 text-sm"><dt className="text-muted">{label}</dt><dd className="min-w-0 truncate text-right font-medium">{children}</dd></div>;
}

// Fiche d'un compte : informations, activité, actions (rôle, badge, suspension, réinitialisation) et suppression avec identifiant retapé.
export default function AccountDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const ask = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const { data: u, error, isLoading, mutate: retry } = useAdminUser(id);
  const [role, setRole] = useState<Role | "">("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState retry={() => retry()} />;
  if (isLoading || !u) return <ListSkeleton rows={4} />;

  const date = (d: string | Date | null) => (d ? new Date(d).toLocaleString(DATE_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" }) : t("admin.never"));
  const locked = u.protected || u.self;
  const identifier = u.email || u.phone;
  // une action : appel, rafraîchissement des listes, message ; l'erreur s'affiche selon sa cause
  const act = async (run: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await run();
      await refreshAdmin();
      toast.success(done, u.name);
      return true;
    } catch (e) {
      toast.error(adminError(e, t));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!(await ask({ message: t("admin.resetConfirm"), tone: "danger", confirmLabel: t("admin.reset") }))) return;
    await act(async () => setPassword((await request<{ password: string }>("POST", `/api/admin/users/${id}/reset`)).password), t("admin.resetDone"));
  };
  const suspend = async (on: boolean) => {
    if (on && !(await ask({ message: t("admin.suspendConfirm"), tone: "danger", confirmLabel: t("admin.suspend") }))) return;
    await act(() => request("PATCH", `/api/admin/users/${id}`, { suspended: on }), t(on ? "admin.suspendedDone" : "admin.reactivatedDone"));
  };
  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await act(() => request("DELETE", `/api/admin/users/${id}`, { confirm }), t("admin.deleted"))) router.replace("/admin/comptes");
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/comptes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden />{t("admin.back")}</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={u.name} size={56} round />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="truncate">{u.name}</span>{u.badge && <BadgeCheck size={20} className="shrink-0 text-primary" aria-label={t("admin.badge")} />}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{t(`admin.role.${u.role}`)} · <AccountStatus suspended={!!u.suspendedAt} verified={u.verified} /></p>
        </div>
      </div>

      {locked && <p role="note" className="card flex items-start gap-3 border-warn/40 text-sm"><ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-warn" />{t(u.protected ? "admin.protected" : "admin.self")}</p>}
      {password && <TempPassword title={t("admin.resetDone")} password={password} onDone={() => setPassword("")} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="h-id">
          <h2 id="h-id" className="mb-2 font-semibold">{t("admin.identity")}</h2>
          <dl className="divide-y divide-line">
            <Info label={t("admin.email")}>{u.email || "—"}</Info>
            <Info label={t("admin.phone")}>{u.phone || "—"}</Info>
            <Info label={t("admin.createdAt")}>{date(u.createdAt)}</Info>
          </dl>
        </section>
        <section className="card" aria-labelledby="h-act">
          <h2 id="h-act" className="mb-2 font-semibold">{t("admin.activity")}</h2>
          <dl className="divide-y divide-line">
            <Info label={t("admin.lastLogin")}>{date(u.lastLoginAt)}</Info>
            <Info label={t("admin.lastSeen")}>{date(u.lastSeenAt)}</Info>
            <Info label={t("admin.sessions")}>{u.sessions}</Info>
            <Info label={t("admin.quotesOwned")}>{u.quotesOwned}</Info>
            <Info label={t("admin.quotesAsClient")}>{u.quotesAsClient}</Info>
          </dl>
        </section>
      </div>

      <section className="card space-y-4" aria-labelledby="h-actions">
        <h2 id="h-actions" className="font-semibold">{t("admin.actions")}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-56">
            <Select aria-label={t("admin.role")} value={role || u.role} onChange={(v) => setRole(v as Role)} disabled={locked || busy} options={ROLES.map((r) => ({ value: r, label: t(`admin.role.${r}`) }))} />
          </div>
          <button type="button" className="btn-secondary" disabled={locked || busy || !role || role === u.role} onClick={() => act(() => request("PATCH", `/api/admin/users/${id}`, { role }), t("admin.roleSaved")).then(() => setRole(""))}>{t("admin.saveRole")}</button>
        </div>
        {u.role === "menuisier" && (u.slug ? (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => act(() => request("PATCH", `/api/admin/menuisiers/${u.slug}`, { verified: !u.badge }), t("admin.badgeSaved"))}>
            <BadgeCheck size={16} aria-hidden />{t(u.badge ? "admin.badgeOff" : "admin.badgeOn")}
          </button>
        ) : <p className="text-sm text-muted">{t("admin.noProfile")}</p>)}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={locked || busy} onClick={reset}><KeyRound size={16} aria-hidden />{t("admin.reset")}</button>
          {u.suspendedAt
            ? <button type="button" className="btn-secondary" disabled={locked || busy} onClick={() => suspend(false)}><UserCheck size={16} aria-hidden />{t("admin.reactivate")}</button>
            : <button type="button" className="btn-danger" disabled={locked || busy} onClick={() => suspend(true)}><UserX size={16} aria-hidden />{t("admin.suspend")}</button>}
        </div>
      </section>

      {!locked && (
        <form onSubmit={remove} className="card space-y-3 border-danger/30" aria-labelledby="h-danger">
          <h2 id="h-danger" className="font-semibold text-danger">{t("admin.danger")}</h2>
          <p className="text-sm">{t("admin.deleteWarn")} <strong className="select-all font-mono">{identifier}</strong></p>
          <div className="flex flex-wrap gap-2">
            <input className="input max-w-sm" aria-label={t("admin.deleteLabel")} autoComplete="off" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button type="submit" className="btn-danger" disabled={busy || confirm.trim().toLowerCase() !== identifier.toLowerCase()}><Trash2 size={16} aria-hidden />{t("admin.delete")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
