import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MatchDetailsModule } from '../match-details/match-details.module';
import { TipsModule } from '../tips/tips.module';

@Module({
  imports: [PrismaModule, MatchDetailsModule, TipsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
