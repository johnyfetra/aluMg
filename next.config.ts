import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // dossier de build alternatif : permet de lancer les tests de bout en bout sans toucher au serveur de développement
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  poweredByHeader: false,
  // En-têtes de sécurité sur toutes les réponses.
  // shortcut: script-src garde 'unsafe-inline' (scripts de démarrage de Next, thème) ; passer à une CSP à nonce via proxy.ts dès que les pages
  // sont rendues dynamiquement (voir node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md). frame-ancestors 'none' protège déjà du clickjacking.
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: data:",
      "font-src 'self' data:",
      `connect-src 'self'${dev ? " ws: wss:" : ""}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
          ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
    ];
  },
  // PGlite charge un binaire WASM : à ne pas empaqueter
  // les migrations SQL sont lues à l'exécution (lib/db) : à embarquer dans les fonctions serverless
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
