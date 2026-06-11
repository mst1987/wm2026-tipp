import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TipsModule } from '../tips/tips.module';
import { MatchDetailsService } from './match-details.service';

@Module({
  imports: [PrismaModule, TipsModule],
  providers: [MatchDetailsService],
  exports: [MatchDetailsService],
})
export class MatchDetailsModule {}
