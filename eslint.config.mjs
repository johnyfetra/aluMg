import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Le navigateur ne doit jamais embarquer les modules serveur (base de données, sessions, API) : seuls les `import type` sont permis.
  // Une constante partagée appartient à lib/model.ts. (Voir docs/architecture.md.)
  {
    files: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/client.ts", "lib/i18n.tsx", "lib/theme.ts", "lib/pdf.ts", "lib/drawing.ts", "lib/describe.ts", "lib/calc.ts", "lib/procure.ts", "lib/totals.ts"],
    ignores: ["app/api/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/db", "@/lib/db/*", "@/lib/repo", "@/lib/profiles", "@/lib/workflow", "@/lib/auth", "@/lib/password", "@/lib/api", "./db", "./db/*", "./repo", "./profiles", "./workflow", "./auth", "./password", "./api"], allowTypeImports: true, message: "Module serveur : à importer seulement avec `import type` côté navigateur." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
