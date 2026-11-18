#!/usr/bin/env python3
"""Génère la trame de fond de la messagerie (public/brand/chat-pattern-{light,dark}.svg), dessinée comme celle de WhatsApp :
de grandes scènes racontent le métier (mesurer, couper, assembler, vitrer, livrer, poser, chiffrer, serrer la main du client),
des outils moyens les entourent et de petits détails (vis, étincelles, points) comblent les vides. Trois tailles bien distinctes,
angles variés, tuile qui se raccorde sans coupure. Graine fixe : reproductible.
    python3 scripts/make-chat-pattern.py"""
import math
import random

ICONS = {
 "window": '<rect x="4" y="4" width="32" height="32" rx="1.5"/><path d="M20 4v32M4 20h32M24 23v4"/>',
 "door": '<rect x="8" y="3" width="24" height="34" rx="1.5"/><rect x="12" y="7" width="16" height="12"/><rect x="12" y="23" width="16" height="10"/><circle cx="27" cy="21" r="1.4"/>',
 "square": '<path d="M6 6v28h28z"/><path d="M12 19v9h9zM6 14h4M6 22h4M14 34v-4M22 34v-4"/>',
 "ruler": '<rect x="2" y="13" width="36" height="14" rx="2"/><path d="M8 13v6M14 13v4M20 13v6M26 13v4M32 13v6"/>',
 "hammer": '<path d="M15 9l13-5 4 9-13 5z"/><path d="M23 18L12 36"/>',
 "saw": '<path d="M4 30L28 6l6 6-24 24z"/><path d="M8 34l3-3 3 3 3-3 3 3 3-3M28 6l5-4 5 5-4 5"/>',
 "profile": '<rect x="6" y="8" width="28" height="24" rx="2"/><rect x="12" y="14" width="16" height="12"/><path d="M6 20h6M28 20h6"/><circle cx="20" cy="20" r="2"/>',
 "slider": '<rect x="3" y="6" width="34" height="28" rx="1.5"/><path d="M20 6v28M8 20h8m-3-3l3 3-3 3M32 20h-8m3-3l-3 3 3 3"/>',
 "level": '<rect x="2" y="14" width="36" height="12" rx="3"/><ellipse cx="20" cy="20" rx="5.5" ry="2.6"/><path d="M13 14v3M27 14v3"/>',
 "pencil": '<path d="M8 32l2-7L27 8l5 5-17 17z"/><path d="M25 10l5 5M10 25l5 5"/>',
 "tape": '<circle cx="19" cy="20" r="13"/><circle cx="19" cy="20" r="4"/><path d="M30 30h8v5H27"/>',
 "screwdriver": '<path d="M6 34l8-8 4 4-8 8z"/><path d="M18 22L33 7"/><path d="M33 7l3-1-1 3"/>',
 "drill": '<path d="M6 14h20v10H6z"/><path d="M26 17h9M35 15v6M12 24v11h7V24"/>',
 "clamp": '<path d="M8 8h24M8 8v24M8 32h24M20 8v14M15 22h10"/>',
 "screw": '<path d="M20 4v6M13 10h14M16 10v26l4 3 4-3V10M16 17h8M16 23h8M16 29h8"/>',
 "nut": '<path d="M20 5l12 7v14l-12 7-12-7V12z"/><circle cx="20" cy="19" r="5"/>',
 "glass": '<rect x="8" y="5" width="24" height="30" rx="1.5"/><path d="M14 28l10-14M20 31l8-11"/>',
 "handle": '<rect x="15" y="4" width="9" height="32" rx="3"/><path d="M19 9h1M19 31h1M20 19h14a2.5 2.5 0 0 1 0 5H20"/>',
 "hinge": '<path d="M8 6h10v28H8zM22 6h10v28H22zM20 10v20M12 12h2M12 28h2M26 12h2M26 28h2"/>',
 "compass": '<circle cx="20" cy="6" r="2.5"/><path d="M20 8.5L9 36M20 8.5L31 36M13 27h14"/>',
 "wrench": '<path d="M12 33L26 19"/><path d="M26 19a7 7 0 1 0 8-9l-4 4-3-1-1-3 4-4a7 7 0 0 0-9 9"/>',
 "shutter": '<rect x="6" y="6" width="28" height="28" rx="1.5"/><path d="M6 12h28M6 18h28M6 24h28M6 30h28M18 6V3h4v3"/>',
 "railing": '<path d="M4 10h32M4 32h32M10 10v22M17 10v22M23 10v22M30 10v22"/>',
 "house": '<path d="M5 20L20 6l15 14M9 18v16h22V18M17 34V24h6v10"/>',
 "key": '<circle cx="11" cy="14" r="6"/><path d="M16 18l16 16M26 28l4-4M30 32l4-4"/>',
 "plane": '<path d="M4 27h30l4-7H12z"/><path d="M12 20v-8h9M9 31h22"/>',
 "bolt": '<rect x="6" y="6" width="28" height="28" rx="3"/><circle cx="20" cy="20" r="6"/><path d="M20 14v12M14 20h12"/>',
 "gear": '<circle cx="20" cy="20" r="10"/><circle cx="20" cy="20" r="4"/><path d="M20 4v6M20 30v6M4 20h6M30 20h6M9 9l4 4M27 27l4 4M31 9l-4 4M13 27l-4 4"/>',
 "toolbox": '<rect x="4" y="14" width="32" height="20" rx="2"/><path d="M14 14v-4h12v4M4 23h32M18 23v4h4v-4"/>',
 "brush": '<path d="M34 6L18 22"/><path d="M18 22c-5 0-8 3-8 8 5 0 8-3 8-8z"/>',
 "roller": '<rect x="6" y="6" width="24" height="10" rx="2"/><path d="M30 11h4v10H20v6M18 27h4v9h-4z"/>',
 "cutter": '<path d="M8 28l4 4 22-22-4-4z"/><path d="M12 24l4 4M18 18l4 4"/>',
 "pliers": '<path d="M12 4l8 14 8-14M20 18v6M14 24L8 36M26 24l6 12M10 30h6M24 30h6"/>',
 "vice": '<path d="M8 30h24v6H8zM12 30V16h16v14M20 16V8M14 8h12M16 22h8"/>',
 "caulk": '<path d="M6 12h22v8H6zM28 14h8M10 20v10h8V20M14 12V8h6"/>',
 "helmet": '<path d="M6 28c0-10 6-16 14-16s14 6 14 16zM4 28h32v4H4zM20 12V8M16 14v-4"/>',
 "ladder": '<path d="M12 4v32M28 4v32M12 10h16M12 17h16M12 24h16M12 31h16"/>',
 "truck": '<path d="M3 12h20v16H3zM23 18h8l5 5v5H23z"/><circle cx="10" cy="31" r="3"/><circle cx="29" cy="31" r="3"/>',
 "blueprint": '<path d="M6 12h28v20H6zM6 12c0-4 4-4 4 0M12 18h16M12 23h10M12 28h14"/>',
 "calc": '<rect x="9" y="4" width="22" height="32" rx="2"/><rect x="13" y="8" width="14" height="6"/><path d="M14 21h2M19 21h2M24 21h2M14 26h2M19 26h2M24 26h2M14 31h2M19 31h2M24 31h2"/>',
 "louvre": '<rect x="8" y="4" width="24" height="32" rx="1.5"/><path d="M10 12l20-4M10 20l20-4M10 28l20-4M10 36l20-4"/>',
 "arch": '<path d="M8 36V16a12 12 0 0 1 24 0v20zM20 4v32M8 22h24"/>',
 "round": '<circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="8"/><path d="M20 5v30M5 20h30"/>',
 "fanlight": '<path d="M4 30a16 16 0 0 1 32 0zM20 14v16M10 17l5 13M30 17l-5 13"/>',
 "glasses": '<path d="M5 16h30M6 16l2 8h8l2-8M22 16l2 8h8l2-8"/>',
 "plumb": '<path d="M20 4v8M14 12h12l-6 20zM20 32v4"/>',
 "sandblock": '<rect x="6" y="16" width="28" height="14" rx="2"/><path d="M10 16v-4h20v4M10 24h2M16 24h2M22 24h2M28 24h2"/>',
 "chisel": '<path d="M12 4h8v14h-8zM14 18h4l-1 16h-2z"/>',
 "nail": '<path d="M13 5h14M20 5v28l-1.5 3h3z"/>',
}
# Le récit du chantier, dessiné plus finement : ces scènes sont posées en grand.
SCENES = {
 "measure": '<rect x="8" y="13" width="24" height="23" rx="1"/><path d="M20 13v23M8 24.5h24M23 27v4"/><path d="M8 7h24M8 4v6M32 4v6M10.5 5.5L8 7l2.5 1.5M29.5 5.5L32 7l-2.5 1.5"/><path d="M11 30l4-6M24 20l5-5"/>',
 "chopsaw": '<path d="M3 35h34M7 35v-3h26v3M2 29h36v3H2z"/><circle cx="21" cy="16" r="8"/><circle cx="21" cy="16" r="2"/><path d="M14 12.5l-2-1M13 16h-2.5M14 19.5l-2 1"/><path d="M26 22l7 7M31 25l4-4 3 3"/><path d="M11 24l-3-2M10 27l-4 0M12 21l-2-4"/>',
 "assemble": '<path d="M5 5h30v7H12v23H5z"/><path d="M5 5l7 7"/><path d="M16 16h9M16 16v9M16 25l9-9"/><path d="M27 36l6-6M33 30l3-3 1 1-3 3M29 34l-3 3"/>',
 "glazing": '<rect x="7" y="13" width="26" height="24" rx="1"/><path d="M12 31l9-13M18 34l8-11M28 19l2-3"/><path d="M13 13V9h14v4M11 6h18v3H11z"/><path d="M20 6V2"/>',
 "install": '<path d="M2 37h36M6 37V15l14-10 14 10v22"/><rect x="13" y="18" width="14" height="12" rx=".5"/><path d="M20 18v12M13 24h14M17 37v-4h6v4"/><path d="M33 37l3-15M38 37l-3-14M33.5 33h4M34.5 28h3"/>',
 "delivery": '<path d="M2 15h21v15H2zM23 20h8l5 5v5H23z"/><circle cx="9" cy="32" r="3"/><circle cx="29" cy="32" r="3"/><path d="M0 12h29M0 9.5h29M25 9.5v5M4 22h13M27 22h4"/>',
 "quote": '<path d="M9 3h16l6 6v28H9z"/><path d="M25 3v6h6M13 14h14M13 19h14M13 24h8"/><circle cx="26" cy="30" r="4.5"/><path d="M24 30l1.6 1.6 2.8-3"/>',
 "handshake": '<path d="M2 16l6-6 6 3M38 16l-6-6-9 4-6 5a2 2 0 0 0 3 3l5-3 7 6"/><path d="M8 10l-6 12 6 6M32 10l6 12-4 4M12 25l3 3M15 22l4 4M19 21l4 4M23 22l4 4"/>',
 "worker": '<path d="M10 16c0-7 4-11 10-11s10 4 10 11zM8 16h24M20 5v4"/><path d="M12 16a8 8 0 0 0 16 0"/><path d="M17 19h.01M23 19h.01M17.5 22c1.5 1 3.5 1 5 0"/><path d="M8 38c1-7 5-11 12-11s11 4 12 11M20 24v3M16 27l4 5 4-5M29 13l6-6"/>',
 "bay": '<rect x="3" y="5" width="30" height="27" rx="1"/><rect x="6" y="8" width="13" height="21"/><rect x="16" y="8" width="14" height="21"/><path d="M9 24l5-8M20 25l6-9M17.5 17v4"/><path d="M33 36h-6l1-4h4zM30 32c0-5-3-8-5-9M30 32c1-5 4-8 7-8"/><path d="M1 36h24"/>',
 "workbench": '<path d="M3 18h34v4H3zM6 22v15M34 22v15M6 30h28"/><path d="M8 18v-5h24v5M8 15h24"/><path d="M26 13V7h6v6M24 7h10"/>',
 "talk": '<circle cx="10" cy="20" r="4"/><path d="M3 37c0-7 3-11 7-11s7 4 7 11"/><circle cx="30" cy="20" r="4"/><path d="M25.5 19a4.5 4.5 0 0 1 9 0zM24.5 19h11M23 37c0-7 3-11 7-11s7 4 7 11"/><path d="M3 3h14v9H9l-3 3v-3H3zM6 6.5h8M6 9h5"/><path d="M23 5h14v9h-3v3l-3-3h-8zM26.5 11.5l3.5-3.5 3.5 3.5M27.5 10.5V12h5v-1.5"/>',
 "phone": '<rect x="11" y="2" width="18" height="34" rx="3"/><path d="M17 5h6M15 11h10M15 15h10M15 19h6"/><circle cx="20" cy="27" r="4"/><path d="M18.3 27l1.2 1.2 2.4-2.6"/><circle cx="29" cy="3.5" r="3"/><path d="M3 24c3-2 6-1 8 2M3 31c3 0 6 1 8-1"/><path d="M33 12c2 1 3 3 3 5M34 9c3 2 5 5 5 8"/>',
 "crane": '<path d="M1 37h38"/><path d="M5 37V21h15v16M8 24h3v3H8zM14 24h3v3h-3zM8 30h3v3H8zM14 30h3v3h-3z"/><path d="M27 37V7M30 37V7M27 12l3-3M27 17l3-3M27 22l3-3M27 27l3-3M27 32l3-3"/><path d="M15 7h24M15 7l12-4h3l9 4M35 7v3h3V7"/><path d="M19 7v8M16 15h7v6h-7zM19.5 15v6"/>',
 "keys": '<path d="M4 37h20M7 37V23l8.5-7 8.5 7v14"/><rect x="12" y="26" width="7" height="6"/><path d="M15.5 26v6"/><circle cx="31" cy="11" r="5"/><circle cx="31" cy="11" r="1.6"/><path d="M28 15l-7 8M23 20.5l2 2M25 18.2l2 2"/><path d="M34 22c2 0 3 2 2 4l-2 4M31 33c2-1 4-2 5-4M36 2l1-2M39 6l1-1"/>',
 "plan": '<path d="M3 7h28v28H3z"/><path d="M31 7c3 0 4 2 4 4v24l-4 0"/><path d="M9 13h16v15H9zM17 13v15M9 20.5h16"/><path d="M9 31.5h16M9 30v3M25 30v3M6 13v15M5 13h2M5 28h2"/><path d="M27 37l9-9 2 2-9 9h-2z"/>',
 "sunhouse": '<path d="M6 37V20l11-9 11 9v17zM2 37h36"/><rect x="11" y="24" width="12" height="9"/><path d="M17 24v9"/><circle cx="32" cy="8" r="4"/><path d="M32 1v2M32 13v2M25 8h2M37 8h2M27 3l1.5 1.5M35.5 11.5L37 13M37 3l-1.5 1.5"/>',
}
# Petits détails qui remplissent les vides
FILLERS = {
 "dot": '<circle cx="20" cy="20" r="2.5"/>',
 "spark": '<path d="M20 8v24M8 20h24M13 13l14 14M27 13L13 27"/>',
 "plus": '<path d="M20 10v20M10 20h20"/>',
 "star": '<path d="M20 6l4 9 10 1-7.5 6.5L29 33l-9-5.5L11 33l2.5-10.5L6 16l10-1z"/>',
 "ring": '<circle cx="20" cy="20" r="8"/>',
 "wave": '<path d="M4 20c4-6 8-6 12 0s8 6 12 0 8-6 8-6"/>',
}
ART = {**ICONS, **SCENES, **FILLERS}
SIZE = 640     # tuile qui se raccorde sans coupure (le placement boucle sur les bords)
rng = random.Random(7)
# (catalogue, nombre, taille min, taille max) : les grandes scènes d'abord, puis les outils, puis les détails
# Petit et serré, comme le papier peint de WhatsApp : les scènes du récit un peu plus grandes, les outils moyens, beaucoup de petits détails.
TIERS = [(SCENES, 44, 0.95, 1.35), (ICONS, 230, 0.55, 0.9), (FILLERS, 140, 0.26, 0.4)]
GAP = 3        # écart minimal entre deux motifs, en px : serré sans se toucher

