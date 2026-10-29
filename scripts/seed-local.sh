#!/usr/bin/env bash
# Base locale complète pour tester le menuisier ET le client : serveur de développement sur la base embarquée (.data/pglite),
# comptes, devis réalistes, conversations, puis dates étalées. Ne touche jamais à Supabase (DATABASE_URL / POSTGRES_URL vidés).
#   npm run seed:local
# Comptes : mot de passe de scripts/demo-data.mjs ; menuisier test@alumada.mg ; clients hery@, noro@, toky@, lalao@client.mg.
set -euo pipefail
PORT="${PORT:-3200}"
export DATABASE_URL="" POSTGRES_URL="" POSTGRES_URL_NON_POOLING="" POSTGRES_PRISMA_URL="" RATE_LIMIT=off ALUMG_DEV_SENDER=1 NEXT_DIST_DIR=".next-seed" E2E_BASE_URL="http://localhost:$PORT"
LOG="$(mktemp)"
trap 'kill "${PID:-0}" 2>/dev/null || true; wait "${PID:-0}" 2>/dev/null || true' EXIT
npx next dev -p "$PORT" >"$LOG" 2>&1 &
PID=$!
for _ in $(seq 1 90); do curl -sf -o /dev/null "http://localhost:$PORT/connexion" && break; sleep 1; done
node scripts/seed-demo.mjs
npx tsx scripts/seed-quotes.mts
kill "$PID"; wait "$PID" 2>/dev/null || true; PID=""
npx tsx scripts/backdate-demo.ts
rm -rf .next-seed
echo "Terminé. Lancez : npm run dev:local   puis ouvrez http://localhost:3200"
