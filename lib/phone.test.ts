import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone, normalizePhone } from "./phone";

describe("numéros de téléphone", () => {
  it("normalise les formats malgaches et internationaux", () => {
    expect(normalizePhone("034 00 000 00")).toBe("+261340000000");
    expect(normalizePhone("0340000000")).toBe("+261340000000");
    expect(normalizePhone("+261 34 00 000 00")).toBe("+261340000000");
    expect(normalizePhone("00261340000000")).toBe("+261340000000");
    expect(normalizePhone("261340000000")).toBe("+261340000000");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });
  it("deux écritures du même numéro donnent la même clé", () => {
    expect(normalizePhone("034 12 345 67")).toBe(normalizePhone("+261341234567"));
    expect(normalizePhone("(034) 12-345.67")).toBe(normalizePhone("0341234567"));
  });
  it("refuse ce qui n'est pas un numéro", () => {
    for (const bad of ["", "abc", "12", "+", "034", "0".repeat(30)]) expect(normalizePhone(bad), bad).toBeNull();
  });
  it("masque la destination sans l'exposer", () => {
    expect(maskPhone("+261340000044")).toMatch(/^\+261 •+44$/);
    expect(maskEmail("jean.rakoto@mail.mg")).toMatch(/^j•+@mail\.mg$/);
    expect(maskEmail("jean.rakoto@mail.mg")).not.toContain("rakoto");
  });
});
