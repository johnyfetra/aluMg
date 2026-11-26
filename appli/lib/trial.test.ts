import { describe, expect, it } from "vitest";
import { daysLeft } from "./trial";

const DAY = 864e5;
const at = (d: number) => new Date(Date.UTC(2026, 10, 1) + d * DAY).toISOString();
describe("jours d'essai restants", () => {
  const c = { startedAt: at(0), serverNow: at(3), days: 14, localAt: 1_000 * DAY, maxLocal: 1_000 * DAY };
  it("part de l'heure du serveur, puis avance avec l'heure du téléphone", () => {
    expect(daysLeft(c, 1_000 * DAY)).toBe(11);
    expect(daysLeft(c, 1_005 * DAY)).toBe(6);
    expect(daysLeft(c, 1_020 * DAY)).toBe(0);
  });
  it("reculer l'horloge ne rend pas de jours", () => {
    expect(daysLeft({ ...c, maxLocal: 1_005 * DAY }, 990 * DAY)).toBe(6);
  });
});
