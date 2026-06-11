import { Controller, Get, Post, Body, Req, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@ApiTags('tips')
@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  getTipsByUser(@Req() req: any, @Param('userId') userId: string) {
    return this.tipsService.findByUserVisibleTo(userId, req.user?.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  getMyTips(@Req() req: any) {
    return this.tipsService.findByUser(req.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  submitTip(@Req() req: any, @Body() dto: CreateTipDto) {
    return this.tipsService.upsert(req.user.id, dto.matchId, dto.predictedHome, dto.predictedAway);
  }
}
