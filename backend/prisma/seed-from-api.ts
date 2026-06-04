/**
 * Lädt alle WM 2026 Gruppenspiele von football-data.org
 * und ersetzt die manuell angelegten Seed-Daten.
 *
 * Voraussetzung: FOOTBALL_API_KEY muss in .env gesetzt sein.
 * Ausführen: npm run prisma:seed-api
 */
import axios from 'axios';
import { PrismaClient, MatchStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: MatchStatus.SCHEDULED,
  TIMED:     MatchStatus.SCHEDULED,
  IN_PLAY:   MatchStatus.LIVE,
  PAUSED:    MatchStatus.LIVE,
  FINISHED:  MatchStatus.FINISHED,
  POSTPONED: MatchStatus.POSTPONED,
  CANCELLED: MatchStatus.CANCELLED,
  SUSPENDED: MatchStatus.CANCELLED,
};

async function main() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const baseUrl = process.env.FOOTBALL_API_BASE_URL ?? 'https://api.football-data.org/v4';

  if (!apiKey || apiKey === 'your_football_data_api_key') {
    console.error('FOOTBALL_API_KEY nicht gesetzt!');
    process.exit(1);
  }

  console.log('Lade WM 2026 Gruppenspiele von football-data.org...');

  const { data } = await axios.get(`${baseUrl}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': apiKey },
  });

  const matches = data.matches as any[];
  console.log(`${matches.length} Spiele gefunden (Gruppenphase + K.O.-Runden).`);

  // Alte Seed-Daten (manuell angelegte) löschen
  const deleted = await prisma.match.deleteMany({
    where: { id: { startsWith: 'seed-' } },
  });
  if (deleted.count > 0) {
    console.log(`${deleted.count} alte Seed-Einträge gelöscht.`);
  }

  let upserted = 0;
  for (const m of matches) {
    await prisma.match.upsert({
      where: { externalId: m.id },
      update: {
        teamHome:     m.homeTeam.name || 'TBD',
        teamAway:     m.awayTeam.name || 'TBD',
        teamHomeLogo: m.homeTeam.crest ?? null,
        teamAwayLogo: m.awayTeam.crest ?? null,
        matchDate:    new Date(m.utcDate),
        status:       STATUS_MAP[m.status] ?? MatchStatus.SCHEDULED,
        scoreHome:    m.score?.fullTime?.home ?? null,
        scoreAway:    m.score?.fullTime?.away ?? null,
        stage:        m.stage,
        group:        m.group ?? null,
      },
      create: {
        externalId:   m.id,
        teamHome:     m.homeTeam.name || 'TBD',
        teamAway:     m.awayTeam.name || 'TBD',
        teamHomeLogo: m.homeTeam.crest ?? null,
        teamAwayLogo: m.awayTeam.crest ?? null,
        matchDate:    new Date(m.utcDate),
        status:       STATUS_MAP[m.status] ?? MatchStatus.SCHEDULED,
        scoreHome:    m.score?.fullTime?.home ?? null,
        scoreAway:    m.score?.fullTime?.away ?? null,
        stage:        m.stage,
        group:        m.group ?? null,
      },
    });
    upserted++;
  }

  console.log(`✓ ${upserted} Spiele importiert (Gruppen + K.O.-Runden).`);
  console.log('\nDemo-Ergebnisse für 1. Spieltag hinzufügen: npm run prisma:seed-demo');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
