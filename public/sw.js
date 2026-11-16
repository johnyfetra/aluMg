const VERSION = "v1";
const STATIC = `alumg-static-${VERSION}`;
const PAGES = `alumg-pages-${VERSION}`;
const MAX_STATIC = 300;
const PAGE_PREFIXES = ["/tableau-de-bord", "/devis", "/clients", "/guide"];
const ASSET = /\/_next\/static\/[^"'\s)]+/g;

const isPage = (url) => PAGE_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
const usable = (res) => res && res.ok && !res.redirected && res.type === "basic";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("alumg-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function staticFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (usable(res)) {
    const cache = await caches.open(STATIC);
    await cache.put(request, res.clone());
    trim(STATIC, MAX_STATIC);
  }
  return res;
}

async function pageNetworkFirst(request) {
  try {
    const res = await fetch(request);
    if (usable(res)) (await caches.open(PAGES)).put(request.url, res.clone());
    return res;
  } catch {
    const cache = await caches.open(PAGES);
    const url = new URL(request.url);
    const copy = (await cache.match(request.url)) || (await cache.match(url.origin + url.pathname));
    if (copy) return copy;
    return (await cache.match(`${url.origin}/devis/nouveau`)) || Response.error();
  }
}
async function warm(urls) {
  const pages = await caches.open(PAGES);
  const assets = new Set();
  for (const u of urls) {
    try {
      const res = await fetch(u, { credentials: "same-origin" });
      if (!usable(res)) continue;
      await pages.put(new URL(u, self.location.origin).href, res.clone());
      for (const a of (await res.text()).match(ASSET) || []) assets.add(a);
    } catch {
      return;
    }
  }
  const cache = await caches.open(STATIC);
  await Promise.all([...assets].map(async (a) => (await cache.match(a)) || cache.add(a).catch(() => undefined)));
  trim(STATIC, MAX_STATIC);
}

self.addEventListener("message", (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  const { type, urls } = event.data || {};
  if (type === "warm" && Array.isArray(urls)) event.waitUntil(warm(urls.filter((u) => typeof u === "string" && u.startsWith("/"))));
  if (type === "clear") event.waitUntil(caches.delete(PAGES));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(staticFirst(request));
  if (request.mode === "navigate" && isPage(url)) return event.respondWith(pageNetworkFirst(request));
});
