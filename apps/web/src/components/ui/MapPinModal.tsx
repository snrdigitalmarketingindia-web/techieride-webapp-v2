'use client';

/**
 * MapPinModal
 *
 * Full-screen modal for pinning a location on an Ola Maps vector-tile map
 * (MapLibre GL JS). Reverse-geocoding is handled by the Ola Maps Places API.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { OLA_STYLE_URL, reverseGeocode as olaReverseGeocode } from '@/lib/olamaps';

export interface MapLocation {
  lat: number;
  lng: number;
  address: string;
  alias: string;
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
  const mlRef        = useRef<any>(null); // maplibre-gl module ref

  const [pinLat,    setPinLat]    = useState<number | null>(initialLat ?? null);
  const [pinLng,    setPinLng]    = useState<number | null>(initialLng ?? null);
  const [address,   setAddress]   = useState('');
  const [alias,     setAlias]     = useState(defaultAlias);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState('');

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    const addr = await olaReverseGeocode(lat, lng);
    setAddress(addr);
    setGeocoding(false);
  }, []);

  const placeMarker = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current;
      const maplibregl = mlRef.current;
      if (!map || !maplibregl) return;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: '#7c3aed', draggable: true })
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
    },
    [reverseGeocode],
  );

  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !mapContainer.current) return;

      mlRef.current = maplibregl;

      const startLat = initialLat ?? HYD_LAT;
      const startLng = initialLng ?? HYD_LNG;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: OLA_STYLE_URL,
        center: [startLng, startLat],
        zoom: initialLat ? 15 : 12,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      );

      mapRef.current = map;

      if (initialLat && initialLng) {
        map.on('load', () => placeMarker(initialLat, initialLng));
      }

      map.on('click', (e: any) => {
        placeMarker(e.lngLat.lat, e.lngLat.lng);
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current  = null;
      markerRef.current = null;
      mlRef.current   = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const useGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.setCenter([lng, lat]);
        mapRef.current?.setZoom(16);
        placeMarker(lat, lng);
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
        <p className="text-xs text-gray-500 text-center">
          Tap anywhere on the map to place your pin · drag pin to adjust
        </p>

        {pinLat && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">📍 Pinned location</p>
            <p className="text-sm text-gray-800 font-medium line-clamp-2">
              {geocoding
                ? 'Looking up address…'
                : address || `${pinLat.toFixed(5)}, ${pinLng?.toFixed(5)}`}
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
