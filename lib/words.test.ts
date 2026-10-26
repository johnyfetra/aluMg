import { describe, expect, it } from "vitest";
import { amountInWords as w } from "./words";

describe("montant en lettres", () => {
  it("petits nombres et exceptions françaises", () => {
    expect(w(0)).toBe("zéro");
    expect(w(21)).toBe("vingt et un");
    expect(w(71)).toBe("soixante et onze");
    expect(w(80)).toBe("quatre-vingts");
    expect(w(81)).toBe("quatre-vingt-un");
    expect(w(99)).toBe("quatre-vingt-dix-neuf");
  });
  it("cent et mille s'accordent seulement en fin de nombre", () => {
    expect(w(100)).toBe("cent");
    expect(w(200)).toBe("deux cents");
    expect(w(201)).toBe("deux cent un");
    expect(w(1000)).toBe("mille");
    expect(w(80000)).toBe("quatre-vingt mille");
    expect(w(200000)).toBe("deux cent mille");
  });
  it("grands montants en ariary", () => {
    expect(w(1968000)).toBe("un million neuf cent soixante-huit mille");
    expect(w(2500000)).toBe("deux millions cinq cent mille");
    expect(w(1000000000)).toBe("un milliard");
    expect(w(34248793)).toBe("trente-quatre millions deux cent quarante-huit mille sept cent quatre-vingt-treize");
  });
});
