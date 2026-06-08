import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@techieride/shared';
interface CreateNotificationInput {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, input: CreateNotificationInput): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        body: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    findAll(userId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        data: {
            id: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            body: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        unreadCount: number;
    }>;
    markRead(notificationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
}
export {};
