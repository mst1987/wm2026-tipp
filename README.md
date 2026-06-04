# 🏆 WM 2026 Tippspiel

Ein Tippspiel für die FIFA Weltmeisterschaft 2026 mit Discord-Login, Live-Ergebnissen und Gruppenranglisten.

## Features

- **Discord OAuth2** — Anmeldung mit Discord-Account
- **Spiele & Tipps** — Tippen bis 10 Minuten vor Spielstart, Änderungen jederzeit möglich
- **Live-Scores** — Laufende Spiele in Echtzeit mit Zwischenstand
- **Gruppenphase** — Tabellen aller 12 Gruppen (A–L) mit Live-Aktualisierung
- **K.O.-Runden** — Sechzehntel- bis Finale übersichtlich dargestellt
- **Rangliste** — Punkte pro Tipp (3 exakt / 1 Tendenz), Klick auf Spieler zeigt alle Tipps
- **Dashboard** — Öffentlich zugänglich, Top 5, nächste Spiele, Quick-Links
- **Automatischer Datensync** — Spieldaten alle 5 Minuten von football-data.org

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | Angular 18 (Standalone, Lazy Loading) |
| Backend | NestJS 10 (TypeScript) |
| Datenbank | PostgreSQL 16 + Prisma ORM |
| Auth | Discord OAuth2 + JWT |
| Daten | football-data.org API |
| Hosting | Docker Compose + nginx |

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- Docker Desktop (für PostgreSQL)

### Setup

```bash
# 1. Repository klonen
git clone https://github.com/dein-repo/wm2026-tipp.git
cd wm2026-tipp

# 2. .env für lokale Entwicklung anlegen (im backend/-Verzeichnis!)
cp .env.example backend/.env
# Werte in backend/.env eintragen (Discord-Keys, JWT-Secret etc.)
#
# Hinweis: Für den Server (Docker/Deployment) liegt die .env im ROOT-Verzeichnis.
# Lokal:  backend/.env  ← NestJS liest von hier (beim Start aus backend/)
# Server: .env          ← Docker Compose liest von hier (docker-compose.yml)

# 3. PostgreSQL starten
docker compose up postgres -d

# 4. Backend einrichten
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed-api     # Echte WM-2026-Spieldaten laden
npm run start:dev           # http://localhost:3001

# 5. Frontend starten (neues Terminal)
cd frontend
npm install
ng serve                    # http://localhost:4200
```

### Nützliche Backend-Befehle

```bash
npm run prisma:seed-api          # Alle 104 WM-Spiele von football-data.org importieren
npm run prisma:seed-demo         # Fiktive Ergebnisse für 1. Spieltag (Demo)
npm run prisma:seed-demo:clear   # Demo-Ergebnisse zurücksetzen
npm run prisma:studio            # Prisma Studio (Datenbank-UI)
```

### Umgebungsvariablen

Alle Variablen mit Beschreibung stehen in `.env.example`.
Wichtigste Pflichtfelder:

| Variable | Beschreibung |
|---|---|
| `DISCORD_CLIENT_ID` | Discord App → OAuth2 |
| `DISCORD_CLIENT_SECRET` | Discord App → OAuth2 |
| `DISCORD_CALLBACK_URL` | Redirect-URI (muss im Discord-Portal eingetragen sein) |
| `JWT_SECRET` | Langer zufälliger String |
| `FOOTBALL_API_KEY` | Kostenlos: football-data.org |

---

## Deployment (Hetzner / Ubuntu VPS)

### Einmalig: Server einrichten

```bash
# Docker installieren
apt update && apt install -y docker.io docker-compose-plugin git

# Repository klonen
git clone https://github.com/dein-repo/wm2026-tipp.git
cd wm2026-tipp

# .env anlegen
cp .env.example .env
nano .env
```

**Folgende Werte in `.env` anpassen:**
- `POSTGRES_PASSWORD` — sicheres Datenbankpasswort
- `JWT_SECRET` — langer zufälliger String (z. B. `openssl rand -hex 32`)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — aus dem Discord Developer Portal
- `DISCORD_CALLBACK_URL` → `https://deine-domain.de/api/auth/discord/callback`
- `FRONTEND_URL` → `https://deine-domain.de`

**Discord Developer Portal:** Redirect-URI auf `https://deine-domain.de/api/auth/discord/callback` setzen.

### Erststart (mit Spieldaten)

```bash
chmod +x deploy.sh
SEED=true ./deploy.sh
```

### Jedes weitere Update

```bash
./deploy.sh
```

Das Script führt automatisch aus:
1. `git pull origin main`
2. Docker-Images neu bauen
3. Container neu starten
4. Datenbank-Migrationen

### Architektur im Betrieb

```
Internet :80
    │
    ▼
nginx (Frontend-Container)
    ├── /          → Angular SPA (statische Dateien)
    └── /api/*     → NestJS Backend (intern: backend:3000)
                        └── PostgreSQL (intern: postgres:5432)
```

Der Backend-Port ist **nicht** von außen erreichbar — alles läuft über nginx.

### HTTPS einrichten (optional, empfohlen)

Mit [Caddy](https://caddyserver.com/) als einfachste Option (automatisches SSL via Let's Encrypt):

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

`/etc/caddy/Caddyfile`:
```
deine-domain.de {
    reverse_proxy localhost:80
}
```

```bash
systemctl enable --now caddy
```

---

## Projektstruktur

```
wm2026-tipp/
├── backend/                  # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed-from-api.ts  # Spieldaten von football-data.org
│   │   ├── seed-demo.ts      # Demo-Ergebnisse 1. Spieltag
│   │   └── seed-demo-clear.ts
│   └── src/
│       ├── auth/             # Discord OAuth2 + JWT
│       ├── matches/          # Spielverwaltung
│       ├── tips/             # Tipp-Abgabe + Punkteberechnung
│       ├── standings/        # Rangliste
│       ├── groups/           # Gruppenphase-Tabellen
│       ├── knockout/         # K.O.-Runden
│       ├── football-api/     # Cron: Sync von football-data.org
│       └── discord-bot/      # Discord Bot (optional)
├── frontend/                 # Angular 18 App
│   ├── src/app/
│   │   ├── core/             # Services (auth, matches, tips, ...)
│   │   ├── layout/shell/     # Navbar + Layout
│   │   └── pages/            # dashboard, matches, groups, knockout, standings, ...
│   └── nginx.conf
├── docker-compose.yml
├── deploy.sh
└── .env.example
```

---

## Punktesystem

| Ergebnis | Punkte |
|---|---|
| Exaktes Ergebnis | **3 Punkte** |
| Richtige Tendenz (Sieg/Unentschieden/Niederlage) | **1 Punkt** |
| Falsch | **0 Punkte** |

Tipps sind bis **10 Minuten vor Spielstart** möglich und änderbar.
