"use client";
import useSWR from "swr";
import type { SessionUser } from "./auth";
import { type Quote, type Settings } from "./model";

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

export const useMe = () => useSWR<Pick<SessionUser, "id" | "email" | "name" | "role">>("/api/me", fetcher, { revalidateOnFocus: false });

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
