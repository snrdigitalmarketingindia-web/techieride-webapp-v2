import { Controller, Get, Post, Delete, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private service: VehiclesService) {}

  @Post() create(@CurrentUser('id') userId: string, @Body() dto: CreateVehicleDto) {
    return this.service.create(userId, dto);
  }
  @Get('my') findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }
  @Patch(':id/rc') updateRc(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('rcUrl') rcUrl: string,
  ) {
    return this.service.updateRcUrl(id, userId, rcUrl);
  }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
