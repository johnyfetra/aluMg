import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Toute table créée après 0030 (qui active le RLS sur les tables existantes) doit l'activer dans sa migration :
// sans RLS, l'API publique de Supabase (clé anon) la lit et la modifie.
describe("migrations", () => {
  it("activent le RLS sur chaque nouvelle table", () => {
    const missing = readdirSync("drizzle")
      .filter((f) => f.endsWith(".sql") && Number(f.slice(0, 4)) > 30)
      .flatMap((f) => {
        const sql = readFileSync(`drizzle/${f}`, "utf8");
        return [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?(?:public"?\."?)?(\w+)"?/gi)]
          .map((m) => m[1])
          .filter((t) => !new RegExp(`ALTER TABLE "?(?:public"?\\.)?"?${t}"? ENABLE ROW LEVEL SECURITY`, "i").test(sql))
          .map((t) => `${f}: ${t}`);
      });
    expect(missing).toEqual([]);
  });
});
