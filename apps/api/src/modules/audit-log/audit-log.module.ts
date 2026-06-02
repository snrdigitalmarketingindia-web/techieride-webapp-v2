import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [AuditLogService, PrismaService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
