import { NextResponse, type NextRequest } from "next/server";

// Contrôle optimiste : sans cookie de session, on renvoie vers la connexion.
// La vraie vérification (session valide en base) se fait dans chaque route d'API.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/connexion" || pathname === "/inscription";
  if (!isAuthPage && !req.cookies.has("alumg_session")) return NextResponse.redirect(new URL("/connexion", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
