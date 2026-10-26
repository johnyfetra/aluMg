import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Channel } from "./verify";

process.env.PGLITE_DIR = "memory://";
const repo = await import("./repo");
const v = await import("./verify");
const { setSenderForTests, defaultSender } = await import("./senders");
const { getDb, schema } = await import("./db");
const { rateLimit } = await import("./ratelimit");
const { eq } = await import("drizzle-orm");

// Expéditeur factice : enregistre ce qui part (canal, destination, code) sans rien envoyer.
const sent: { channel: Channel; to: string; code: string }[] = [];
const fake = (channels: Channel[] = ["sms", "call", "email"], fail = false) => ({
  channels: () => channels,
  send: async (channel: Channel, to: string, code: string) => {
    if (fail) throw new Error("provider down");
    sent.push({ channel, to, code });
    return {};
  },
});

let u1: string, u2: string, uNoMail: string;
const wipe = async (userId: string) => (await getDb()).delete(schema.verifications).where(eq(schema.verifications.userId, userId));

beforeAll(async () => {
  u1 = (await repo.createUser("a@ex.mg", "Alice", "h", "client", "034 11 111 11"))!;
  u2 = (await repo.createUser("b@ex.mg", "Bob", "h", "menuisier", "034 22 222 22"))!;
  uNoMail = (await repo.createUser("", "Sans mail", "h", "client", "034 33 333 33"))!;
});
afterEach(() => {
  sent.length = 0;
  setSenderForTests(null);
});

describe("comptes : téléphone obligatoire, e-mail facultatif", () => {
  it("un compte sans e-mail est créé ; plusieurs comptes sans e-mail coexistent", async () => {
    const other = await repo.createUser("", "Autre sans mail", "h", "client", "034 44 444 44");
    expect(other).toBeTruthy();
    expect((await repo.findUserById(uNoMail))!.email).toBeNull();
  });
  it("le téléphone est unique, quelle que soit son écriture ; l'e-mail aussi", async () => {
    expect(await repo.createUser("", "Doublon", "h", "client", "+261 34 11 111 11")).toBeNull();
    expect(await repo.createUser("A@EX.MG", "Doublon mail", "h", "client", "034 99 999 99")).toBeNull();
  });
  it("connexion par téléphone (toute écriture) ou par e-mail", async () => {
    expect((await repo.findUserByIdentifier("034 11 111 11"))!.id).toBe(u1);
    expect((await repo.findUserByIdentifier("+261341111111"))!.id).toBe(u1);
    expect((await repo.findUserByIdentifier("a@ex.mg"))!.id).toBe(u1);
    expect(await repo.findUserByIdentifier("034 00 000 99")).toBeNull();
  });
});

describe("vérification par SMS, appel ou e-mail", () => {
  it("canaux proposés : seulement ceux que le compte peut recevoir", async () => {
    setSenderForTests(fake());
    expect(await v.availableChannels(u1)).toEqual(["sms", "call", "email"]);
    expect(await v.availableChannels(uNoMail)).toEqual(["sms", "call"]); // pas d'e-mail enregistré
    setSenderForTests(fake(["email"])); // seul l'e-mail est configuré
    expect(await v.availableChannels(u1)).toEqual(["email"]);
  });

  for (const channel of ["sms", "call", "email"] as const) {
    it(`${channel} : envoi puis confirmation → compte vérifié`, async () => {
      const id = (await repo.createUser(`${channel}@ex.mg`, `V ${channel}`, "h", "client", `035 00 000 0${["sms", "call", "email"].indexOf(channel)}`))!;
      setSenderForTests(fake());
      expect((await repo.findUserById(id))!.phoneVerifiedAt).toBeNull();
      const r = await v.sendCode(id, channel);
      expect(r.ok).toBe(true);
      expect(sent).toHaveLength(1);
      expect(sent[0].channel).toBe(channel);
      expect(sent[0].to).toBe(channel === "email" ? `${channel}@ex.mg` : "+261350000000".slice(0, -1) + ["sms", "call", "email"].indexOf(channel));
      expect(sent[0].code).toMatch(/^\d{6}$/);
      expect(await v.confirmCode(id, sent[0].code)).toEqual({ ok: true, channel });
      const u = (await repo.findUserById(id))!;
      expect(v.isVerified(u)).toBe(true);
      expect(channel === "email" ? u.emailVerifiedAt : u.phoneVerifiedAt).toBeTruthy();
      expect(await v.sendCode(id, channel)).toEqual({ ok: false, error: "already_verified" });
    });
  }

  it("la réponse ne contient jamais le code (sauf expéditeur « dev ») et masque la destination", async () => {
    setSenderForTests(fake());
    const r = await v.sendCode(u2, "sms");
    expect(r.ok && JSON.stringify(r)).not.toContain(sent[0].code);
    expect(r.ok && r.to).not.toContain("22 222");
    await wipe(u2);
  });

  it("le code est stocké haché, valable une seule fois", async () => {
    setSenderForTests(fake());
    await v.sendCode(u2, "sms");
    const [row] = await (await getDb()).select().from(schema.verifications).where(eq(schema.verifications.userId, u2));
    expect(row.codeHash).not.toContain(sent[0].code);
    expect(row.codeHash).toHaveLength(64);
    expect((await v.confirmCode(u2, sent[0].code)).ok).toBe(true);
    expect(await v.confirmCode(u2, sent[0].code)).toEqual({ ok: false, error: "no_pending" }); // déjà consommé
  });
});

