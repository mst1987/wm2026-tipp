import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchDetailsService } from './match-details.service';

@Module({
  imports: [PrismaModule],
  providers: [MatchDetailsService],
  exports: [MatchDetailsService],
})
export class MatchDetailsModule {}
