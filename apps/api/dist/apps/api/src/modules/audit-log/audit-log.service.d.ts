import { PrismaService } from '../../prisma/prisma.service';
export type AuditActorType = 'USER' | 'SYSTEM' | 'ADMIN';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(actor: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>, actorType?: AuditActorType): Promise<void>;
    system(action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>): Promise<void>;
    query(filters: {
        actor?: string;
        actorType?: string;
        action?: string;
        entityType?: string;
        entityId?: string;
        from?: Date;
        to?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        total: number;
        page: number;
        limit: number;
        entries: {
            id: string;
            createdAt: Date;
            actor: string;
            actorType: string;
            action: string;
            entityType: string;
            entityId: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    }>;
}
