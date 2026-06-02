import { SosService } from './sos.service';
declare class TriggerSosDto {
    rideId?: string;
    lat?: number;
    lng?: number;
}
export declare class SosController {
    private sosService;
    constructor(sosService: SosService);
    trigger(userId: string, dto: TriggerSosDto): Promise<{
        sosId: string;
        message: string;
    }>;
}
export {};
