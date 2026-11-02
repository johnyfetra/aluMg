#!/usr/bin/env python3
"""Génère la trame de fond de la messagerie (public/brand/chat-pattern-{light,dark}.svg) : motifs d'outils et d'ouvrages de menuiserie,
posés au hasard (position, angle, taille) sur une grande tuile qui se raccorde sans coupure. Graine fixe : le résultat est reproductible.
    python3 scripts/make-chat-pattern.py"""
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
}
NAMES = list(ICONS)
CELL, N = 44, 14         # grille 14×14 : tuile de 616 px, 196 motifs (plus large que le panneau : la répétition ne se voit plus)
SIZE = CELL * N
rng = random.Random(11)

grid = [[None] * N for _ in range(N)]
for r in range(N):
    for c in range(N):
        avoid = {grid[r][c - 1], grid[r - 1][c], grid[r][c - 2], grid[r - 2][c], grid[r - 1][(c + 1) % N], grid[r - 1][c - 1]}
        grid[r][c] = rng.choice([n for n in NAMES if n not in avoid])

def svg(color, opacity):
    g = []
    for r in range(N):
        for c in range(N):
            s = rng.uniform(0.52, 0.74)
            x = c * CELL + (CELL / 2 if r % 2 else 0) + rng.uniform(-7, 7)
            y = r * CELL + rng.uniform(-6, 6)
            a = rng.uniform(-32, 32)
            for dx in (-SIZE, 0, SIZE):
                for dy in (-SIZE, 0, SIZE):
                    X, Y = x + dx, y + dy
                    if -30 < X < SIZE + 30 and -30 < Y < SIZE + 30:
                        g.append(f'<g transform="translate({X:.1f} {Y:.1f}) rotate({a:.0f} 20 20) scale({s:.2f})" stroke-width="{1.5 / s:.2f}">{ICONS[grid[r][c]]}</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" fill="none" stroke="{color}" '
            f'stroke-opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round">{"".join(g)}</svg>\n')

for name, color, op in (("light", "#243b32", "0.10"), ("dark", "#ece9e2", "0.07")):
    rng.seed(99)  # mêmes positions et angles dans les deux thèmes
    open(f"public/brand/chat-pattern-{name}.svg", "w").write(svg(color, op))
