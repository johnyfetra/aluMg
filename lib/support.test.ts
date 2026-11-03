import { describe, expect, it } from "vitest";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP, supportUrl } from "./support";

describe("contact du support", () => {
  it("le numéro affiché et le numéro du lien désignent la même ligne (+261 34 61 430 66)", () => {
    expect(SUPPORT_WHATSAPP).toBe("261346143066");
    expect(SUPPORT_PHONE_DISPLAY.replace(/\D/g, "")).toBe(SUPPORT_WHATSAPP);
  });
  it("le lien wa.me encode le message prérempli", () => {
    expect(supportUrl("Bonjour, j'ai besoin d'aide & plus ?")).toBe("https://wa.me/261346143066?text=Bonjour%2C%20j'ai%20besoin%20d'aide%20%26%20plus%20%3F");
  });
});
