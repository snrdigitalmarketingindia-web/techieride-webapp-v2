import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RegistrationService } from '../registration/registration.service';
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
    private registrationService: RegistrationService,
    private verificationService: VerificationService,
    private trustScoreService: TrustScoreService,
    private auditLogService: AuditLogService,
    private ridesService: RidesService,
  ) {}

  @Get('users')
  listUsers(
    @Query('accountStatus') accountStatus?: string,
    @Query('role') role?: string,
    @Query('gender') gender?: string,
    @Query('search') search?: string,
    @Query('compliance') compliance?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listUsers({ accountStatus, role, gender, search, compliance: compliance === 'true', page: +page, limit: +limit });
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/profile')
  updateUserProfile(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUserProfile(id, data);
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

  @Patch('users/:id/force-verify')
  forceVerifyUser(@Param('id') id: string) {
    return this.adminService.forceVerifyUser(id);
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
    @Query('womenOnly') womenOnly?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listAllRides({ status, search, womenOnly: womenOnly === 'true', page: +page, limit: +limit });
  }

  @Get('rides/:id/detail')
  getRideDetail(@Param('id') id: string) {
    return this.adminService.getRideDetail(id);
  }

  @Get('seekers/:userId/stats')
  getSeekerStats(@Param('userId') userId: string) {
    return this.adminService.getSeekerStats(userId);
  }

  @Get('givers/:userId/seeker-relationships')
  getGiverSeekerRelationships(@Param('userId') userId: string) {
    return this.adminService.getGiverSeekerRelationships(userId);
  }

  @Get('rides/:id/messages')
  getRideMessages(@Param('id') id: string) {
    return this.adminService.getRideMessages(id);
  }

  @Get('givers/:userId/trust-timeline')
  getGiverTrustTimeline(@Param('userId') userId: string) {
    return this.adminService.getGiverTrustTimeline(userId);
  }

  @Post('rides/:id/force-complete')
  forceCompleteRide(@Param('id') id: string) {
    return this.ridesService.forceCompleteRide(id, 'admin');
  }

  @Post('rides/bulk-force-complete')
  bulkForceCompleteRides(
    @Body('olderThanHours') olderThanHours?: number,
    @Body('statuses') statuses?: string[],
  ) {
    return this.adminService.bulkForceCompleteRides(olderThanHours ?? 24, statuses);
  }

  @Get('analytics')
  getAnalytics(@Query('from') from: string, @Query('to') to: string) {
    return this.adminService.getAnalytics(
      from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to ? new Date(to) : new Date(),
    );
  }

  @Get('metrics/timeseries')
  getTimeSeriesMetrics(@Query('days') days?: string) {
    return this.adminService.getTimeSeriesMetrics(days ? +days : 30);
  }

  @Post('users/bulk-suspend')
  bulkSuspendUsers(@Body('userIds') userIds: string[]) {
    return this.adminService.bulkSuspendUsers(userIds);
  }

  @Post('users/bulk-activate')
  bulkActivateUsers(@Body('userIds') userIds: string[]) {
    return this.adminService.bulkActivateUsers(userIds);
  }

  @Get('users/:id/login-history')
  getUserLoginHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.adminService.getUserLoginHistory(id, limit ? +limit : 50);
  }

  @Get('occupancy')
  getOccupancyStats() {
    return this.adminService.getOccupancyStats();
  }

  @Get('analytics/women-occupancy')
  getWomenOnlyOccupancyStats() {
    return this.adminService.getWomenOnlyOccupancyStats();
  }

  @Get('travel-analytics')
  getTravelAnalytics() {
    return this.adminService.getTravelAnalytics();
  }

  @Get('suspicious')
  getSuspiciousUsers() {
    return this.adminService.getSuspiciousUsers();
  }

  @Get('config/suspicious-rules')
  getSuspiciousRulesConfig() {
    return this.adminService.getSuspiciousRulesConfig();
  }

  @Post('config/suspicious-rules')
  setSuspiciousRulesConfig(@Body() body: Record<string, number>) {
    return this.adminService.setSuspiciousRulesConfig(body);
  }

  @Post('users/bulk-email')
  bulkEmailUsers(
    @Body('userIds') userIds: string[],
    @Body('subject') subject: string,
    @Body('body') body: string,
  ) {
    return this.adminService.bulkEmailUsers(userIds, subject, body);
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

  @Get('users/:id/saved-locations')
  getUserSavedLocations(@Param('id') id: string) {
    return this.adminService.getUserSavedLocations(id);
  }

  @Get('users/export/csv')
  async exportUsersCsv(@Res() res: Response) {
    const csv = await this.adminService.exportUserscsv();
    const filename = `techieride-users-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── Pending Registrations (new signup flow) ─────────────────────────

  @Get('pending-registrations')
  listPendingRegistrations(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listPendingRegistrations(status, search);
  }

  @Get('pending-registrations/:id')
  getPendingRegistration(@Param('id') id: string) {
    return this.adminService.getPendingRegistration(id);
  }

  @Patch('pending-registrations/:id/review')
  reviewPendingRegistration(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ) {
    if (body.decision === 'APPROVED') {
      return this.registrationService.approveRegistration(id, adminId);
    }
    return this.registrationService.rejectRegistration(id, adminId, body.rejectionReason || 'No reason provided');
  }
}
