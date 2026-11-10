import { describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const { getDb, schema } = await import("./db");
const v = await import("./visits");

const UA = "Mozilla/5.0 (Linux; Android 13) Chrome/120";
describe("mesure des visites", () => {
  it("compte un visiteur par jour et ses pages vues, ignore les robots", async () => {
    const day1 = new Date("2026-11-10T08:00:00Z");
    expect(await v.recordVisit("1.2.3.4", UA, day1)).toBe(true);
    await v.recordVisit("1.2.3.4", UA, day1);
    await v.recordVisit("5.6.7.8", UA, day1);
    expect(await v.recordVisit("9.9.9.9", "Googlebot/2.1", day1)).toBe(false);
    await v.recordVisit("1.2.3.4", UA, new Date("2026-11-11T08:00:00Z"));
    const rows = await (await getDb()).select().from(schema.visits);
    expect(rows.filter((r) => r.day === "2026-11-10").map((r) => r.views).sort()).toEqual([1, 2]);
    expect(rows).toHaveLength(3);
  });
  it("l'empreinte change chaque jour et ne contient pas l'adresse", () => {
    const a = v.visitorHash("1.2.3.4", UA, "2026-11-10");
    expect(a).not.toBe(v.visitorHash("1.2.3.4", UA, "2026-11-11"));
    expect(a).not.toContain("1.2.3.4");
  });
});
