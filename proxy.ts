import { NextResponse, type NextRequest } from "next/server";
import { HIDDEN, MVP } from "@/lib/mvp";

// Deux rôles : (1) contrôle optimiste des pages — sans cookie de session on renvoie vers la connexion (la vraie vérification, session valide
// en base, se fait dans chaque route d'API) ; (2) défense en profondeur contre le CSRF — une requête d'API qui modifie des données et dont
// l'en-tête Origin désigne un autre site est refusée (en plus du cookie SameSite=Lax).
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (!SAFE.has(req.method) && origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
    return NextResponse.next();
  }

  // MVP : l'accueil public et les pages hors devis renvoient vers le tableau de bord (la connexion si pas de session, via le contrôle ci-dessous)
  if (MVP && (pathname === "/" || HIDDEN.some((h) => pathname === h || pathname.startsWith(`${h}/`)))) return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
  // pages ouvertes à tous : accueil, annuaire et profils des menuisiers, connexion, inscription
  const open = pathname === "/" || pathname === "/connexion" || pathname === "/inscription" || pathname === "/menuisiers" || pathname.startsWith("/menuisiers/") || pathname === "/demo-render"; // /demo-render : page de développement (404 en production)
  if (!open && !req.cookies.has("alumg_session")) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
