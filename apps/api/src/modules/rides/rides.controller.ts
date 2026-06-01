import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Rides')
@ApiBearerAuth()
@Controller('rides')
export class RidesController {
  constructor(private ridesService: RidesService) {}

  @Public()
  @Get('search')
  search(@Query() dto: SearchRidesDto) {
    return this.ridesService.search(dto);
  }

  @Get('given')
  getGiven(@CurrentUser('id') userId: string, @Query('status') status?: string) {
    return this.ridesService.getGivenRides(userId, status);
  }

  @Get('taken')
  getTaken(@CurrentUser('id') userId: string) {
    return this.ridesService.getTakenRides(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findById(id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRideDto) {
    return this.ridesService.create(userId, dto);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ridesService.publish(id, userId);
  }

  @Patch(':id/start')
  start(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ridesService.start(id, userId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ridesService.complete(id, userId);
  }

  @Patch(':id/edit')
  edit(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() body: any) {
    return this.ridesService.edit(id, userId, body);
  }

  @Patch(':id/no-show/:seekerId')
  markNoShow(
    @Param('id') id: string,
    @Param('seekerId') seekerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ridesService.markNoShow(id, seekerId, userId);
  }

  @Patch(':id/board')
  board(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ridesService.board(id, userId);
  }

  @Patch(':id/deboard')
  deboard(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ridesService.deboard(id, userId);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.ridesService.cancel(id, userId, reason);
  }
}
