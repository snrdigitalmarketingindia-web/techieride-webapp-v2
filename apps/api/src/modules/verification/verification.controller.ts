import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private service: VerificationService) {}

  @Post('submit')
  submit(
    @CurrentUser('id') userId: string,
    @Body() body: { employeeIdUrl?: string; drivingLicenseUrl?: string; rcUrl?: string },
  ) {
    return this.service.submitDocuments(userId, body);
  }

  @Get('status')
  getStatus(@CurrentUser('id') userId: string) {
    return this.service.getStatus(userId);
  }
}
