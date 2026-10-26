import { eq } from "drizzle-orm";
import { isResponse, json, requireUser } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { maskEmail, maskPhone } from "@/lib/phone";
import { availableChannels } from "@/lib/verify";

// État de la vérification : canaux possibles pour ce compte, destinations masquées, déjà vérifié ou non.
export async function GET() {
  const user = await requireUser({ unverified: true });
  if (isResponse(user)) return user;
  const [u] = await (await getDb()).select({ phone: schema.users.phoneNorm, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, user.id));
  return json({ verified: user.verified, channels: await availableChannels(user.id), phone: u?.phone ? maskPhone(u.phone) : "", email: u?.email ? maskEmail(u.email) : "" });
}
