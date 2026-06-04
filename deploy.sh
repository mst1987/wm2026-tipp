#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }

# ── Voraussetzungen prüfen ───────────────────────────────────────────────────
command -v docker  >/dev/null || { echo "Docker nicht gefunden."; exit 1; }
command -v git     >/dev/null || { echo "Git nicht gefunden."; exit 1; }

if [ ! -f ".env" ]; then
  warn ".env nicht gefunden — kopiere .env.example und passe die Werte an."
  cp .env.example .env
  echo "Bitte .env bearbeiten und deploy.sh erneut ausführen."
  exit 1
fi

# ── Code aktualisieren ───────────────────────────────────────────────────────
log "Aktualisiere Code..."
git pull origin main

# ── Container bauen & starten ────────────────────────────────────────────────
log "Baue Container..."
docker compose build --no-cache

log "Starte Dienste..."
docker compose up -d

# ── Auf Backend warten ───────────────────────────────────────────────────────
log "Warte auf Backend..."
for i in $(seq 1 30); do
  if docker compose exec -T backend node -e "require('http').get('http://localhost:3000/api', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))" 2>/dev/null; then
    break
  fi
  sleep 2
done

# ── Spieldaten importieren (nur beim Erststart) ──────────────────────────────
if [ "${SEED:-false}" = "true" ]; then
  log "Importiere WM 2026 Spieldaten..."
  docker compose exec -T backend npm run prisma:seed-api:prod
fi

# ── Status ───────────────────────────────────────────────────────────────────
log "Deployment abgeschlossen!"
echo ""
docker compose ps
echo ""
SERVER_IP=$(curl -sf https://api.ipify.org 2>/dev/null || echo "deine-server-ip")
log "App erreichbar unter: http://${SERVER_IP}"
