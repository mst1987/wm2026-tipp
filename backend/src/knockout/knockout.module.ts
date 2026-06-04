import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KnockoutService } from './knockout.service';
import { KnockoutController } from './knockout.controller';

@Module({
  imports: [PrismaModule],
  controllers: [KnockoutController],
  providers: [KnockoutService],
})
export class KnockoutModule {}
