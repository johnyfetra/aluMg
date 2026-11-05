"use client";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { homeFor, useSession } from "@/lib/client";

// Un menuisier n'ouvre pas l'espace client et inversement : on le renvoie vers son espace.
// (Contrôle d'affichage seulement : les droits réels sont vérifiés par chaque route d'API.)
export default function RoleGuard({ allow, children }: { allow: ("client" | "menuisier" | "admin")[]; children: ReactNode }) {
  const { data: me, isLoading } = useSession();
  const router = useRouter();
  const ok = !!me && me.verified && allow.includes(me.role);
  useEffect(() => {
    if (isLoading) return;
    // le chemin est lu ici (navigateur seulement) pour que le layout reste prérendu
    if (!me) router.replace(`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`);
    else if (!me.verified) router.replace("/verification"); // téléphone ou e-mail à confirmer d'abord
    else if (!ok) router.replace(homeFor(me.role));
  }, [isLoading, me, ok, router]);
  // la page est rendue dès le départ (chargement plus rapide, navigation instantanée) mais masquée tant que le rôle n'est pas confirmé
  return <div hidden={!ok}>{children}</div>;
}
