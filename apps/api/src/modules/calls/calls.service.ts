import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async logCall(callerId: string, receiverId: string, rideId?: string) {
    // Fire-and-forget — never throws, analytics only
    try {
      await this.prisma.callLog.create({
        data: { callerId, receiverId, rideId: rideId || null, event: 'USER_CALL_INITIATED' },
      });
    } catch {
      // Silently swallow errors — call logging must never block the user
    }
  }
}
