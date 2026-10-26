import { eq } from "drizzle-orm";
import { z } from "zod";
import { clientIp, fail, isResponse, json, limited, parseBody, requireUser } from "@/lib/api";
import { destroyOtherSessions, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { dataImage } from "@/lib/image-schema";
import { passwordSchema } from "@/lib/password-policy";
import { normalizePhone } from "@/lib/phone";

// Accessible aux comptes non vérifiés : c'est l'écran de vérification qui lit l'état de la session.
export async function GET() {
  const user = await requireUser({ unverified: true });
  return isResponse(user) ? user : json(user);
}

const patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 ().-]{5,22}$/).optional(),
  avatar: dataImage(300_000).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: passwordSchema.optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const blocked = await limited({ key: `me:${user.id}`, limit: 15, windowSec: 600 }, { key: `me:ip:${clientIp(req)}`, limit: 60, windowSec: 600 });
  if (blocked) return blocked;
  const p = await parseBody(req, patch);
  if ("res" in p) return p.res;
  const db = await getDb();
  const set: Partial<typeof schema.users.$inferInsert> = {};
  if (p.data.name) set.name = p.data.name;
  if (p.data.phone) {
    const norm = normalizePhone(p.data.phone);
    if (!norm) return fail(400, "invalid_body");
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phoneNorm, norm));
    if (taken && taken.id !== user.id) return fail(409, "phone_taken");
    set.phone = p.data.phone;
    if (norm !== normalizePhone(user.phone)) {
      set.phoneNorm = norm;
      set.phoneVerifiedAt = null; // un nouveau numéro doit être confirmé de nouveau
    }
  }
  if (p.data.avatar !== undefined) set.avatar = p.data.avatar;
  let passwordChanged = false;
  if (p.data.newPassword) {
    const [row] = await db.select({ h: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
    if (!p.data.currentPassword || !row || !(await verifyPassword(p.data.currentPassword, row.h))) return fail(403, "wrong_password");
    set.passwordHash = await hashPassword(p.data.newPassword);
    passwordChanged = true;
  }
  if (Object.keys(set).length) await db.update(schema.users).set(set).where(eq(schema.users.id, user.id));
  if (passwordChanged) await destroyOtherSessions(user.id); // les autres appareils doivent se reconnecter
  return json({ ...user, name: set.name ?? user.name, phone: set.phone ?? user.phone, avatar: set.avatar ?? user.avatar });
}
