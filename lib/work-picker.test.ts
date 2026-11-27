import { describe, expect, it } from "vitest";
import { lineOf, patchLine } from "@/components/quote/WorkPicker";
import { DEFAULT_SIZE } from "@/components/quote/line";
import { withDefaults } from "@/lib/model";

const s = withDefaults({});

describe("choix de l'ouvrage", () => {
  it("crée l'ouvrage choisi à sa taille par défaut, gamme européenne", () => {
    const p = lineOf("porte", s);
    expect([p.category, p.width, p.height, p.range]).toEqual(["porte", ...DEFAULT_SIZE.porte, "europeen"]);
    expect(p.unit).toBeGreaterThan(0);
    expect(lineOf("naco", s)).toMatchObject({ category: "fenetre", opening: "jalousie" });
    expect(lineOf("rideau", s)).toMatchObject({ category: "volet", shutter: "rideau" });
  });

  it("garde un prix fixé à la main, recalcule sinon", () => {
    const l = lineOf("fenetre", s);
    expect(patchLine(l, { unit: 1234 }, s).unit).toBe(1234);
    expect(patchLine(l, { width: l.width + 500 }, s).unit).toBeGreaterThan(l.unit);
  });

  it("une porte battante n'a qu'un vantail", () => {
    expect(patchLine(lineOf("porte", s), { opening: "ouvrant" }, s).leaves).toBe(1);
  });
});
