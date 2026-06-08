'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface MapLocation {
  lat: number;
  lng: number;
  address: string; // reverse-geocoded label
  alias: string;   // user-given name e.g. "Home", "Office"
}

interface MapPinModalProps {
  title: string;            // e.g. "Set Home Location"
  defaultAlias?: string;    // pre-fill alias field
  initialLat?: number;
  initialLng?: number;
  onConfirm: (loc: MapLocation) => void;
  onClose: () => void;
}

// Hyderabad centre
const HYD_LAT = 17.4065;
const HYD_LNG = 78.4772;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function MapPinModal({
  title,
  defaultAlias = '',
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: MapPinModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [pinLat, setPinLat] = useState<number | null>(initialLat ?? null);
  const [pinLng, setPinLng] = useState<number | null>(initialLng ?? null);
  const [address, setAddress] = useState('');
  const [alias, setAlias] = useState(defaultAlias);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');

  // Reverse geocode via Mapbox Geocoding API (free tier)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!MAPBOX_TOKEN) { setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); return; }
    setGeocoding(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      const place = data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(place);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Place / move marker
  const placeMarker = useCallback((map: any, mapboxgl: any, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#7C3AED', draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLngLat();
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
    let mapboxgl: any;

    (async () => {
      // Dynamic import to avoid SSR crash
      mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css' as any);

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const startLat = initialLat ?? HYD_LAT;
      const startLng = initialLng ?? HYD_LNG;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [startLng, startLat],
        zoom: initialLat ? 15 : 12,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current = map;

      // If initial coords provided, place marker immediately
      if (initialLat && initialLng) {
        map.on('load', () => placeMarker(map, mapboxgl, initialLat, initialLng));
      }

      // Click on map to place / move pin
      map.on('click', (e: any) => {
        placeMarker(map, mapboxgl, e.lngLat.lat, e.lngLat.lng);
      });
    })();

    return () => { map?.remove(); markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS button
  const useGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
        placeMarker(mapRef.current, (window as any).mapboxgl, lat, lng);
      },
      () => setError('Could not get your location'),
    );
  };

  const handleConfirm = () => {
    if (!pinLat || !pinLng) { setError('Please tap on the map to place a pin'); return; }
    if (!alias.trim()) { setError('Please give this location a name (e.g. Home, Office)'); return; }
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

      {/* Map */}
      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Bottom panel */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 space-y-3 shrink-0">
        <p className="text-xs text-gray-500 text-center">Tap anywhere on the map to place your pin · drag pin to adjust</p>

        {pinLat && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">📍 Pinned location</p>
            <p className="text-sm text-gray-800 font-medium truncate">
              {geocoding ? 'Looking up address…' : address || `${pinLat.toFixed(5)}, ${pinLng?.toFixed(5)}`}
            </p>
          </div>
        )}

        {/* Alias name */}
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
