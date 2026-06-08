"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuditLogService = class AuditLogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(actor, action, entityType, entityId, metadata, actorType = 'USER') {
        try {
            await this.prisma.auditLog.create({
                data: { actor, actorType, action, entityType, entityId, metadata: metadata },
            });
        }
        catch {
        }
    }
    system(action, entityType, entityId, metadata) {
        return this.log('SYSTEM', action, entityType, entityId, metadata, 'SYSTEM');
    }
    async query(filters) {
        const { actor, actorType, action, entityType, entityId, from, to, page = 1, limit = 50 } = filters;
        const where = {};
        if (actor)
            where.actor = actor;
        if (actorType)
            where.actorType = actorType;
        if (action)
            where.action = action;
        if (entityType)
            where.entityType = entityType;
        if (entityId)
            where.entityId = entityId;
        if (from || to)
            where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
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
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map