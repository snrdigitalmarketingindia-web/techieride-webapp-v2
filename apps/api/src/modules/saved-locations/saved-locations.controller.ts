import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
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
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateSavedLocationDto>,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Patch(':id/favorite')
  @HttpCode(HttpStatus.OK)
  toggleFavorite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.toggleFavorite(id, userId);
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  recordUsage(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.recordUsage(id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
