import { describe, expect, it } from "vitest";
import { autoQuality, isQuality, QUALITY } from "./quality";

describe("profils de qualité 3D", () => {
  it("choisit selon l'appareil", () => {
    expect(autoQuality({ coarsePointer: true, cores: 4, memoryGb: 2 })).toBe("eco");
    expect(autoQuality({ coarsePointer: true, cores: 8, memoryGb: 8 })).toBe("balanced");
    expect(autoQuality({ coarsePointer: false, cores: 4, memoryGb: 4 })).toBe("balanced");
    expect(autoQuality({ coarsePointer: false, cores: 12, memoryGb: 16 })).toBe("high");
    expect(autoQuality({ coarsePointer: false, cores: 12, memoryGb: 16, reducedMotion: true })).toBe("eco");
  });
  it("seul le profil élevé active le vitrage physique", () => {
    expect(QUALITY.eco.transmission || QUALITY.balanced.transmission).toBe(false);
    expect(QUALITY.high.transmission).toBe(true);
    expect(isQuality("high") && !isQuality("ultra")).toBe(true);
  });
});
