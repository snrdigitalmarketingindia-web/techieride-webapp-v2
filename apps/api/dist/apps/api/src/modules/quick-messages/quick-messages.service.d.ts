import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare const QUICK_MESSAGES: Record<string, {
    text: string;
    role: 'giver' | 'seeker' | 'both';
}>;
export declare class QuickMessagesService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    send(senderId: string, rideId: string, messageKey: string): Promise<{
        sent: boolean;
        message: string;
    }>;
}
