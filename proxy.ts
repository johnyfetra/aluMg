import { NextResponse, type NextRequest } from "next/server";
import { HIDDEN, MVP } from "@/lib/mvp";

// Contrôle optimiste : sans cookie de session, on renvoie vers la connexion (en retenant la page demandée).
// La vraie vérification (session valide en base) se fait dans chaque route d'API.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
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

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
