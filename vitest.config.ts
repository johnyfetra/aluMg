import { defineConfig } from "vitest/config";

// `npm test` : tests unitaires et base (PGlite en mémoire). `npm run test:e2e` : API réelle, serveur lancé sur E2E_BASE_URL.
export default defineConfig({
  test: { include: process.env.E2E ? ["e2e/**/*.e2e.ts"] : ["lib/**/*.test.ts"], testTimeout: 30_000 },
});
