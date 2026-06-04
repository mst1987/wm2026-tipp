/**
 * Setzt alle Demo-Ergebnisse des 1. Spieltags zurück auf SCHEDULED.
 */
import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

const firstMatchdayExternalIds = [
  537327, 537328, // Gruppe A
  537333, 537334, // Gruppe B
  537340, 537341, // Gruppe C
  537348, 537349, // Gruppe D
  537356, 537357, // Gruppe E
  537364, 537365, // Gruppe F
  537372, 537373, // Gruppe G
  537369, 537370, // Gruppe H
  537391, 537392, // Gruppe I
  537396, 537397, // Gruppe J
  537404, 537405, // Gruppe K
  537412, 537413, // Gruppe L
];

async function main() {
  console.log('Setze Demo-Ergebnisse zurück...');

  const matches = await prisma.match.findMany({
    where: { externalId: { in: firstMatchdayExternalIds } },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  const matchResult = await prisma.match.updateMany({
    where: { externalId: { in: firstMatchdayExternalIds } },
    data: { scoreHome: null, scoreAway: null, status: MatchStatus.SCHEDULED },
  });

  const tipResult = await prisma.tip.updateMany({
    where: { matchId: { in: matchIds } },
    data: { points: 0, pointsAwarded: false },
  });

  console.log(`✓ ${matchResult.count} Spiele → SCHEDULED (kein Ergebnis)`);
  console.log(`✓ ${tipResult.count} Tipps → Punkte zurückgesetzt`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
