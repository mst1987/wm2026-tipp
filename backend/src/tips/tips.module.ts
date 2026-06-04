import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
