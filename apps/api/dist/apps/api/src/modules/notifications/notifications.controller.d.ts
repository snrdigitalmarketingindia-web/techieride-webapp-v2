import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private service;
    constructor(service: NotificationsService);
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
    markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
}
