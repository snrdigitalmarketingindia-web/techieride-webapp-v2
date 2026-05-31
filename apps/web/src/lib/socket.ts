import { io, Socket } from 'socket.io-client';
import { WsEvents } from '@techieride/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    socket = io(WS_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinRideRoom(rideId: string) {
  const s = getSocket();
  s.emit(WsEvents.JOIN_RIDE, { rideId });
}

export function leaveRideRoom(rideId: string) {
  const s = getSocket();
  s.emit(WsEvents.LEAVE_RIDE, { rideId });
}

export function sendGpsUpdate(payload: { rideId: string; lat: number; lng: number; speed?: number }) {
  const s = getSocket();
  s.emit(WsEvents.GPS_UPDATE, { ...payload, timestamp: new Date().toISOString() });
}

export { WsEvents };
