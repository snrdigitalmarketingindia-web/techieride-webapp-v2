import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @AllowUnverified()
  @Get('me')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @AllowUnverified()
  @Patch('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Get('me/emergency-contacts')
  getEmergencyContacts(@CurrentUser('id') userId: string) {
    return this.usersService.getEmergencyContacts(userId);
  }

  @Post('me/emergency-contacts')
  addEmergencyContact(
    @CurrentUser('id') userId: string,
    @Body() dto: AddEmergencyContactDto,
  ) {
    return this.usersService.addEmergencyContact(userId, dto);
  }

  @Delete('me/emergency-contacts/:id')
  removeEmergencyContact(
    @CurrentUser('id') userId: string,
    @Param('id') contactId: string,
  ) {
    return this.usersService.removeEmergencyContact(userId, contactId);
  }
}
