"use client";
import RoleBadge from "@/components/RoleBadge";
import { BadgeCheck, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { AccountStatus, adminError, ListSkeleton, Pager, TempPassword } from "@/components/admin/AdminUi";
import ChatButton from "@/components/ChatButton";
import { ErrorState, EmptyState } from "@/components/Feedback";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";
import { Avatar, Field } from "@/components/ui";
import type { AdminUserRow } from "@/lib/admin";
import { request, useAdminUsers } from "@/lib/client";
import { DATE_LOCALE, useI18n } from "@/lib/i18n";
import { ROLES, type Role } from "@/lib/model";

type Draft = { role: Role; name: string; email: string; phone: string };
const EMPTY: Draft = { role: "client", name: "", email: "", phone: "" };

function Row({ u }: { u: AdminUserRow }) {
  const { t, locale } = useI18n();
  const date = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" }) : t("admin.never"));
  return (
    <li className="flex items-center gap-2 sm:gap-0 sm:border-b sm:border-line">
      <Link href={`/admin/comptes/${u.id}`} className="card min-w-0 flex-1 flex items-center gap-3 !p-3 transition-shadow hover:shadow-md sm:grid sm:grid-cols-[minmax(0,2fr)_8rem_8rem_9rem_9rem] sm:gap-4 sm:rounded-none sm:!border-0 sm:!px-4 sm:shadow-none sm:hover:bg-surface-2">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={u.name} size={40} round />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{u.name}</span>
              {u.badge && <BadgeCheck size={15} className="shrink-0 text-primary" aria-label={t("admin.badge")} />}
            </span>
            <span className="block truncate text-sm text-muted">{u.email || u.phone}</span>
            <span className="mt-1 flex flex-wrap gap-1.5 sm:hidden">
              <RoleBadge role={u.role} />
              <AccountStatus suspended={u.suspended} verified={u.verified} />
            </span>
          </span>
        </span>
        <span className="hidden sm:block"><RoleBadge role={u.role} /></span>
        <span className="hidden sm:block"><AccountStatus suspended={u.suspended} verified={u.verified} /></span>
        <span className="hidden text-sm text-muted sm:block">{date(u.lastSeenAt)}</span>
        <span className="hidden text-sm text-muted sm:block">{date(u.createdAt)}</span>
      </Link>
      <span className="shrink-0 sm:w-28 sm:pr-3">{u.role !== "admin" && <ChatButton compact short={t("admin.write")} target={{ user: u.id }} label={t("admin.contact")} />}</span>
    </li>
  );
}

function CreateForm({ onCreated, onCancel }: { onCreated: (password: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await request<{ id: string; password: string }>("POST", "/api/admin/users", draft);
      await mutate((k) => typeof k === "string" && k.startsWith("/api/admin/"));
      onCreated(r.password);
    } catch (err) {
      setError(adminError(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card space-y-3 border-primary/40">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field htmlFor="ad-n" label={t("admin.name")}><input id="ad-n" className="input" required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field htmlFor="ad-e" label={t("admin.email")}><input id="ad-e" className="input" type="email" maxLength={160} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <Field htmlFor="ad-p" label={t("admin.phone")}><input id="ad-p" className="input" type="tel" maxLength={30} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
        <Field htmlFor="ad-r" label={t("admin.role")}><Select id="ad-r" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v as Role })} options={ROLES.map((r) => ({ value: r, label: t(`admin.role.${r}`) }))} /></Field>
      </div>
      <p className="text-xs text-muted">{t("admin.contactHint")}</p>
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy || (!draft.email.trim() && !draft.phone.trim())}>{t("admin.create")}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>{t("admin.cancel")}</button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ role: "", status: "", verified: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState("");
  // la recherche part 300 ms après la dernière frappe : une requête par intention, pas par touche
  useEffect(() => {
    const id = setTimeout(() => { setSearch(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [q]);
  const { data, error, isLoading, mutate: retry } = useAdminUsers({ q: search, ...filters, page: String(page) });
  const filter = (k: keyof typeof filters) => (v: string) => { setFilters({ ...filters, [k]: v }); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.accounts")}</h1>
          <p className="text-sm text-muted">{t("admin.accountsSub")}</p>
        </div>
        {!creating && !password && <button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />{t("admin.create")}</button>}
      </div>

      {password && <TempPassword title={t("admin.created")} password={password} onDone={() => setPassword("")} />}
      {creating && <CreateForm onCancel={() => setCreating(false)} onCreated={(p) => { setCreating(false); setPassword(p); toast.success(t("admin.created")); }} />}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" type="search" maxLength={80} aria-label={t("admin.search")} placeholder={t("admin.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label={t("admin.role")} value={filters.role} onChange={filter("role")} options={[{ value: "", label: t("admin.allRoles") }, ...ROLES.map((r) => ({ value: r, label: t(`admin.role.${r}`) }))]} />
        <Select aria-label={t("admin.allStatus")} value={filters.status} onChange={filter("status")} options={[{ value: "", label: t("admin.allStatus") }, { value: "active", label: t("admin.active") }, { value: "suspended", label: t("admin.suspended") }]} />
        <Select aria-label={t("admin.allVerified")} value={filters.verified} onChange={filter("verified")} options={[{ value: "", label: t("admin.allVerified") }, { value: "yes", label: t("admin.verified") }, { value: "no", label: t("admin.unverified") }]} />
      </div>

      {error ? <ErrorState retry={() => retry()} /> : isLoading || !data ? <ListSkeleton /> : data.items.length === 0 ? <EmptyState message={t("admin.empty")} /> : (
        <div className="space-y-4">
          <div className="sm:card sm:overflow-hidden sm:!p-0">
            <div aria-hidden className="hidden grid-cols-[minmax(0,2fr)_8rem_8rem_9rem_9rem_7rem] gap-4 border-b border-line bg-surface-2 pl-4 pr-0 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
              <span>{t("admin.identity")}</span><span>{t("admin.role")}</span><span>{t("admin.status")}</span><span>{t("admin.lastSeen")}</span><span>{t("admin.createdAt")}</span><span />
            </div>
            <ul className="space-y-2 sm:space-y-0">{data.items.map((u) => <Row key={u.id} u={u} />)}</ul>
          </div>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} noun={t("admin.results")} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
