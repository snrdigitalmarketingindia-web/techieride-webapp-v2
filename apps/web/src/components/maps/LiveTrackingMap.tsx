'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { connectSocket, joinRideRoom, leaveRideRoom, sendGpsUpdate, WsEvents } from '@/lib/socket';

const carIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

function MovingMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position]);
  if (!position) return null;
  return (
    <Marker position={position} icon={carIcon}>
      <Popup>🚗 Giver's current location</Popup>
    </Marker>
  );
}

interface Props {
  rideId: string;
  isGiver: boolean;
  initialLat?: number;
  initialLng?: number;
}

export default function LiveTrackingMap({ rideId, isGiver, initialLat = 17.44, initialLng = 78.35 }: Props) {
  const [giverPos, setGiverPos] = useState<[number, number] | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    joinRideRoom(rideId);

    socket.on(WsEvents.GPS_UPDATE, (payload: any) => {
      if (payload.rideId === rideId) {
        setGiverPos([payload.lat, payload.lng]);
      }
    });

    // If giver, start broadcasting location
    if (isGiver && 'geolocation' in navigator) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          sendGpsUpdate({
            rideId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || undefined,
          });
        },
        undefined,
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    return () => {
      leaveRideRoom(rideId);
      socket.off(WsEvents.GPS_UPDATE);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [rideId, isGiver]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[initialLat, initialLng]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MovingMarker position={giverPos} />
      </MapContainer>
      {!giverPos && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-500 text-sm">
          {isGiver ? 'Starting location broadcast...' : '⏳ Waiting for giver location...'}
        </div>
      )}
    </div>
  );
}
