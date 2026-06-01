'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

const pinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Props {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

// Inner component — handles map click events
function MapClickHandler({
  onPin,
}: {
  onPin: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({ initialLat, initialLng, onLocationSelect }: Props) {
  const defaultLat = initialLat ?? 17.4401;
  const defaultLng = initialLng ?? 78.3489;

  const [pinned, setPinned] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Reverse geocode when pin is set
  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    setAddress('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      // Build a short readable address
      const parts = [
        data.address?.road || data.address?.neighbourhood,
        data.address?.suburb || data.address?.village,
        data.address?.city || data.address?.town,
      ].filter(Boolean);
      setAddress(parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = (lat: number, lng: number) => {
    setPinned({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleUseLocation = () => {
    if (!pinned) return;
    onLocationSelect(pinned.lat, pinned.lng, address);
  };

  return (
    <div className="space-y-2">
      {/* Instruction */}
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        👆 Tap anywhere on the map to drop your boarding pin
      </p>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 260 }}>
        <MapContainer
          center={[defaultLat, defaultLng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickHandler onPin={handlePin} />
          {pinned && (
            <Marker
              position={[pinned.lat, pinned.lng]}
              icon={pinIcon}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  handlePin(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Pinned location info + confirm button */}
      {pinned && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-brand-600 mt-0.5">📍</span>
            <div className="flex-1 min-w-0">
              {loading ? (
                <p className="text-sm text-brand-600 animate-pulse">Getting address...</p>
              ) : (
                <p className="text-sm text-brand-800 font-medium break-words">{address}</p>
              )}
              <p className="text-xs text-brand-500 mt-0.5">
                {pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)} · Drag pin to adjust
              </p>
            </div>
          </div>
          <button
            onClick={handleUseLocation}
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            ✅ Use this location
          </button>
        </div>
      )}

      {!pinned && (
        <p className="text-center text-xs text-gray-400 py-1">No location pinned yet</p>
      )}
    </div>
  );
}
