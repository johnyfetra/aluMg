import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Hachage scrypt aux paramètres versionnés : « scrypt$N$r$p$sel$empreinte ». Les anciennes empreintes « sel:empreinte » (N=16384) restent
// valides et sont renouvelées à la connexion suivante (needsRehash). N = 2^17 : niveau recommandé par l'OWASP pour scrypt.
const KEYLEN = 64;
const CURRENT = { N: 131072, r: 8, p: 1 };
const LEGACY = { N: 16384, r: 8, p: 1 };

const derive = (pw: string, salt: Buffer, o: { N: number; r: number; p: number }) =>
  new Promise<Buffer>((res, rej) => scrypt(pw.normalize("NFKC"), salt, KEYLEN, { ...o, maxmem: 256 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string, params = CURRENT) {
  const salt = randomBytes(16);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("hex")}$${(await derive(pw, salt, params)).toString("hex")}`;
}

function parse(stored: string) {
  if (stored.startsWith("scrypt$")) {
    const [, N, r, p, salt, key] = stored.split("$");
    return { params: { N: Number(N), r: Number(r), p: Number(p) }, salt, key };
  }
  const [salt, key] = stored.split(":");
  return { params: LEGACY, salt, key };
}

export async function verifyPassword(pw: string, stored: string) {
  const { params, salt, key } = parse(stored);
  const expected = Buffer.from(key ?? "", "hex");
  const actual = await derive(pw, Buffer.from(salt ?? "", "hex"), params);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Vrai si l'empreinte utilise d'anciens paramètres : à renouveler après une connexion réussie.
export const needsRehash = (stored: string) => {
  const { params } = parse(stored);
  return params.N < CURRENT.N || params.r < CURRENT.r || params.p < CURRENT.p;
};
