"use client";
import Brand from "./Brand";
import Link from "next/link";
import type { ReactNode } from "react";
import { LangMenu, ThemeSwitch, UserMenu } from "./Controls";
import { homeFor, useSession } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

// Habillage des pages ouvertes à tous (accueil, annuaire, profils) : aucune connexion n'est requise pour les consulter.
export default function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data: me } = useSession();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-3">
        {t("nav.skip")}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[110rem] items-center gap-2 px-3 sm:gap-4 sm:px-8 xl:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Brand compact />
            <span className="hidden text-lg font-bold tracking-tight min-[430px]:inline">AluMg</span>
          </Link>
          <nav aria-label={t("nav.main")} className="ml-2 hidden sm:block">
            <Link href="/menuisiers" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-2">
              {t("pub.menuisiers")}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <LangMenu />
            <ThemeSwitch />
            {me ? (
              <>
                <Link href={homeFor(me.role)} className="btn-secondary hidden !rounded-full sm:inline-flex">
                  {t("pub.myspace")}
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link href="/connexion" className="btn-secondary hidden !rounded-full sm:inline-flex">
                  {t("pub.login")}
                </Link>
                <Link href="/inscription" className="btn-primary !rounded-full">
                  {t("pub.signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-8 xl:px-10">
          <p>© AluMg — {t("pub.footer")}</p>
          <Link href="/menuisiers" className="font-medium text-primary hover:underline">
            {t("pub.menuisiers")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
