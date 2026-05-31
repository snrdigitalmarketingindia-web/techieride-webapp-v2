import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommuteTemplatesService } from './commute-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Commute Templates')
@ApiBearerAuth()
@Controller('templates')
export class CommuteTemplatesController {
  constructor(private service: CommuteTemplatesService) {}

  @Post() create(@CurrentUser('id') userId: string, @Body() dto: CreateTemplateDto) {
    return this.service.create(userId, dto);
  }
  @Get('my') findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }
  @Patch(':id/toggle') toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.toggle(id, userId);
  }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
