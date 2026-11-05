import { describe, expect, it } from "vitest";
import { bounds, mitredFrame } from "./geometry";
import { DORMANT_SLIDING, SASH } from "./profiles";

describe("géométrie des profilés", () => {
  it("le cadre à onglets a exactement les dimensions extérieures demandées (mm → m)", () => {
    const b = bounds(mitredFrame(DORMANT_SLIDING, 1800, 1200));
    expect(b.size[0]).toBeCloseTo(1.8, 6);
    expect(b.size[1]).toBeCloseTo(1.2, 6);
    expect(b.size[2]).toBeCloseTo(0.06, 6); // profondeur du profilé
  });
  it("le vantail garde ses dimensions pour plusieurs tailles", () => {
    for (const [w, h] of [[600, 900], [1100, 2100], [2400, 1300]]) {
      const b = bounds(mitredFrame(SASH, w, h));
      expect(b.size[0]).toBeCloseTo(w / 1000, 6);
      expect(b.size[1]).toBeCloseTo(h / 1000, 6);
    }
  });
  it("l'onglet est bien à 45° : aucun sommet ne dépasse du rectangle extérieur", () => {
    const d = mitredFrame(DORMANT_SLIDING, 1000, 800);
    for (let i = 0; i < d.positions.length; i += 3) {
      expect(Math.abs(d.positions[i])).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(Math.abs(d.positions[i + 1])).toBeLessThanOrEqual(0.4 + 1e-6);
    }
  });
});

import { slidingWindow } from "./slidingWindow";
describe("fenêtre coulissante", () => {
  it("le dormant respecte les dimensions du configurateur et les vantaux restent dedans", () => {
    for (const [w, h] of [[1800, 1200], [1200, 1000], [2400, 1300]]) {
      const parts = slidingWindow(w, h, 2);
      const frame = bounds(parts[0].mesh);
      expect([Math.round(frame.size[0] * 1000), Math.round(frame.size[1] * 1000)]).toEqual([w, h]);
      for (const p of parts.filter((x) => x.name.startsWith("vantail"))) {
        const b = bounds(p.mesh);
        expect(b.size[1] * 1000).toBeLessThan(h);
        expect(Math.abs(p.position[0]) + b.size[0] / 2).toBeLessThanOrEqual(w / 2000);
      }
    }
  });
});
