import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
export declare class CallsService {
    private prisma;
    private auditLog;
    constructor(prisma: PrismaService, auditLog: AuditLogService);
    logCall(callerId: string, receiverId: string, rideId?: string): Promise<void>;
}
