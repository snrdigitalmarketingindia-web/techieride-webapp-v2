import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';
import { ChangePasswordDto } from '../auth/dto/auth.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';
import { AllowDocsPending } from '../../common/decorators/allow-docs-pending.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private trustScoreService: TrustScoreService,
  ) {}

  @AllowUnverified()
  @Get('me')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @AllowDocsPending()
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

  // ── Email change ────────────────────────────────────────────────────────
  @AllowDocsPending()
  @Post('me/request-email-change')
  requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body('newEmail') newEmail: string,
  ) {
    return this.usersService.requestEmailChange(userId, newEmail);
  }

  @AllowUnverified()
  @Post('confirm-email-change')
  confirmEmailChange(@Body('token') token: string) {
    return this.usersService.confirmEmailChange(token);
  }

  @AllowDocsPending()
  @Post('me/request-personal-email-change')
  requestPersonalEmailChange(
    @CurrentUser('id') userId: string,
    @Body('newEmail') newEmail: string,
  ) {
    return this.usersService.requestPersonalEmailChange(userId, newEmail);
  }

  @AllowUnverified()
  @Post('confirm-personal-email-change')
  confirmPersonalEmailChange(@Body('token') token: string) {
    return this.usersService.confirmPersonalEmailChange(token);
  }

  // ── Password change ─────────────────────────────────────────────────────
  @Post('me/change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }

  @Get('me/trust-score')
  getMyTrustScore(@CurrentUser('id') userId: string) {
    return this.trustScoreService.getScore(userId);
  }

  @Get('me/trust-score/history')
  getMyTrustHistory(@CurrentUser('id') userId: string) {
    return this.trustScoreService.getHistory(userId);
  }
}