def tdist(a, b):
    dx, dy = abs(a[0] - b[0]), abs(a[1] - b[1])
    return math.hypot(min(dx, SIZE - dx), min(dy, SIZE - dy))

placed = []   # (x, y, rayon, nom, échelle, angle)
for cat, count, lo, hi in TIERS:
    names = list(cat)
    big = cat is SCENES
    for i in range(count):
        s = rng.uniform(lo, hi)
        r = 17 * s
        best = None
        for _ in range(120):
            p = (rng.uniform(0, SIZE), rng.uniform(0, SIZE))
            gap = min((tdist(p, q) - r - q[2] for q in placed), default=99)
            if best is None or gap > best[0]:
                best = (gap, p)
        if best[0] < GAP and not big:
            continue  # plus de place : on n'entasse pas
        x, y = best[1]
        near = {q[3] for q in sorted(placed, key=lambda q: tdist((x, y), q))[:6]}
        # les scènes passent chacune à leur tour pour que tout le récit soit sur la tuile
        name = names[i % len(names)] if big else rng.choice([n for n in names if n not in near] or names)
        a = rng.uniform(-25, 25) if big else rng.uniform(-50, 50)  # les scènes restent presque droites, lisibles
        placed.append((x, y, r, name, s, a))

def svg(color, opacity):
    g = []
    for x, y, r, name, s, a in placed:
        for dx in (-SIZE, 0, SIZE):
            for dy in (-SIZE, 0, SIZE):
                X, Y = x + dx - 20 * s, y + dy - 20 * s
                if -140 < X < SIZE + 140 and -140 < Y < SIZE + 140:
                    w = (1.6 if name in SCENES else 1.4) / s
                    fill = ' fill="currentColor"' if name in ("dot", "star") else ""
                    g.append(f'<g transform="translate({X:.1f} {Y:.1f}) scale({s:.2f}) rotate({a:.0f} 20 20)" stroke-width="{w:.2f}"{fill}>{ART[name]}</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" fill="none" stroke="{color}" '
            f'stroke-opacity="{opacity}" color="{color}" fill-opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round">{"".join(g)}</svg>\n')

for name, color, op in (("light", "#1a74c7", "0.11"), ("dark", "#e9ecf2", "0.07")):
    open(f"public/brand/chat-pattern-{name}.svg", "w").write(svg(color, op))
print(len(placed), "motifs posés :", {n: sum(1 for q in placed if q[3] in c) for n, c in (("scènes", SCENES), ("outils", ICONS), ("détails", FILLERS))})
