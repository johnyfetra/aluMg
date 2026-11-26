"use client";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { useEffect, useState } from "react";

// Essai de 14 jours tenu par le serveur : l'app envoie l'ANDROID_ID (le même après une réinstallation, pour une même clé de signature),
// le serveur renvoie la date du premier lancement. Il faut internet une fois pour activer l'essai ; ensuite l'app marche hors ligne
// et revérifie dès qu'elle a du réseau. Remettre l'horloge du téléphone en arrière ne rend pas de jours (heure la plus tardive retenue).
const API = "https://alumg.vercel.app/api/app-trial";
const KEY = "alumg.app.trial";
const DAY = 864e5;

export type TrialCache = { startedAt: string; serverNow: string; days: number; localAt: number; maxLocal: number };
export type Trial = { state: "loading" } | { state: "activate"; retry: () => void } | { state: "active"; left: number } | { state: "ended" };

// Jours restants : temps écoulé selon le serveur au dernier contrôle, plus le temps local écoulé depuis (jamais négatif).
export function daysLeft(c: TrialCache, now: number) {
  const elapsed = Date.parse(c.serverNow) - Date.parse(c.startedAt) + Math.max(0, Math.max(now, c.maxLocal) - c.localAt);
  return Math.max(0, c.days - Math.floor(elapsed / DAY));
}

function readCache(): TrialCache | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}
function writeCache(c: TrialCache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}

async function deviceId() {
  if (Capacitor.isNativePlatform()) return (await Device.getId()).identifier;
  // navigateur (développement) : identifiant tiré au sort, gardé dans ce navigateur
  let id = localStorage.getItem("alumg.app.device");
  if (!id) localStorage.setItem("alumg.app.device", (id = crypto.randomUUID()));
  return id;
}

async function fetchTrial(): Promise<Omit<TrialCache, "localAt" | "maxLocal">> {
  const data = { device: await deviceId() };
  // requête native : pas de CORS, l'app est servie depuis https://localhost
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.post({ url: API, headers: { "Content-Type": "application/json" }, data, connectTimeout: 8000, readTimeout: 8000 });
    if (r.status !== 200) throw new Error(`trial ${r.status}`);
    return r.data;
  }
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(`trial ${r.status}`);
  return r.json();
}

// Dernier contrôle gardé, avec l'heure la plus tardive vue sur ce téléphone ; renvoie les jours restants (null : jamais activé).
function lastKnown(): number | null {
  const c = readCache();
  if (!c) return null;
  const now = Date.now();
  const seen = { ...c, maxLocal: Math.max(c.maxLocal, now) };
  writeCache(seen);
  return daysLeft(seen, now);
}

export function useTrial(): Trial {
  const [left, setLeft] = useState<number | null>(lastKnown);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    fetchTrial()
      .then((r) => {
        const now = Date.now();
        const fresh = { ...r, localAt: now, maxLocal: now };
        writeCache(fresh);
        setLeft(daysLeft(fresh, now));
        setFailed(false);
      })
      .catch(() => setFailed(true)); // hors ligne : on garde le dernier contrôle
  }, [attempt]);
  if (left === null) return failed ? { state: "activate", retry: () => setAttempt((a) => a + 1) } : { state: "loading" };
  return left > 0 ? { state: "active", left } : { state: "ended" };
}
