import { CallsService } from './calls.service';
declare class LogCallDto {
    receiverId: string;
    rideId?: string;
}
export declare class CallsController {
    private callsService;
    constructor(callsService: CallsService);
    logCall(callerId: string, dto: LogCallDto): {
        ok: boolean;
    };
}
export {};
