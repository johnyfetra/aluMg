import type { Channel } from "./verify";

// Envoi des codes de vérification : SMS et appel vocal par Twilio, e-mail par Resend (API REST via fetch, aucun SDK).
// En développement, sans configuration, un envoi « dev » écrit le code dans la console et le renvoie à l'appelant (jamais en production).
// Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (numéro émetteur) ; RESEND_API_KEY, MAIL_FROM.
export type Lang = "fr" | "en" | "mg";
export type SendResult = { devCode?: string };
export type Sender = {
  channels: () => Channel[];
  send: (channel: Channel, to: string, code: string, lang: Lang) => Promise<SendResult>;
};

const TEXT: Record<Lang, (code: string) => string> = {
  fr: (c) => `AluMg : votre code de vérification est ${c}. Il expire dans 10 minutes. Ne le communiquez à personne.`,
  en: (c) => `AluMg: your verification code is ${c}. It expires in 10 minutes. Never share it.`,
  mg: (c) => `AluMg: ny kaody fanamarinanao dia ${c}. Lany ao anatin'ny 10 minitra. Aza omena olona.`,
};
const SPOKEN: Record<Lang, (digits: string) => string> = {
  fr: (d) => `Bonjour, voici votre code de vérification AluMg : ${d}. Je répète : ${d}.`,
  en: (d) => `Hello, your AluMg verification code is: ${d}. I repeat: ${d}.`,
  mg: (d) => `Bonjour, voici votre code de vérification AluMg : ${d}. Je répète : ${d}.`, // pas de voix malgache : message en français
};
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

const twilio = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  return sid && token && from ? { sid, token, from } : null;
};
const resend = () => (process.env.RESEND_API_KEY && process.env.MAIL_FROM ? { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM } : null);

async function post(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`provider_${res.status}`);
}

async function twilioSend(channel: "sms" | "call", to: string, code: string, lang: Lang) {
  const c = twilio()!;
  const auth = `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString("base64")}`;
  const base = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.sid)}`;
  const form = new URLSearchParams(channel === "sms" ? { To: to, From: c.from, Body: TEXT[lang](code) } : { To: to, From: c.from, Twiml: `<Response><Pause length="1"/><Say language="${lang === "en" ? "en-US" : "fr-FR"}">${esc(SPOKEN[lang](code.split("").join(", ")))}</Say></Response>` });
  await post(`${base}/${channel === "sms" ? "Messages" : "Calls"}.json`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
}

async function resendSend(to: string, code: string, lang: Lang) {
  const c = resend()!;
  const subject = lang === "en" ? "Your AluMg verification code" : "Votre code de vérification AluMg";
  await post("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: c.from, to: [to], subject, text: TEXT[lang](code), html: `<p>${esc(TEXT[lang](code))}</p><p style="font-size:28px;letter-spacing:6px"><b>${code}</b></p>` }),
  });
}

// Envoi « dev » (code écrit en console et renvoyé) : hors production uniquement. ALUMG_DEV_SENDER=1 l'autorise aussi pour les tests de bout en bout sur un build de production jetable (jamais en vrai déploiement).
const dev = process.env.NODE_ENV !== "production" || process.env.ALUMG_DEV_SENDER === "1";

// Les canaux réellement disponibles : ceux configurés ; en développement, tous (envoi « dev »).
export const defaultSender: Sender = {
  channels: () => (["sms", "call", "email"] as const).filter((c) => (c === "email" ? !!resend() : !!twilio()) || dev),
  async send(channel, to, code, lang) {
    if (channel === "email" ? resend() : twilio()) {
      if (channel === "email") await resendSend(to, code, lang);
      else await twilioSend(channel, to, code, lang);
      return {};
    }
    if (!dev) throw new Error("channel_unavailable");
    console.info(`[verify:dev] ${channel} → ${to} : ${code}`); // jamais exécuté en production
    return { devCode: code };
  },
};

let override: Sender | null = null;
export const setSenderForTests = (s: Sender | null) => {
  override = s;
};
export const getSender = () => override ?? defaultSender;
