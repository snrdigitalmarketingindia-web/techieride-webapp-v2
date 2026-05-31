import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { VerificationService } from '../verification/verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@techieride/shared';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private verificationService: VerificationService,
  ) {}

  @Get('users')
  listUsers(
    @Query('verificationStatus') verificationStatus?: string,
    @Query('role') role?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listUsers({ verificationStatus, role, page: +page, limit: +limit });
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Get('verification/pending')
  getPendingVerifications() {
    return this.verificationService.getPendingQueue();
  }

  @Patch('verification/:id/review')
  reviewVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ) {
    return this.verificationService.review(id, adminId, body.decision, body.rejectionReason);
  }

  @Get('vehicles')
  listVehicles(@Query('pending') pending?: string) {
    return this.adminService.listVehicles(pending === 'true');
  }

  @Patch('vehicles/:id/verify')
  verifyVehicle(@Param('id') id: string) {
    return this.adminService.verifyVehicle(id);
  }

  @Patch('vehicles/:id/reject')
  rejectVehicle(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectVehicle(id, reason);
  }

  @Get('rides')
  listRides(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listAllRides(status, +page, +limit);
  }

  @Get('analytics')
  getAnalytics(@Query('from') from: string, @Query('to') to: string) {
    return this.adminService.getAnalytics(
      from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to ? new Date(to) : new Date(),
    );
  }

  @Get('sos/active')
  listActiveSos() {
    return this.adminService.listActiveSos();
  }

  @Patch('sos/:id/resolve')
  resolveSos(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('notes') notes: string,
  ) {
    return this.adminService.resolveSos(id, adminId, notes);
  }
}
