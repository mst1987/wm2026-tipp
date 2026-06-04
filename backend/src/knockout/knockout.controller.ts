import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KnockoutService } from './knockout.service';

@ApiTags('knockout')
@Controller('knockout')
export class KnockoutController {
  constructor(private readonly knockoutService: KnockoutService) {}

  @Get()
  getKnockoutStages() {
    return this.knockoutService.getKnockoutStages();
  }
}
