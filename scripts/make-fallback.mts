// Génère public/brand/fallback.svg (repli statique des <img>) à partir de components/FallbackArt.tsx, avec les couleurs du thème clair et sombre.
// Usage : npx tsx scripts/make-fallback.mts [carte|bandeau] [sortie.svg]
import { readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as mod from "../components/FallbackArt";

const FallbackArt = ((mod as { default: unknown }).default as { default?: typeof mod.default }).default ?? mod.default; // interop ESM/CJS de tsx

const css = readFileSync("app/globals.css", "utf8");
const all = css.slice(css.indexOf(".fb-wall {"), css.indexOf(".fb-glass-b"));
const dark = all.split("\n").filter((l) => l.startsWith('[data-theme="dark"] ')).map((l) => l.replace('[data-theme="dark"] ', ""));
const rules = all.split("\n").filter((l) => !l.startsWith('[data-theme="dark"] ')).join("\n") + `@media(prefers-color-scheme:dark){${dark.join("")}}`; // thème sombre du site -> préférence du système (image chargée hors de la page)
const glassB = css.match(/\.fb-glass-b \{[^}]*\}/)![0];
const [variant = "carte", out = "public/brand/fallback.svg"] = process.argv.slice(2);
const svg = renderToStaticMarkup(createElement(FallbackArt, { variant: variant === "bandeau" ? "banner" : "card", label: "AluMg" }));
const tokens = `:root{--text:#252725;--surface:#fdfcf9;--surface-2:#ece6db;--primary:#243b32;--muted:#4b514b}@media(prefers-color-scheme:dark){:root{--text:#ece9e2;--surface:#1c231f;--surface-2:#27302b;--primary:#c58a58;--muted:#bcc4bd}}`;
writeFileSync(out, svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, `$1<style>${tokens}${rules}${glassB}</style>`));
