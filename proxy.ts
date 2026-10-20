import { NextResponse, type NextRequest } from "next/server";

// Contrôle optimiste : sans cookie de session, on renvoie vers la connexion (en retenant la page demandée).
// La vraie vérification (session valide en base) se fait dans chaque route d'API.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // pages ouvertes à tous : accueil, annuaire et profils des menuisiers, connexion, inscription
  const open = pathname === "/" || pathname === "/connexion" || pathname === "/inscription" || pathname === "/menuisiers" || pathname.startsWith("/menuisiers/");
  if (!open && !req.cookies.has("alumg_session")) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
