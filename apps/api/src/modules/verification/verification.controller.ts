import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowDocsPending } from '../../common/decorators/allow-docs-pending.decorator';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private service: VerificationService) {}

  // Employee verification — submit company ID + profile photo
  @AllowDocsPending()
  @Post('employee')
  @HttpCode(HttpStatus.OK)
  submitEmployeeDocs(
    @CurrentUser('id') userId: string,
    @Body() body: { employeeIdUrl: string; profilePhotoUrl?: string },
  ) {
    return this.service.submitEmployeeDocs(userId, body);
  }

  // Seeker verification — submit govt ID + self-declaration (requires EMPLOYEE_VERIFIED)
  @Post('seeker')
  @HttpCode(HttpStatus.OK)
  submitSeekerDocs(
    @CurrentUser('id') userId: string,
    @Body() body: { govtIdUrl: string; selfDeclarationAccepted: boolean },
  ) {
    return this.service.submitSeekerDocs(userId, body);
  }

  // Driver verification — submit DL + RC (requires EMPLOYEE_VERIFIED or SEEKER_VERIFIED)
  @Post('driver')
  @HttpCode(HttpStatus.OK)
  submitDriverDocs(
    @CurrentUser('id') userId: string,
    @Body() body: { drivingLicenseUrl: string; rcUrl: string },
  ) {
    return this.service.submitDriverDocs(userId, body);
  }

  @AllowDocsPending()
  @Get('status')
  getStatus(@CurrentUser('id') userId: string) {
    return this.service.getStatus(userId);
  }
}
