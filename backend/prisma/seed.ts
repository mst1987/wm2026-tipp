import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

const wm2026Groups = [
  // Group A
  { teamHome: 'Mexiko', teamAway: 'Jamaica', group: 'A', matchDate: new Date('2026-06-11T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Ecuador', teamAway: 'Venezuela', group: 'A', matchDate: new Date('2026-06-11T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Mexiko', teamAway: 'Ecuador', group: 'A', matchDate: new Date('2026-06-15T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Jamaica', teamAway: 'Venezuela', group: 'A', matchDate: new Date('2026-06-15T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Mexiko', teamAway: 'Venezuela', group: 'A', matchDate: new Date('2026-06-19T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Jamaica', teamAway: 'Ecuador', group: 'A', matchDate: new Date('2026-06-19T21:00:00Z'), stage: 'GROUP_STAGE' },
  // Group B
  { teamHome: 'USA', teamAway: 'Panama', group: 'B', matchDate: new Date('2026-06-12T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Honduras', teamAway: 'TBD', group: 'B', matchDate: new Date('2026-06-12T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'USA', teamAway: 'Honduras', group: 'B', matchDate: new Date('2026-06-16T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Panama', teamAway: 'TBD', group: 'B', matchDate: new Date('2026-06-16T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'USA', teamAway: 'TBD', group: 'B', matchDate: new Date('2026-06-20T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Honduras', teamAway: 'Panama', group: 'B', matchDate: new Date('2026-06-20T21:00:00Z'), stage: 'GROUP_STAGE' },
  // Group C
  { teamHome: 'Kanada', teamAway: 'Trinidad & Tobago', group: 'C', matchDate: new Date('2026-06-13T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Portugal', teamAway: 'Marokko', group: 'C', matchDate: new Date('2026-06-13T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Kanada', teamAway: 'Portugal', group: 'C', matchDate: new Date('2026-06-17T18:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Trinidad & Tobago', teamAway: 'Marokko', group: 'C', matchDate: new Date('2026-06-17T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Kanada', teamAway: 'Marokko', group: 'C', matchDate: new Date('2026-06-21T21:00:00Z'), stage: 'GROUP_STAGE' },
  { teamHome: 'Trinidad & Tobago', teamAway: 'Portugal', group: 'C', matchDate: new Date('2026-06-21T21:00:00Z'), stage: 'GROUP_STAGE' },
];

async function main() {
  console.log('Seeding database...');

  for (const match of wm2026Groups) {
    await prisma.match.upsert({
      where: {
        id: `seed-${match.group}-${match.teamHome}-${match.teamAway}`.replace(/\s/g, '-').toLowerCase(),
      },
      update: {},
      create: {
        id: `seed-${match.group}-${match.teamHome}-${match.teamAway}`.replace(/\s/g, '-').toLowerCase(),
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        matchDate: match.matchDate,
        stage: match.stage,
        group: match.group,
        status: MatchStatus.SCHEDULED,
      },
    });
  }

  console.log(`Seeded ${wm2026Groups.length} matches`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
