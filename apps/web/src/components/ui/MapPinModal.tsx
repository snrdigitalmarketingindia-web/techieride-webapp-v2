'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface MapLocation {
  lat: number;
  lng: number;
  address: string; // reverse-geocoded label from Nominatim (free, no key)
  alias: string;   // user-given name e.g. "Home", "Office"
}

interface MapPinModalProps {
  title: string;
  defaultAlias?: string;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (loc: MapLocation) => void;
  onClose: () => void;
}

// Hyderabad centre
const HYD_LAT = 17.4065;
const HYD_LNG = 78.4772;

export function MapPinModal({
  title,
  defaultAlias = '',
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: MapPinModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRef    = useRef<any>(null);

  const [pinLat,    setPinLat]    = useState<number | null>(initialLat ?? null);
  const [pinLng,    setPinLng]    = useState<number | null>(initialLng ?? null);
  const [address,   setAddress]   = useState('');
  const [alias,     setAlias]     = useState(defaultAlias);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState('');

  // Free reverse geocode via OpenStreetMap Nominatim — no API key required
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setAddress(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  }, []);

  const placeMarker = useCallback((map: any, L: any, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        setPinLat(pos.lat);
        setPinLng(pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });
    }
    setPinLat(lat);
    setPinLng(lng);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  useEffect(() => {
    if (!mapContainer.current) return;
    let map: any;
    let L: any;

    (async () => {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css' as any);

      // Fix default marker icons broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const startLat = initialLat ?? HYD_LAT;
      const startLng = initialLng ?? HYD_LNG;

      map = L.map(mapContainer.current!, { zoomControl: true }).setView(
        [startLat, startLng],
        initialLat ? 15 : 12,
      );

      // OpenStreetMap tiles — free, no key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      if (initialLat && initialLng) {
        placeMarker(map, L, initialLat, initialLng);
      }

      map.on('click', (e: any) => {
        placeMarker(map, L, e.latlng.lat, e.latlng.lng);
      });
    })();

    return () => { map?.remove(); markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const useGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.setView([lat, lng], 16);
        const L = (await import('leaflet')).default;
        placeMarker(mapRef.current, L, lat, lng);
      },
      () => setError('Could not get your location'),
    );
  };

  const handleConfirm = () => {
    if (!pinLat || !pinLng) { setError('Please tap on the map to place a pin'); return; }
    if (!alias.trim())      { setError('Please give this location a name (e.g. Home, Office)'); return; }
    onConfirm({ lat: pinLat, lng: pinLng, address, alias: alias.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">←</button>
        <h2 className="text-base font-semibold text-gray-900 flex-1">{title}</h2>
        <button
          onClick={useGPS}
          className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition"
        >
          📍 Use my location
        </button>
      </div>

      {/* Map — fills available space */}
      <div ref={mapContainer} className="flex-1 w-full" style={{ minHeight: 0 }} />

      {/* Bottom panel */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 space-y-3 shrink-0">
        <p className="text-xs text-gray-500 text-center">Tap anywhere on the map to place your pin · drag pin to adjust</p>

        {pinLat && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">📍 Pinned location</p>
            <p className="text-sm text-gray-800 font-medium line-clamp-2">
              {geocoding ? 'Looking up address…' : address || `${pinLat.toFixed(5)}, ${pinLng?.toFixed(5)}`}
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Alias / Name <span className="text-gray-400 font-normal">(e.g. Home, Office, Mom&apos;s house)</span>
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Give this location a name…"
            maxLength={40}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={!pinLat || geocoding}
          className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✅ Confirm Location
        </button>
      </div>
    </div>
  );
}
