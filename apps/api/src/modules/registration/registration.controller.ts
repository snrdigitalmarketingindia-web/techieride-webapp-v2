import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RegistrationService } from './registration.service';
import {
  StartRegistrationDto, CompleteProfileDto, SubmitOfficeEmailDto,
  SubmitExceptionDto, UploadDocsDto, UpdateEmailDto, ResendDto,
} from './dto/registration.dto';

@Public()
@Controller('register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('start')
  start(@Body() dto: StartRegistrationDto) {
    return this.registrationService.start(dto);
  }

  @Post('resend-personal')
  resendPersonal(@Body() dto: ResendDto) {
    return this.registrationService.resendPersonal(dto.pendingId);
  }

  @Patch('update-personal-email')
  updatePersonalEmail(@Body() dto: UpdateEmailDto) {
    return this.registrationService.updatePersonalEmail(dto.pendingId, dto.email);
  }

  @Get('verify-personal')
  verifyPersonalEmail(@Query('token') token: string) {
    return this.registrationService.verifyPersonalEmail(token);
  }

  @Post(':id/profile')
  submitProfile(@Param('id') id: string, @Body() dto: CompleteProfileDto) {
    return this.registrationService.submitProfile(id, dto);
  }

  @Post(':id/office-email')
  submitOfficeEmail(@Param('id') id: string, @Body() dto: SubmitOfficeEmailDto) {
    return this.registrationService.submitOfficeEmail(id, dto);
  }

  @Patch(':id/update-office-email')
  updateOfficeEmail(@Param('id') id: string, @Body('email') email: string) {
    return this.registrationService.updateOfficeEmail(id, email);
  }

  @Post(':id/resend-office')
  resendOffice(@Param('id') id: string) {
    return this.registrationService.resendOffice(id);
  }

  @Get('verify-office')
  verifyOfficeEmail(@Query('token') token: string) {
    return this.registrationService.verifyOfficeEmail(token);
  }

  @Post(':id/exception')
  submitException(@Param('id') id: string, @Body() dto: SubmitExceptionDto) {
    return this.registrationService.submitException(id, dto);
  }

  @Post(':id/documents')
  submitDocuments(@Param('id') id: string, @Body() dto: UploadDocsDto) {
    return this.registrationService.submitDocuments(id, dto);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.registrationService.getStatus(id);
  }
}
