import { describe, expect, it } from "vitest";
import { nextNumber } from "./store";

describe("numéro de devis", () => {
  const now = new Date("2026-11-26");
  it("suit le plus grand numéro de l'année, repart à 1 l'année suivante", () => {
    expect(nextNumber([], now)).toBe("DV-2026-0001");
    expect(nextNumber([{ number: "DV-2026-0009" }, { number: "DV-2026-0002" }, { number: "DV-2025-0040" }], now)).toBe("DV-2026-0010");
  });
});

