import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // dossier de build alternatif : permet de lancer les tests de bout en bout sans toucher au serveur de développement
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  // PGlite charge un binaire WASM : à ne pas empaqueter
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
