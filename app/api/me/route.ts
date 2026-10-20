import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, isResponse, json, parseBody, requireUser } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  return isResponse(user) ? user : json(user);
}

const patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 ().-]{5,22}$/).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const p = await parseBody(req, patch);
  if ("res" in p) return p.res;
  const db = await getDb();
  const set: Partial<typeof schema.users.$inferInsert> = {};
  if (p.data.name) set.name = p.data.name;
  if (p.data.phone) set.phone = p.data.phone;
  if (p.data.newPassword) {
    const [row] = await db.select({ h: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
    if (!p.data.currentPassword || !row || !(await verifyPassword(p.data.currentPassword, row.h))) return fail(403, "wrong_password");
    set.passwordHash = await hashPassword(p.data.newPassword);
  }
  if (Object.keys(set).length) await db.update(schema.users).set(set).where(eq(schema.users.id, user.id));
  return json({ ...user, name: set.name ?? user.name, phone: set.phone ?? user.phone });
}
