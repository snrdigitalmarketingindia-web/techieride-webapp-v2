import { QuickMessagesService } from './quick-messages.service';
declare class SendQuickMessageDto {
    messageKey: string;
}
export declare class QuickMessagesController {
    private service;
    constructor(service: QuickMessagesService);
    getOptions(): {
        key: string;
        text: string;
        role: "giver" | "seeker" | "both";
    }[];
    send(userId: string, rideId: string, dto: SendQuickMessageDto): Promise<{
        sent: boolean;
        message: string;
    }>;
}
export {};
