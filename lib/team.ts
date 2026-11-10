import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { sendMail } from "./senders";

// Avis à l'équipe AluMg : DEMO_NOTIFY_EMAIL (adresses séparées par des virgules), sinon les e-mails des comptes administrateurs.
export async function mailTeam(subject: string, lines: (string | null)[]) {
  const fixed = (process.env.DEMO_NOTIFY_EMAIL ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const to = fixed.length ? fixed : (await (await getDb()).select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.role, "admin"))).map((u) => u.email).filter((e): e is string => !!e);
  await sendMail(to, subject, lines.filter((l) => l !== null).join("\n"));
}
