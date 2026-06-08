"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const live_tracking_service_1 = require("./live-tracking.service");
const shared_1 = require("@techieride/shared");
let LiveTrackingGateway = class LiveTrackingGateway {
    constructor(trackingService, jwtService, config) {
        this.trackingService = trackingService;
        this.jwtService = jwtService;
        this.config = config;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
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
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
    }
    async handleJoinRide(data, client) {
        const canJoin = await this.trackingService.canAccessRide(client.data.userId, data.rideId);
        if (!canJoin) {
            client.emit('error', { message: 'Unauthorized to join this ride room' });
            return;
        }
        client.join(`ride:${data.rideId}`);
        client.emit('joined', { rideId: data.rideId });
    }
    handleLeaveRide(data, client) {
        client.leave(`ride:${data.rideId}`);
    }
    async handleGpsUpdate(payload, client) {
        const isGiver = await this.trackingService.isRideGiver(client.data.userId, payload.rideId);
        if (!isGiver)
            return;
        const gpsData = { ...payload, timestamp: new Date().toISOString() };
        await this.trackingService.storeLocation(payload.rideId, gpsData);
        this.server
            .to(`ride:${payload.rideId}`)
            .emit(shared_1.WsEvents.GPS_UPDATE, gpsData);
    }
    broadcastRideStatus(rideId, status) {
        this.server
            .to(`ride:${rideId}`)
            .emit(shared_1.WsEvents.RIDE_STATUS, { rideId, status });
    }
    broadcastNotification(userId, notification) {
        this.server.to(`user:${userId}`).emit(shared_1.WsEvents.NOTIFICATION_NEW, notification);
    }
    broadcastSos(sosEvent) {
        this.server.to('admin').emit(shared_1.WsEvents.SOS_ALERT, sosEvent);
    }
};
exports.LiveTrackingGateway = LiveTrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LiveTrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_1.WsEvents.JOIN_RIDE),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], LiveTrackingGateway.prototype, "handleJoinRide", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_1.WsEvents.LEAVE_RIDE),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LiveTrackingGateway.prototype, "handleLeaveRide", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_1.WsEvents.GPS_UPDATE),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], LiveTrackingGateway.prototype, "handleGpsUpdate", null);
exports.LiveTrackingGateway = LiveTrackingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/',
    }),
    __metadata("design:paramtypes", [live_tracking_service_1.LiveTrackingService,
        jwt_1.JwtService,
        config_1.ConfigService])
], LiveTrackingGateway);
//# sourceMappingURL=live-tracking.gateway.js.map