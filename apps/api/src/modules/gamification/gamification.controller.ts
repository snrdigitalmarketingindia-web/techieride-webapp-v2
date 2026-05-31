import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private service: GamificationService) {}

  @Get('summary')
  getSummary(@CurrentUser('id') userId: string) {
    return this.service.getSummary(userId);
  }

  @Public()
  @Get('leaderboard')
  getLeaderboard(
    @Query('period') period: 'monthly' | 'alltime' = 'monthly',
    @Query('limit') limit = 50,
  ) {
    return this.service.getLeaderboard(period, +limit);
  }
}
