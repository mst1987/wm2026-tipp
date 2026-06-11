import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { MatchDetailsService } from '../match-details/match-details.service';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDetailsService: MatchDetailsService,
  ) {}

  @Get()
  findAll() {
    return this.matchesService.findAll();
  }

  @Get('upcoming')
  findUpcoming() {
    return this.matchesService.findUpcoming();
  }

  @Get('recent')
  findRecent() {
    return this.matchesService.findRecent();
  }

  @Get('scorers')
  getScorers() {
    return this.matchDetailsService.getTopScorers();
  }

  @Get(':id/details')
  getDetails(@Param('id') id: string) {
    return this.matchDetailsService.getDetails(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findById(id);
  }
}
