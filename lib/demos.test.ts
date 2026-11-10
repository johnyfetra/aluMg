import { describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const demos = await import("./demos");

const now = new Date("2026-11-10T08:00:00Z"); // mardi, heure de Madagascar 11 h
const base = { mode: "onsite" as const, name: "Rivo Rakoto", phone: "034 11 222 33", place: "Analakely, face pharmacie", day: "2026-11-12", slot: "08:30", note: "" };

describe("rendez-vous de démonstration", () => {
  it("refuse un numéro invalide ou un lieu trop court", () => {
    expect(demos.demoSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
    expect(demos.demoSchema.safeParse({ ...base, place: "Tana" }).success).toBe(false);
    expect(demos.demoSchema.safeParse(base).success).toBe(true);
    expect(demos.demoSchema.parse({ ...base, mode: "online", place: "x" }).place).toBe(""); // en ligne : pas de lieu
  });

  it("prend un créneau une seule fois et ne publie que jour et heure", async () => {
    expect(await demos.bookDemo(base, now)).toEqual({ ok: true });
    expect(await demos.bookDemo({ ...base, phone: "034 99 888 77" }, now)).toEqual({ ok: false, error: "slot_taken" });
    expect(await demos.takenSlots(now)).toEqual(["2026-11-12 08:30"]);
  });

  it("un seul rendez-vous à venir par numéro, quelle que soit l'écriture du numéro", async () => {
    expect(await demos.bookDemo({ ...base, phone: "+261 34 11 222 33", slot: "10:00" }, now)).toEqual({ ok: false, error: "already_booked" });
  });

  it("refuse une heure à moins d'une heure d'un rendez-vous pris", async () => {
    expect(await demos.bookDemo({ ...base, phone: "032 00 000 02", slot: "09:00" }, now)).toEqual({ ok: false, error: "slot_taken" });
    expect(await demos.bookDemo({ ...base, phone: "032 00 000 02", slot: "09:30" }, now)).toEqual({ ok: true });
  });

  it("refuse un créneau hors calendrier", async () => {
    expect(await demos.bookDemo({ ...base, phone: "032 00 000 01", day: "2026-11-15" }, now)).toEqual({ ok: false, error: "slot_unavailable" });
  });

  it("libère le créneau d'un rendez-vous annulé, et refuse de réactiver un créneau repris", async () => {
    const [first] = (await demos.listDemos({ status: "new" })).items;
    expect(await demos.setDemoStatus(first.id, "cancelled")).toBe("ok");
    expect(await demos.bookDemo({ ...base, phone: "034 99 888 77" }, now)).toEqual({ ok: true });
    expect(await demos.setDemoStatus(first.id, "new")).toBe("slot_taken");
  });
});
