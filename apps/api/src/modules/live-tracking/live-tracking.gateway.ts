import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LiveTrackingService } from './live-tracking.service';
import { GpsPayload, WsEvents } from '@techieride/shared';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class LiveTrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private trackingService: LiveTrackingService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Client disconnected — no cleanup needed for stateless GPS updates
  }

  @SubscribeMessage(WsEvents.JOIN_RIDE)
  async handleJoinRide(
    @MessageBody() data: { rideId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const canJoin = await this.trackingService.canAccessRide(
      client.data.userId,
      data.rideId,
    );
    if (!canJoin) {
      client.emit('error', { message: 'Unauthorized to join this ride room' });
      return;
    }
    client.join(`ride:${data.rideId}`);
    client.emit('joined', { rideId: data.rideId });
  }

  @SubscribeMessage(WsEvents.LEAVE_RIDE)
  handleLeaveRide(
    @MessageBody() data: { rideId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`ride:${data.rideId}`);
  }

  @SubscribeMessage(WsEvents.GPS_UPDATE)
  async handleGpsUpdate(
    @MessageBody() payload: GpsPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const isGiver = await this.trackingService.isRideGiver(
      client.data.userId,
      payload.rideId,
    );
    if (!isGiver) return;

    const gpsData = { ...payload, timestamp: new Date().toISOString() };

    await this.trackingService.storeLocation(payload.rideId, gpsData);

    this.server
      .to(`ride:${payload.rideId}`)
      .emit(WsEvents.GPS_UPDATE, gpsData);
  }

  broadcastRideStatus(rideId: string, status: string) {
    this.server
      .to(`ride:${rideId}`)
      .emit(WsEvents.RIDE_STATUS, { rideId, status });
  }

  broadcastNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit(WsEvents.NOTIFICATION_NEW, notification);
  }

  broadcastSos(sosEvent: any) {
    this.server.to('admin').emit(WsEvents.SOS_ALERT, sosEvent);
  }
}
