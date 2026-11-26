import { describe, expect, it } from "vitest";
import { daysLeft, readTrial } from "./trial";

const DAY = 864e5;
const at = (d: number) => new Date(Date.UTC(2026, 10, 1) + d * DAY).toISOString();
describe("jours d'essai restants", () => {
  const c = { startedAt: at(0), serverNow: at(3), localAt: 1_000 * DAY, maxLocal: 1_000 * DAY };
  it("part de l'heure du serveur, puis avance avec l'heure du téléphone", () => {
    expect(daysLeft(c, 1_000 * DAY)).toBe(11);
    expect(daysLeft(c, 1_005 * DAY)).toBe(6);
    expect(daysLeft(c, 1_020 * DAY)).toBe(0);
  });
  it("reculer l'horloge ne rend pas de jours", () => {
    expect(daysLeft({ ...c, maxLocal: 1_005 * DAY }, 990 * DAY)).toBe(6);
  });
  it("premier lancement : 14 jours ; un contrôle illisible n'est jamais un essai terminé", () => {
    expect(daysLeft({ ...c, serverNow: at(0) }, 1_000 * DAY)).toBe(14);
    expect(daysLeft({ ...c, startedAt: "n'importe quoi" }, 1_000 * DAY)).toBeNull();
  });
});

describe("réponse du serveur", () => {
  const ok = { startedAt: at(0), now: at(1), days: 14 };
  it("objet ou texte JSON", () => {
    expect(readTrial(ok)).toEqual({ startedAt: at(0), serverNow: at(1) });
    expect(readTrial(JSON.stringify(ok))).toEqual({ startedAt: at(0), serverNow: at(1) });
  });
  it("rejette une réponse sans dates valides", () => {
    expect(() => readTrial({})).toThrow();
    expect(() => readTrial("<html>")).toThrow();
    expect(() => readTrial({ startedAt: "x", now: at(1) })).toThrow();
  });
});
