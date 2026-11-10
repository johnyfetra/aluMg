import { describe, expect, it } from "vitest";
import { DEMO_HORIZON_DAYS, bookableDays, isBookable, madaDay, overlaps, slotsFor } from "./booking";

describe("créneaux de démonstration", () => {
  it("lit la date à l'heure de Madagascar (UTC+3)", () => {
    expect(madaDay(new Date("2026-11-10T20:59:00Z"))).toBe("2026-11-10");
    expect(madaDay(new Date("2026-11-10T21:00:00Z"))).toBe("2026-11-11");
  });

  it("ouvre de demain à l'horizon, sans les dimanches", () => {
    const days = bookableDays(new Date("2026-11-10T08:00:00Z")); // mardi
    expect(days[0]).toBe("2026-11-11");
    expect(days).not.toContain("2026-11-10");
    expect(days).not.toContain("2026-11-15"); // dimanche
    expect(days.length).toBeLessThan(DEMO_HORIZON_DAYS);
    expect(days.at(-1)! <= "2026-12-10").toBe(true);
  });

  it("heures libres par quart d'heure : 8 h–16 h en semaine, 8 h–11 h le samedi, rien le dimanche", () => {
    expect(slotsFor("2026-11-12")[0]).toBe("08:00");
    expect(slotsFor("2026-11-12").at(-1)).toBe("16:00");
    expect(slotsFor("2026-11-12")).toContain("09:45");
    expect(slotsFor("2026-11-14").at(-1)).toBe("11:00");
    expect(slotsFor("2026-11-15")).toHaveLength(0);
  });

  it("espace deux rendez-vous d'au moins une heure", () => {
    expect(overlaps("10:30", ["10:00"])).toBe(true);
    expect(overlaps("11:00", ["10:00"])).toBe(false);
    expect(overlaps("09:15", ["10:00", "14:00"])).toBe(true);
  });

  it("refuse un jour passé, un créneau inconnu ou une date mal formée", () => {
    const now = new Date("2026-11-10T08:00:00Z");
    expect(isBookable("2026-11-12", "08:30", now)).toBe(true);
    expect(isBookable("2026-11-10", "08:30", now)).toBe(false);
    expect(isBookable("2026-11-14", "14:00", now)).toBe(false);
    expect(isBookable("2026-11-12", "09:10", now)).toBe(false);
    expect(isBookable("2026-11-12x", "08:30", now)).toBe(false);
    expect(isBookable("2027-01-20", "08:30", now)).toBe(false);
  });
});
