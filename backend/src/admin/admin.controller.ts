import { Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { MatchDetailsService } from '../match-details/match-details.service';
import { TipsService } from '../tips/tips.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly matchDetailsService: MatchDetailsService,
    private readonly tipsService: TipsService,
  ) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/payment')
  togglePayment(@Param('id') id: string) {
    return this.adminService.togglePayment(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── API-Football: Status & manueller Sync ───

  @Get('api-status')
  getApiStatus() {
    return this.matchDetailsService.getApiStatus();
  }

  @Post('sync-details')
  syncDetails() {
    return this.matchDetailsService.manualSync();
  }

  @Post('recalculate-points')
  recalculatePoints() {
    return this.tipsService.recalculateAllPoints();
  }
}
