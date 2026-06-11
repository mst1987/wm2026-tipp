import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StandingsService } from './standings.service';

@ApiTags('standings')
@Controller('standings')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  getLeaderboard() {
    return this.standingsService.getLeaderboard();
  }

  @Get('live')
  getLiveLeaderboard() {
    return this.standingsService.getLiveLeaderboard();
  }
}
