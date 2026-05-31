'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

interface Props {
  rides: any[];
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export default function RideMap({ rides, originLat, originLng, destLat, destLng }: Props) {
  const center: [number, number] = [
    (originLat + destLat) / 2,
    (originLng + destLng) / 2,
  ];

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[originLat, originLng]} icon={originIcon}>
        <Popup>Your pickup</Popup>
      </Marker>
      <Marker position={[destLat, destLng]} icon={destIcon}>
        <Popup>Your destination</Popup>
      </Marker>
      {rides.map((ride) => (
        <Marker key={ride.id} position={[ride.originLat, ride.originLng]}>
          <Popup>
            <strong>{ride.rideGiver?.user?.fullName}</strong><br />
            {ride.departureTime} · {ride.availableSeats} seats<br />
            {ride.originName} → {ride.destinationName}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
