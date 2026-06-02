import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditActorType = 'USER' | 'SYSTEM' | 'ADMIN';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    actor: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
    actorType: AuditActorType = 'USER',
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { actor, actorType, action, entityType, entityId, metadata: metadata as any },
      });
    } catch {
      // Audit logging must never block the caller
    }
  }

  system(action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
    return this.log('SYSTEM', action, entityType, entityId, metadata, 'SYSTEM');
  }

  async query(filters: {
    actor?: string;
    actorType?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { actor, actorType, action, entityType, entityId, from, to, page = 1, limit = 50 } = filters;
    const where: any = {};
    if (actor)      where.actor = actor;
    if (actorType)  where.actorType = actorType;
    if (action)     where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId)   where.entityId = entityId;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, entries };
  }
}
