"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "../ui";
import { logout } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Pied du tiroir mobile : qui est connecté, et la déconnexion à portée de pouce.
export default function DrawerUser({ name, email, avatar }: { name: string; email?: string | null; avatar?: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const signOut = async () => {
    await logout();
    router.replace("/connexion");
  };
  return (
    <div className="mx-4 mt-6 flex items-center gap-3 rounded-2xl bg-(--side-hover) p-3 lg:hidden">
      <Avatar name={name} src={avatar ?? undefined} size={40} round />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {email && <p className="truncate text-xs text-(--side-muted)">{email}</p>}
      </div>
      <button type="button" onClick={signOut} aria-label={t("menu.logout")} data-tooltip={t("menu.logout")} className="grid size-10 shrink-0 place-items-center rounded-full text-(--side-fg) transition-colors hover:bg-(--side-active)">
        <LogOut size={18} aria-hidden />
      </button>
    </div>
  );
}
