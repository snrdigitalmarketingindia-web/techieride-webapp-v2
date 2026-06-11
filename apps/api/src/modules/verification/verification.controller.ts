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

  // Identity verification — submit company ID + govt ID + self-declaration (single admin approval)
  @AllowDocsPending()
  @Post('identity')
  @HttpCode(HttpStatus.OK)
  submitIdentityDocs(
    @CurrentUser('id') userId: string,
    @Body() body: {
      employeeIdUrl: string;
      govtIdUrl: string;
      selfDeclarationAccepted: boolean;
      profilePhotoUrl?: string;
    },
  ) {
    return this.service.submitIdentityDocs(userId, body);
  }

  // Driver verification — submit DL + RC + vehicle (requires SEEKER_VERIFIED)
  @Post('driver')
  @HttpCode(HttpStatus.OK)
  submitDriverDocs(
    @CurrentUser('id') userId: string,
    @Body() body: { drivingLicenseUrl: string; rcUrl: string; vehicleId?: string },
  ) {
    return this.service.submitDriverDocs(userId, body);
  }

  @AllowDocsPending()
  @Get('status')
  getStatus(@CurrentUser('id') userId: string) {
    return this.service.getStatus(userId);
  }
}
