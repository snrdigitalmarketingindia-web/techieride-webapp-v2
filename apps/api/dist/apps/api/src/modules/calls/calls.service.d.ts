import { PrismaService } from '../../prisma/prisma.service';
export declare class CallsService {
    private prisma;
    constructor(prisma: PrismaService);
    logCall(callerId: string, receiverId: string, rideId?: string): Promise<void>;
}
