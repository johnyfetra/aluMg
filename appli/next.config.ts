import path from "node:path";
import type { NextConfig } from "next";

// AluMg Devis : application Android 100 % locale (sans compte ni réseau). Export statique emballé par Capacitor (dossier android/).
// Elle réutilise lib/ et components/ du site : la racine de Turbopack est le dépôt entier.
const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: {
    root: path.join(__dirname, ".."),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
