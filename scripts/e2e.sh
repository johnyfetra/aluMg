#!/usr/bin/env bash
# Tests de bout en bout sur une base JETABLE et un autre port : ne touche ni à .data/ ni au serveur de développement.
#   npm run test:e2e:fresh
set -euo pipefail
PORT="${PORT:-3100}"
WORK="$(mktemp -d)"
# base jetable ; RATE_LIMIT=off (beaucoup d'inscriptions depuis la même IP) ; ALUMG_DEV_SENDER=1 (codes de vérification renvoyés par l'API, jamais en vrai déploiement) ;
# NEXT_PUBLIC_MVP=0 : le test couvre aussi l'annuaire et le reste, masqués en mode MVP
export PGLITE_DIR="$WORK/pg" NEXT_DIST_DIR=".next-e2e" RATE_LIMIT=off ALUMG_DEV_SENDER=1 NEXT_PUBLIC_MVP=0
trap 'kill "${PID:-0}" 2>/dev/null || true; rm -rf "$WORK" .next-e2e' EXIT

npx next build >"$WORK/build.log" 2>&1 || { cat "$WORK/build.log"; exit 1; }
npx next start -p "$PORT" >"$WORK/server.log" 2>&1 &
PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$PORT/connexion" && break; sleep 1; done
E2E=1 E2E_BASE_URL="http://localhost:$PORT" npx vitest run
