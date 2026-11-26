import { describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
const { checkTrial, deviceHash } = await import("./app-trial");

describe("essai de l'application locale", () => {
  it("le premier appel fixe le début ; une réinstallation (même appareil) le relit", async () => {
    const first = await checkTrial("android-id-1", new Date("2026-11-01T08:00:00Z"));
    const again = await checkTrial("android-id-1", new Date("2026-11-20T08:00:00Z"));
    expect(again.startedAt).toBe(first.startedAt);
    expect(again.now).toBe("2026-11-20T08:00:00.000Z");
    expect((await checkTrial("android-id-2", new Date("2026-11-20T08:00:00Z"))).startedAt).toBe("2026-11-20T08:00:00.000Z");
  });
  it("l'identifiant de l'appareil n'est pas gardé en clair", () => {
    expect(deviceHash("android-id-1")).not.toContain("android-id-1");
  });
});
