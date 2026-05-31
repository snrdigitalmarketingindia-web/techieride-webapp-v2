import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LiveTrackingService } from './live-tracking.service';
import { GpsPayload } from '@techieride/shared';
export declare class LiveTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private trackingService;
    private jwtService;
    private config;
    server: Server;
    constructor(trackingService: LiveTrackingService, jwtService: JwtService, config: ConfigService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinRide(data: {
        rideId: string;
    }, client: Socket): Promise<void>;
    handleLeaveRide(data: {
        rideId: string;
    }, client: Socket): void;
    handleGpsUpdate(payload: GpsPayload, client: Socket): Promise<void>;
    broadcastRideStatus(rideId: string, status: string): void;
    broadcastNotification(userId: string, notification: any): void;
    broadcastSos(sosEvent: any): void;
}
