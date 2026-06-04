import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MatchesModule } from './matches/matches.module';
import { TipsModule } from './tips/tips.module';
import { StandingsModule } from './standings/standings.module';
import { FootballApiModule } from './football-api/football-api.module';
import { DiscordBotModule } from './discord-bot/discord-bot.module';
import { GroupsModule } from './groups/groups.module';
import { KnockoutModule } from './knockout/knockout.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    MatchesModule,
    TipsModule,
    StandingsModule,
    FootballApiModule,
    DiscordBotModule,
    GroupsModule,
    KnockoutModule,
  ],
})
export class AppModule {}
