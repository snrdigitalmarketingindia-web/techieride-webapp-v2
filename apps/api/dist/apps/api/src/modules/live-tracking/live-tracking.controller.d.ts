import { LiveTrackingService } from './live-tracking.service';
export declare class LiveTrackingController {
    private service;
    constructor(service: LiveTrackingService);
    getPosition(rideId: string, userId: string): Promise<any>;
}
