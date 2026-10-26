import { scryptSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { isCommonPassword, passwordSchema } from "./password-policy";
import { DATA_IMAGE } from "./image-schema";

describe("hachage des mots de passe", () => {
  it("empreinte versionnée, sel aléatoire, vérification juste", async () => {
    const a = await hashPassword("un-mot-de-passe-solide");
    const b = await hashPassword("un-mot-de-passe-solide");
    expect(a).toMatch(/^scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("un-mot-de-passe-solide", a)).toBe(true);
    expect(await verifyPassword("un-mot-de-passe-solidE", a)).toBe(false);
    expect(await verifyPassword("", a)).toBe(false);
    expect(needsRehash(a)).toBe(false);
  });
  it("anciennes empreintes (sel:clé, N=16384) toujours valides et à renouveler", async () => {
    const salt = randomBytes(16);
    const legacy = `${salt.toString("hex")}:${scryptSync("ancien-mdp-123", salt, 64).toString("hex")}`;
    expect(await verifyPassword("ancien-mdp-123", legacy)).toBe(true);
    expect(await verifyPassword("autre", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });
  it("empreinte illisible : jamais de succès ni d'exception", async () => {
    expect(await verifyPassword("x", "n'importe quoi")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

describe("politique de mot de passe", () => {
  it("refuse court, trop courant, trop simple ; accepte un mot de passe correct", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    for (const p of ["motdepasse123", "Password123", "12345678", "azertyuiop", "aaaaaaaa", "abababab"]) expect(passwordSchema.safeParse(p).success, p).toBe(false);
    expect(isCommonPassword("MotDePasse")).toBe(true);
    expect(passwordSchema.safeParse("café-au-lait-9").success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(201)).success).toBe(false);
  });
});

describe("images acceptées", () => {
  it("raster uniquement : png, jpeg, webp ; jamais de SVG ni de script", () => {
    expect(DATA_IMAGE.test("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(DATA_IMAGE.test("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(DATA_IMAGE.test("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(DATA_IMAGE.test("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(DATA_IMAGE.test("data:image/png;base64,<script>")).toBe(false);
  });
});
