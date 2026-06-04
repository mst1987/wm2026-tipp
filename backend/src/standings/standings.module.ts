import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}
