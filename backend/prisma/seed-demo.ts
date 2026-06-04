/**
 * Fiktive Ergebnisse für den 1. Spieltag (Beispieldaten).
 * Echte Teams, fiktive Ergebnisse für Demo-Zwecke.
 *
 * Zurücksetzen: npm run prisma:seed-demo:clear
 */
import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

// externalId = football-data.org Match-ID
// Ergebnisse sind fiktiv für Demo-Zwecke
const firstMatchdayResults = [
  // Gruppe A
  { externalId: 537327, teamHome: 'Mexico',       teamAway: 'South Africa',       scoreHome: 2, scoreAway: 1 },
  { externalId: 537328, teamHome: 'South Korea',  teamAway: 'Czechia',            scoreHome: 1, scoreAway: 1 },
  // Gruppe B
  { externalId: 537333, teamHome: 'Canada',       teamAway: 'Bosnia-Herzegovina', scoreHome: 2, scoreAway: 0 },
  { externalId: 537334, teamHome: 'Qatar',        teamAway: 'Switzerland',        scoreHome: 0, scoreAway: 3 },
  // Gruppe C
  { externalId: 537340, teamHome: 'Brazil',       teamAway: 'Morocco',            scoreHome: 3, scoreAway: 0 },
  { externalId: 537341, teamHome: 'Haiti',        teamAway: 'Scotland',           scoreHome: 1, scoreAway: 2 },
  // Gruppe D
  { externalId: 537348, teamHome: 'United States',teamAway: 'Paraguay',           scoreHome: 4, scoreAway: 1 },
  { externalId: 537349, teamHome: 'Australia',    teamAway: 'Turkey',             scoreHome: 0, scoreAway: 1 },
  // Gruppe E
  { externalId: 537356, teamHome: 'Germany',      teamAway: 'Curaçao',            scoreHome: 5, scoreAway: 0 },
  { externalId: 537357, teamHome: 'Ivory Coast',  teamAway: 'Ecuador',            scoreHome: 1, scoreAway: 2 },
  // Gruppe F
  { externalId: 537364, teamHome: 'Netherlands',  teamAway: 'Japan',              scoreHome: 2, scoreAway: 1 },
  { externalId: 537365, teamHome: 'Sweden',       teamAway: 'Tunisia',            scoreHome: 3, scoreAway: 0 },
  // Gruppe G
  { externalId: 537372, teamHome: 'Belgium',      teamAway: 'Egypt',              scoreHome: 2, scoreAway: 0 },
  { externalId: 537373, teamHome: 'Iran',         teamAway: 'New Zealand',        scoreHome: 1, scoreAway: 0 },
  // Gruppe H
  { externalId: 537369, teamHome: 'Spain',        teamAway: 'Cape Verde Islands', scoreHome: 3, scoreAway: 0 },
  { externalId: 537370, teamHome: 'Saudi Arabia', teamAway: 'Uruguay',            scoreHome: 0, scoreAway: 2 },
  // Gruppe I
  { externalId: 537391, teamHome: 'France',       teamAway: 'Senegal',            scoreHome: 2, scoreAway: 0 },
  { externalId: 537392, teamHome: 'Iraq',         teamAway: 'Norway',             scoreHome: 0, scoreAway: 3 },
  // Gruppe J
  { externalId: 537396, teamHome: 'Argentina',    teamAway: 'Algeria',            scoreHome: 2, scoreAway: 0 },
  { externalId: 537397, teamHome: 'Austria',      teamAway: 'Jordan',             scoreHome: 3, scoreAway: 1 },
  // Gruppe K
  { externalId: 537404, teamHome: 'Portugal',     teamAway: 'Congo DR',           scoreHome: 4, scoreAway: 0 },
  { externalId: 537405, teamHome: 'Uzbekistan',   teamAway: 'Colombia',           scoreHome: 0, scoreAway: 2 },
  // Gruppe L
  { externalId: 537412, teamHome: 'England',      teamAway: 'Croatia',            scoreHome: 3, scoreAway: 0 },
  { externalId: 537413, teamHome: 'Ghana',        teamAway: 'Panama',             scoreHome: 2, scoreAway: 1 },
];

async function main() {
  console.log('Füge Demo-Ergebnisse für 1. Spieltag ein...');
  console.log('(Fiktive Ergebnisse — nur für Demo-Zwecke)\n');

  let ok = 0;
  let missing = 0;

  for (const r of firstMatchdayResults) {
    const result = await prisma.match.updateMany({
      where: { externalId: r.externalId },
      data: { scoreHome: r.scoreHome, scoreAway: r.scoreAway, status: MatchStatus.FINISHED },
    });
    if (result.count > 0) {
      console.log(`  ✓ [${r.externalId}] ${r.teamHome} ${r.scoreHome}:${r.scoreAway} ${r.teamAway}`);
      ok++;
    } else {
      console.warn(`  ✗ Nicht gefunden (ID ${r.externalId}) — erst "npm run prisma:seed-api" ausführen!`);
      missing++;
    }
  }

  console.log(`\nFertig: ${ok} aktualisiert${missing ? `, ${missing} nicht gefunden` : ''}.`);
  console.log('Zurücksetzen: npm run prisma:seed-demo:clear');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
