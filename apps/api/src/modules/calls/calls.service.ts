import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async logCall(callerId: string, receiverId: string, rideId?: string) {
    // Fire-and-forget — never throws, analytics only
    try {
      const entry = await this.prisma.callLog.create({
        data: { callerId, receiverId, rideId: rideId || null, event: 'USER_CALL_INITIATED' },
      });
      await this.auditLog.log(callerId, 'CALL_INITIATED', 'call', entry.id, { receiverId, rideId });
    } catch {
      // Silently swallow errors — call logging must never block the user
    }
  }
}
