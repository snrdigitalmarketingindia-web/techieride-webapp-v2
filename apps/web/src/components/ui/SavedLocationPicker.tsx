'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { savedLocationsApi } from '@/lib/api';

const MapPinModal = dynamic(
  () => import('./MapPinModal').then((m) => m.MapPinModal),
  { ssr: false },
);

export interface PickedLocation {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

interface SavedLocation {
  id: string;
  alias: string;
  lat: number;
  lng: number;
  address: string;
  isFavorite?: boolean;
  sourceType?: string;
  lastUsedAt?: string | null;
}

interface Props {
  label: string;
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  mapTitle: string;
  placeholder?: string;
  required?: boolean;
}

const MAX = 30;

// Parse Google Maps URL → { lat, lng } or null
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    const qMatch  = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (qMatch)  return { lat: parseFloat(qMatch[1]),  lng: parseFloat(qMatch[2]) };
    const atMatch = url.match(/@([-\d.]+),([-\d.]+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const mapsQ   = url.match(/maps\?q=([-\d.]+),([-\d.]+)/);
    if (mapsQ)   return { lat: parseFloat(mapsQ[1]),   lng: parseFloat(mapsQ[2]) };
    const plain   = url.trim().match(/^([-\d.]+),\s*([-\d.]+)$/);
    if (plain)   return { lat: parseFloat(plain[1]),   lng: parseFloat(plain[2]) };
  } catch {}
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function SavedLocationPicker({ label, value, onChange, mapTitle, placeholder, required }: Props) {
  const [savedLocs, setSavedLocs]         = useState<SavedLocation[]>([]);
  const [open, setOpen]                   = useState(false);
  const [showMap, setShowMap]             = useState(false);
  const [editMapId, setEditMapId]         = useState<string | null>(null); // re-pin for existing
  const [showPaste, setShowPaste]         = useState(false);
  const [pasteUrl, setPasteUrl]           = useState('');
  const [pasteError, setPasteError]       = useState('');
  const [geocoding, setGeocoding]         = useState(false);

  // Inline edit (rename alias)
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editAlias, setEditAlias]         = useState('');
  const [editSaving, setEditSaving]       = useState(false);

  // Save-after-pin
  const [pendingLoc, setPendingLoc]       = useState<PickedLocation | null>(null);
  const [saveAlias, setSaveAlias]         = useState('');
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    savedLocationsApi.getMine()
      .then((res: any) => setSavedLocs(res.data ?? res ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectSaved = (loc: SavedLocation) => {
    onChange({ name: loc.alias, lat: loc.lat, lng: loc.lng, address: loc.address });
    setOpen(false);
    // Fire-and-forget usage tracking
    savedLocationsApi.recordUsage(loc.id).catch(() => {});
    // Update local state optimistically
    setSavedLocs(prev => prev.map(l =>
      l.id === loc.id ? { ...l, lastUsedAt: new Date().toISOString() } : l,
    ));
  };

  const deleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await savedLocationsApi.remove(id).catch(() => {});
    setSavedLocs((prev) => prev.filter((l) => l.id !== id));
  };

  const startEditAlias = (loc: SavedLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(loc.id);
    setEditAlias(loc.alias);
  };

  const saveEditAlias = async (id: string) => {
    if (!editAlias.trim()) return;
    setEditSaving(true);
    try {
      const res: any = await savedLocationsApi.update(id, { alias: editAlias.trim() });
      const updated  = res.data ?? res;
      setSavedLocs((prev) => prev.map((l) => l.id === id ? { ...l, alias: updated.alias } : l));
      // Update current value name if this location is selected
      if (value && value.lat === updated.lat && value.lng === updated.lng) {
        onChange({ ...value, name: updated.alias });
      }
    } catch {}
    setEditSaving(false);
    setEditingId(null);
  };

  // Re-pin an existing saved location (update its coordinates)
  const handleRepinConfirm = (loc: any) => {
    if (!editMapId) return;
    const address = loc.address ?? '';
    savedLocationsApi.update(editMapId, { lat: loc.lat, lng: loc.lng, address })
      .then((res: any) => {
        const updated = res.data ?? res;
        setSavedLocs((prev) => prev.map((l) => l.id === editMapId ? { ...l, lat: updated.lat, lng: updated.lng, address: updated.address } : l));
      })
      .catch(() => {});
    setEditMapId(null);
  };

  const handleMapConfirm = (loc: any) => {
    const picked: PickedLocation = { name: loc.alias || loc.address, lat: loc.lat, lng: loc.lng, address: loc.address };
    onChange(picked);
    setShowMap(false);
    setOpen(false);
    setPendingLoc(picked);
    setSaveAlias(loc.alias || '');
    setSaveError('');
  };

  const handlePasteSubmit = async () => {
    setPasteError('');
    const coords = parseGoogleMapsUrl(pasteUrl);
    if (!coords) {
      setPasteError('Could not find coordinates. Paste a Google Maps link or "lat, lng".');
      return;
    }
    setGeocoding(true);
    const address = await reverseGeocode(coords.lat, coords.lng);
    setGeocoding(false);
    const picked: PickedLocation = { name: address.split(',')[0] ?? 'Pinned location', lat: coords.lat, lng: coords.lng, address };
    onChange(picked);
    setPasteUrl(''); setShowPaste(false); setOpen(false);
    setPendingLoc(picked);
    setSaveAlias(picked.name);
    setSaveError('');
  };

  const handleSaveAlias = async () => {
    if (!pendingLoc || !saveAlias.trim()) { setSaveError('Enter a name for this location'); return; }
    if (savedLocs.length >= MAX) { setSaveError(`You have reached the ${MAX}-location limit. Delete one first.`); return; }
    setSaving(true);
    try {
      const res: any = await savedLocationsApi.create({
        alias: saveAlias.trim(), lat: pendingLoc.lat, lng: pendingLoc.lng, address: pendingLoc.address ?? '',
      });
      const saved = res.data ?? res;
      setSavedLocs((prev) => [saved, ...prev]);
      onChange({ ...pendingLoc, name: saveAlias.trim() });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
      setPendingLoc(null);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Selected value */}
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border border-brand-300 rounded-lg bg-brand-50">
          <span className="text-sm flex-1 truncate text-gray-800">📍 {value.name}</span>
          <button type="button" onClick={() => setOpen(true)} className="text-xs text-brand-600 hover:underline shrink-0">Change</button>
          <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500 shrink-0 text-base leading-none">×</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); setShowPaste(false); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition text-left text-gray-400"
        >
          <span className="text-base">📍</span>
          {placeholder ?? 'Select or pin location'}
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div ref={dropdownRef} className="mt-1 border border-gray-200 rounded-xl bg-white shadow-lg z-30 relative overflow-hidden">

          {savedLocs.length > 0 && (() => {
            const favorites    = savedLocs.filter(l => l.isFavorite);
            const recentlyUsed = savedLocs.filter(l => !l.isFavorite && l.lastUsedAt)
              .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime());
            const rest         = savedLocs.filter(l => !l.isFavorite && !l.lastUsedAt);
            const ordered      = [...favorites, ...recentlyUsed, ...rest];
            return (
            <div className="max-h-56 overflow-y-auto">
              {favorites.length > 0 && <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 pt-2 pb-0.5">⭐ Favorites</p>}
              {recentlyUsed.length > 0 && favorites.length === 0 && <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 pt-2 pb-0.5">🕐 Recently Used</p>}
              {ordered.map((loc, idx) => {
                const showRecentHeader  = idx === favorites.length && recentlyUsed.length > 0 && favorites.length > 0;
                const showOtherHeader   = idx === favorites.length + recentlyUsed.length && rest.length > 0 && (favorites.length > 0 || recentlyUsed.length > 0);
                return (
              <div key={loc.id}>
                {showRecentHeader  && <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 pt-2 pb-0.5">🕐 Recently Used</p>}
                {showOtherHeader   && <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 pt-2 pb-0.5">📁 All Saved</p>}
                <div className="group">
                  {editingId === loc.id ? (
                    /* ── Inline rename ── */
                    <div className="flex items-center gap-1 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditAlias(loc.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="flex-1 text-xs px-2 py-1 border border-brand-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditAlias(loc.id)}
                        disabled={editSaving || !editAlias.trim()}
                        className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg disabled:opacity-50 shrink-0"
                      >{editSaving ? '…' : '✓'}</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-1">✕</button>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <button
                      type="button"
                      onClick={() => selectSaved(loc)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-brand-50 text-left"
                    >
                      <span className="text-base shrink-0">
                        {loc.isFavorite ? '⭐' : loc.sourceType === 'PIN' ? '📍' : '🔍'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{loc.alias}</p>
                        {loc.address && <p className="text-xs text-gray-400 truncate">{loc.address}</p>}
                      </div>
                      {/* Action icons */}
                      <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => startEditAlias(loc, e)}
                          className="text-gray-400 hover:text-brand-600 text-xs px-1 py-0.5 rounded"
                          title="Rename"
                        >✏️</button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditMapId(loc.id); setOpen(false); }}
                          className="text-gray-400 hover:text-blue-500 text-xs px-1 py-0.5 rounded"
                          title="Re-pin location on map"
                        >🗺️</button>
                        <button
                          type="button"
                          onClick={(e) => deleteSaved(loc.id, e)}
                          className="text-gray-400 hover:text-red-500 text-xs px-1 py-0.5 rounded"
                          title="Delete"
                        >🗑</button>
                      </div>
                    </button>
                  )}
                </div>
              </div>
              );
              })}
            </div>
            );
          })()}

          {savedLocs.length === 0 && (
            <p className="text-xs text-gray-400 px-3 pt-3 pb-1">No saved locations yet. Pin one below!</p>
          )}

          <div className="border-t border-gray-100 p-2 space-y-1">
            <button
              type="button"
              onClick={() => { setShowMap(true); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand-50 text-sm text-brand-700 font-medium"
            >🗺️ Pin on map</button>

            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
            >📋 Paste Google Maps link</button>

            {showPaste && (
              <div className="px-2 pb-1 space-y-1">
                <input
                  autoFocus
                  value={pasteUrl}
                  onChange={(e) => { setPasteUrl(e.target.value); setPasteError(''); }}
                  placeholder="Paste maps.google.com link or 17.44, 78.35"
                  className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasteSubmit()}
                />
                {pasteError && <p className="text-xs text-red-500">{pasteError}</p>}
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={!pasteUrl.trim() || geocoding}
                  className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >{geocoding ? 'Looking up…' : 'Use this location'}</button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            <span className="text-xs text-gray-300">{savedLocs.length}/{MAX} saved</span>
          </div>
        </div>
      )}

      {/* Save-after-pin prompt */}
      {pendingLoc && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl space-y-2">
          <p className="text-xs font-medium text-green-800">💾 Save this location for next time?</p>
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              value={saveAlias}
              onChange={(e) => { setSaveAlias(e.target.value); setSaveError(''); }}
              placeholder="e.g. Home, Gym, Office"
              className="flex-1 text-xs px-2.5 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAlias()}
            />
            <button type="button" onClick={handleSaveAlias} disabled={saving || !saveAlias.trim()}
              className="text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 shrink-0">
              {saving ? '…' : 'Save'}
            </button>
            <button type="button" onClick={() => setPendingLoc(null)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Skip</button>
          </div>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>
      )}

      {/* Pin on map (new location) */}
      {showMap && (
        <MapPinModal title={mapTitle} onConfirm={handleMapConfirm} onClose={() => setShowMap(false)} />
      )}

      {/* Re-pin existing saved location */}
      {editMapId && (
        <MapPinModal
          title="Update pin location"
          initialLat={savedLocs.find((l) => l.id === editMapId)?.lat}
          initialLng={savedLocs.find((l) => l.id === editMapId)?.lng}
          onConfirm={handleRepinConfirm}
          onClose={() => setEditMapId(null)}
        />
      )}
    </div>
  );
}
