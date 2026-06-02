import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ComplaintsService } from './complaints.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplaintReason, ComplaintStatus, UserRole } from '@techieride/shared';

class FileComplaintDto {
  @IsUUID() reportedId: string;
  @IsUUID() @IsOptional() rideId?: string;
  @IsEnum(ComplaintReason) reason: ComplaintReason;
  @IsString() @IsOptional() @MaxLength(1000) description?: string;
}

class UpdateComplaintDto {
  @IsEnum(ComplaintStatus) status: ComplaintStatus;
  @IsString() @IsOptional() @MaxLength(500) adminNotes?: string;
}

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private complaintsService: ComplaintsService) {}

  // User: file a complaint
  @Post()
  @HttpCode(HttpStatus.CREATED)
  file(@CurrentUser('id') userId: string, @Body() dto: FileComplaintDto) {
    return this.complaintsService.fileComplaint(userId, dto);
  }

  // User: see own submitted complaints
  @Get('my')
  getMy(@CurrentUser('id') userId: string) {
    return this.complaintsService.getMyComplaints(userId);
  }

  // Admin: get all complaints with optional filters
  @Get('admin')
  @Roles(UserRole.ADMIN)
  adminGetAll(
    @Query('status') status?: string,
    @Query('reportedId') reportedId?: string,
  ) {
    return this.complaintsService.adminGetAll({ status, reportedId });
  }

  // Admin: update complaint status
  @Patch('admin/:id')
  @Roles(UserRole.ADMIN)
  adminUpdate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.complaintsService.adminUpdateStatus(id, adminId, dto);
  }
}
