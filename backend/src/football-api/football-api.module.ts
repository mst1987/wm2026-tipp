import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module';
import { TipsModule } from '../tips/tips.module';
import { FootballApiService } from './football-api.service';

@Module({
  imports: [MatchesModule, TipsModule],
  providers: [FootballApiService],
})
export class FootballApiModule {}
