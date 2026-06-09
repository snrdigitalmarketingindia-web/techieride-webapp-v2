import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { VerificationService } from '../verification/verification.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RidesService } from '../rides/rides.service';
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
    private trustScoreService: TrustScoreService,
    private auditLogService: AuditLogService,
    private ridesService: RidesService,
  ) {}

  @Get('users')
  listUsers(
    @Query('accountStatus') accountStatus?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listUsers({ accountStatus, role, search, page: +page, limit: +limit });
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/role')
  assignRole(
    @Param('id') id: string,
    @Body('role') role: 'RIDE_SEEKER' | 'RIDE_GIVER' | 'ADMIN',
  ) {
    return this.adminService.assignRole(id, role);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Patch('users/:id/reject')
  rejectUser(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectUser(id, reason);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Verification queues ───────────────────────────────────────────────────
  @Get('queues/email-pending')
  getEmailPendingQueue() {
    return this.adminService.getUsersByAccountStatus('EMAIL_VERIFICATION_PENDING');
  }

  @Get('queues/identity-pending')
  getIdentityQueue() {
    return this.verificationService.getQueue('IDENTITY');
  }

  @Get('queues/driver-pending')
  getDriverQueue() {
    return this.verificationService.getQueue('DRIVER');
  }

  @Get('verification/pending')
  getAllPendingVerifications() {
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
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listAllRides({ status, search, page: +page, limit: +limit });
  }

  @Post('rides/:id/force-complete')
  forceCompleteRide(@Param('id') id: string) {
    return this.ridesService.forceCompleteRide(id, 'admin');
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

  // ── Audit Log ─────────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(
    @Query('actor') actor?: string,
    @Query('actorType') actorType?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.auditLogService.query({
      actor, actorType, action, entityType, entityId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: +page,
      limit: +limit,
    });
  }

  // ── Trust Score ────────────────────────────────────────────────────────

  @Get('users/:id/trust-score')
  getTrustScore(@Param('id') id: string) {
    return this.trustScoreService.getScore(id);
  }

  @Get('users/:id/trust-score/history')
  getTrustHistory(@Param('id') id: string) {
    return this.trustScoreService.getHistory(id);
  }

  @Patch('users/:id/trust-score')
  adjustTrustScore(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('delta') delta: number,
    @Body('reason') reason: string,
  ) {
    return this.trustScoreService.adminAdjust(id, delta, reason, adminId);
  }

  @Patch('users/:id/reinstate')
  reinstateUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.trustScoreService.adminReinstate(id, adminId);
  }

  // ── Complaint Debugger — full user audit in one call ─────────────────────
  @Get('users/:id/audit')
  getUserAudit(@Param('id') id: string) {
    return this.adminService.getUserAudit(id);
  }
}
