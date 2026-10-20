import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const derive = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(pw, salt)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [salt, key] = stored.split(":");
  const expected = Buffer.from(key ?? "", "hex");
  const actual = await derive(pw, Buffer.from(salt ?? "", "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
