import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchDetailsModule } from '../match-details/match-details.module';

@Module({
  imports: [PrismaModule, MatchDetailsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