describe("garde-fous", () => {
  const fresh = async (n: number) => (await repo.createUser("", `G${n}`, "h", "client", `036 00 000 0${n}`))!;

  it("code faux : décompte des essais puis verrouillage, même avec le bon code ensuite", async () => {
    const id = await fresh(1);
    setSenderForTests(fake());
    await v.sendCode(id, "sms");
    const good = sent[0].code;
    const bad = good === "000000" ? "111111" : "000000";
    for (let i = 1; i <= v.MAX_ATTEMPTS - 1; i++) expect(await v.confirmCode(id, bad)).toEqual({ ok: false, error: "wrong_code", attemptsLeft: v.MAX_ATTEMPTS - i });
    expect(await v.confirmCode(id, bad)).toEqual({ ok: false, error: "locked", attemptsLeft: 0 });
    expect(await v.confirmCode(id, good)).toEqual({ ok: false, error: "locked" });
    expect(v.isVerified((await repo.findUserById(id))!)).toBe(false);
  });

  it("essais parallèles : le total reste borné", async () => {
    const id = await fresh(2);
    setSenderForTests(fake());
    await v.sendCode(id, "sms");
    const bad = sent[0].code === "000000" ? "111111" : "000000";
    const results = await Promise.all(Array.from({ length: 12 }, () => v.confirmCode(id, bad)));
    expect(results.filter((r) => !r.ok && r.error === "wrong_code").length).toBeLessThanOrEqual(v.MAX_ATTEMPTS);
    const [row] = await (await getDb()).select().from(schema.verifications).where(eq(schema.verifications.userId, id));
    expect(row.attempts).toBeLessThanOrEqual(v.MAX_ATTEMPTS);
  });

  it("code expiré : refusé", async () => {
    const id = await fresh(3);
    setSenderForTests(fake());
    await v.sendCode(id, "sms");
    await (await getDb()).update(schema.verifications).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.verifications.userId, id));
    expect(await v.confirmCode(id, sent[0].code)).toEqual({ ok: false, error: "no_pending" });
  });

  it("délai entre deux envois ; un nouveau code invalide l'ancien", async () => {
    const id = await fresh(4);
    setSenderForTests(fake());
    await v.sendCode(id, "sms");
    const second = await v.sendCode(id, "call");
    expect(second).toMatchObject({ ok: false, error: "cooldown" });
    expect(second.ok === false && second.retryAfter).toBeGreaterThan(0);
    // on rend l'envoi précédent « ancien » : le renvoi est alors permis et l'ancien code ne vaut plus rien
    await (await getDb()).update(schema.verifications).set({ createdAt: new Date(Date.now() - 60_000) }).where(eq(schema.verifications.userId, id));
    const first = sent[0].code;
    expect((await v.sendCode(id, "call")).ok).toBe(true);
    const next = sent[1].code;
    if (first !== next) expect((await v.confirmCode(id, first)).ok).toBe(false);
    expect((await v.confirmCode(id, next)).ok).toBe(true);
  });

  it("canal non configuré, ou destination absente : refus clair", async () => {
    setSenderForTests(fake(["sms"]));
    expect(await v.sendCode(u1, "email")).toEqual({ ok: false, error: "channel_unavailable" });
    setSenderForTests(fake());
    expect(await v.sendCode(uNoMail, "email")).toEqual({ ok: false, error: "no_target" });
    expect(await v.sendCode("00000000-0000-4000-8000-000000000000", "sms")).toEqual({ ok: false, error: "not_found" });
  });

  it("échec du fournisseur : erreur propre, aucun code orphelin, pas de blocage de renvoi", async () => {
    const id = await fresh(5);
    setSenderForTests(fake(["sms"], true));
    expect(await v.sendCode(id, "sms")).toEqual({ ok: false, error: "send_failed" });
    expect(await (await getDb()).select().from(schema.verifications).where(eq(schema.verifications.userId, id))).toHaveLength(0);
    setSenderForTests(fake());
    expect((await v.sendCode(id, "sms")).ok).toBe(true); // pas de cooldown après un échec
  });

  it("sans fournisseur configuré : l'envoi « dev » répond avec le code ; jamais en production", async () => {
    const id = await fresh(6);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await v.sendCode(id, "sms");
    expect(r.ok && r.devCode).toMatch(/^\d{6}$/);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    await wipe(id);
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { defaultSender: prod } = await import("./senders");
    expect(prod.channels()).toEqual([]); // rien n'est configuré : aucun canal proposé en production
    await expect(prod.send("sms", "+261340000000", "123456", "fr")).rejects.toThrow("channel_unavailable");
    vi.unstubAllEnvs();
    expect(defaultSender.channels()).toEqual(["sms", "call", "email"]);
  });
});

