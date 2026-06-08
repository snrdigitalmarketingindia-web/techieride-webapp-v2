import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SavedLocationsService, CreateSavedLocationDto } from './saved-locations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Saved Locations')
@ApiBearerAuth()
@Controller('saved-locations')
export class SavedLocationsController {
  constructor(private service: SavedLocationsService) {}

  @Get('my')
  findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSavedLocationDto) {
    return this.service.create(userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<CreateSavedLocationDto>) {
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
