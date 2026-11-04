import { z } from "zod";
import { SOCIAL_NETWORKS, type SocialNetwork } from "./model";

// Réseaux sociaux de la plateforme : validation partagée (navigateur et serveur). Une adresse doit être en https et appartenir au réseau choisi :
// jamais de `javascript:` ni de lien vers un autre site sous l'étiquette « Facebook ».
export type SocialLink = { id: string; network: SocialNetwork; label: string; url: string; position: number; visible: boolean };
export type PublicSocial = Pick<SocialLink, "id" | "network" | "label" | "url">;

const HOSTS: Record<SocialNetwork, readonly string[]> = {
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  whatsapp: ["wa.me", "whatsapp.com"],
  linkedin: ["linkedin.com"],
  x: ["x.com", "twitter.com"],
};

export function socialUrlOk(network: SocialNetwork, url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password && HOSTS[network].some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export const socialSchema = z
  .object({
    network: z.enum(SOCIAL_NETWORKS),
    label: z.string().trim().min(1).max(60),
    url: z.string().trim().max(300),
    visible: z.boolean().default(true),
  })
  .refine((v) => socialUrlOk(v.network, v.url), { path: ["url"], message: "url" });
export type SocialInput = z.infer<typeof socialSchema>;
