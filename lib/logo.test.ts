import { describe, expect, it } from "vitest";
import { imageSrc } from "./logo";

describe("adresse d'image de profil", () => {
  it("remplace une data URL par une adresse versionnée ; laisse les autres valeurs telles quelles", () => {
    expect(imageSrc("rabe-alu", "logo", "data:image/png;base64,AAAA")).toBe("/api/public/menuisiers/rabe-alu/img?k=logo&v=26");
    expect(imageSrc("rabe-alu", "cover", "")).toBe("");
    expect(imageSrc("", "logo", "data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA"); // sans profil : rien à servir
    expect(imageSrc("a b", "owner", "https://exemple.mg/p.png")).toBe("https://exemple.mg/p.png");
  });
});
