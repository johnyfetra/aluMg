#!/usr/bin/env python3
"""Génère la trame de fond de la messagerie (public/brand/chat-pattern-{light,dark}.svg) : motifs d'outils et d'ouvrages de menuiserie,
posés au hasard et serrés (position, angle, taille très variés) sur une grande tuile qui se raccorde sans coupure. Graine fixe : reproductible.
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
NAMES = list(ICONS)
SIZE = 640     # tuile de 640 px qui se raccorde sans coupure (le placement boucle sur les bords)
COUNT = 400    # nombre de motifs : serré, avec des tailles très différentes
rng = random.Random(5)

def tdist(a, b):
    dx, dy = abs(a[0] - b[0]), abs(a[1] - b[1])
    return math.hypot(min(dx, SIZE - dx), min(dy, SIZE - dy))

# Tailles tirées avec beaucoup de petits et quelques grands ; on place les grands d'abord, puis les petits comblent les vides.
sizes = sorted((0.36 + 0.7 * rng.random() ** 1.7 for _ in range(COUNT)), reverse=True)
placed = []   # (x, y, rayon, nom)
for s in sizes:
    r = 20 * s
    best = None
    for _ in range(60):
        p = (rng.uniform(0, SIZE), rng.uniform(0, SIZE))
        gap = min((tdist(p, q) - r - q[2] for q in placed), default=99)
        if best is None or gap > best[0]:
            best = (gap, p)
    x, y = best[1]
    near = sorted(placed, key=lambda q: tdist((x, y), q))[:8]
    name = rng.choice([n for n in NAMES if n not in {q[3] for q in near}])
    placed.append((x, y, r, name, s, rng.uniform(-55, 55)))

def svg(color, opacity):
    g = []
    for x, y, r, name, s, a in placed:
        for dx in (-SIZE, 0, SIZE):
            for dy in (-SIZE, 0, SIZE):
                X, Y = x + dx - 20 * s, y + dy - 20 * s
                if -40 < X < SIZE + 40 and -40 < Y < SIZE + 40:
                    g.append(f'<g transform="translate({X:.1f} {Y:.1f}) scale({s:.2f}) rotate({a:.0f} 20 20)" stroke-width="{1.4 / s:.2f}">{ICONS[name]}</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" fill="none" stroke="{color}" '
            f'stroke-opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round">{"".join(g)}</svg>\n')

for name, color, op in (("light", "#243b32", "0.10"), ("dark", "#ece9e2", "0.07")):
    open(f"public/brand/chat-pattern-{name}.svg", "w").write(svg(color, op))
print(len(NAMES), "motifs,", len(placed), "posés, tailles", f"{min(sizes):.2f}-{max(sizes):.2f}")