describe("fournisseurs réels (appels HTTP simulés)", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    calls.length = 0;
  });
  const stubFetch = (ok = true) => vi.stubGlobal("fetch", async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response("{}", { status: ok ? 201 : 401 })));

  it("Twilio : SMS et appel vocal, avec authentification et texte du code", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "secret");
    vi.stubEnv("TWILIO_FROM", "+15005550006");
    stubFetch();
    await defaultSender.send("sms", "+261340000000", "123456", "fr");
    await defaultSender.send("call", "+261340000000", "123456", "en");
    expect(calls[0].url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json");
    expect(String(calls[0].init.body)).toContain("123456");
    expect(String(calls[0].init.body)).toContain("To=%2B261340000000");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("ACtest:secret").toString("base64")}`);
    expect(calls[1].url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest/Calls.json");
    const twiml = decodeURIComponent(String(calls[1].init.body).replace(/\+/g, " "));
    expect(twiml).toContain("<Say language=\"en-US\">");
    expect(twiml).toContain("1, 2, 3, 4, 5, 6"); // le code est dicté chiffre par chiffre
  });
  it("Resend : e-mail avec le code ; une erreur du fournisseur remonte", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "AluMg <no-reply@alumg.mg>");
    stubFetch();
    await defaultSender.send("email", "a@ex.mg", "654321", "fr");
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(String(calls[0].init.body));
    expect(payload.to).toEqual(["a@ex.mg"]);
    expect(payload.text).toContain("654321");
    vi.unstubAllGlobals();
    stubFetch(false);
    await expect(defaultSender.send("email", "a@ex.mg", "654321", "fr")).rejects.toThrow("provider_401");
  });
});

describe("limitation de débit", () => {
  it("bloque au-delà de la limite, par clé, puis se réarme avec la fenêtre", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect(await rateLimit(key, 3, 60)).toEqual({ ok: true });
    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.retryAfter).toBeGreaterThan(0);
    expect(await rateLimit(`${key}:autre`, 3, 60)).toEqual({ ok: true }); // une autre clé n'est pas touchée
    await (await getDb()).update(schema.rateLimits).set({ windowStart: new Date(Date.now() - 120_000) }).where(eq(schema.rateLimits.key, key));
    expect(await rateLimit(key, 3, 60)).toEqual({ ok: true }); // fenêtre écoulée
  });
});
