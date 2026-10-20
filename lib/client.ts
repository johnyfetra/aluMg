"use client";
import useSWR from "swr";
import type { SessionUser } from "./auth";
import { type Quote, type Settings } from "./model";
import type { DirectoryEntry, PortfolioInput, PortfolioItem, Profile, ProfileInput, PublicMenuisier } from "./profiles";
import type { ClientQuote, EventView } from "./workflow";

class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

// Une session expirée renvoie 401 : on repart vers la connexion.
async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !url.startsWith("/api/auth/") && typeof location !== "undefined") location.replace("/connexion");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "error");
  return data as T;
}
const fetcher = <T,>(url: string) => request<T>("GET", url);

export { ApiError, request };

export const useMe = () => useSWR<Pick<SessionUser, "id" | "email" | "name" | "phone" | "avatar" | "role">>("/api/me", fetcher, { revalidateOnFocus: false });

export function useSettings() {
  const { data, mutate, isLoading } = useSWR<Settings>("/api/settings", fetcher, { revalidateOnFocus: false });
  const save = async (s: Settings) => {
    const saved = await request<Settings>("PUT", "/api/settings", s);
    await mutate(saved, false);
    return saved;
  };
  return { settings: data, loading: isLoading, save };
}

export function useQuotes() {
  const { data, mutate, isLoading } = useSWR<Quote[]>("/api/quotes", fetcher, { revalidateOnFocus: false });
  const save = async (q: Quote, isNew: boolean) => {
    const saved = isNew ? await request<Quote>("POST", "/api/quotes", q) : await request<Quote>("PUT", `/api/quotes/${q.id}`, q);
    await mutate();
    return saved;
  };
  const remove = async (id: string) => {
    await request("DELETE", `/api/quotes/${id}`);
    await mutate();
  };
  return { quotes: data, loading: isLoading, save, remove };
}

// Session pour les pages publiques : jamais de redirection, renvoie null si personne n'est connecté.
export type SessionInfo = Pick<SessionUser, "id" | "email" | "name" | "phone" | "avatar" | "role">;
export const useSession = () =>
  useSWR<SessionInfo | null>(
    "session",
    async () => {
      const r = await fetch("/api/session");
      return r.ok ? ((await r.json()) as SessionInfo | null) : null;
    },
    { revalidateOnFocus: false },
  );

// Où envoyer un utilisateur selon son rôle.
export const homeFor = (role?: SessionInfo["role"]) => (role === "client" ? "/espace-client" : "/tableau-de-bord");

export const useDirectory = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return useSWR<DirectoryEntry[]>(`/api/public/menuisiers${qs ? `?${qs}` : ""}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true });
};
export const useMenuisier = (slug: string) => useSWR<PublicMenuisier>(`/api/public/menuisiers/${slug}`, fetcher, { revalidateOnFocus: false });

export const useClientQuotes = () => useSWR<ClientQuote[]>("/api/client/quotes", fetcher, { revalidateOnFocus: false });
export const useClientQuote = (id: string) => useSWR<ClientQuote>(`/api/client/quotes/${id}`, fetcher, { revalidateOnFocus: false });
export const useEvents = (quoteId: string) => useSWR<EventView[]>(`/api/quotes/${quoteId}/events`, fetcher, { revalidateOnFocus: false });

export function useProfile() {
  const { data, mutate, isLoading } = useSWR<Profile>("/api/profile", fetcher, { revalidateOnFocus: false });
  const save = async (input: ProfileInput) => {
    const saved = await request<Profile>("PUT", "/api/profile", input);
    await mutate(saved, false);
    return saved;
  };
  return { profile: data, loading: isLoading, save };
}

export function usePortfolio() {
  const { data, mutate, isLoading } = useSWR<PortfolioItem[]>("/api/portfolio", fetcher, { revalidateOnFocus: false });
  const save = async (input: PortfolioInput, id?: string) => {
    await (id ? request("PUT", `/api/portfolio/${id}`, input) : request("POST", "/api/portfolio", input));
    await mutate();
  };
  const remove = async (id: string) => {
    await request("DELETE", `/api/portfolio/${id}`);
    await mutate();
  };
  return { items: data, loading: isLoading, save, remove };
}
