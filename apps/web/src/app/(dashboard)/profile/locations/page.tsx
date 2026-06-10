'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth.store';
import { savedLocationsApi, usersApi } from '@/lib/api';
import OlaPlacesAutocomplete from '@/components/ui/OlaPlacesAutocomplete';

const MapPinModal = dynamic(
  () => import('@/components/ui/MapPinModal').then(m => m.MapPinModal),
  { ssr: false },
);

interface SavedLoc {
  id: string;
  alias: string;
  lat: number;
  lng: number;
  address: string;
  isFavorite: boolean;
  sourceType: string;
  usageCount: number;
  lastUsedAt: string | null;
}

type AddMethod = 'search' | 'pin';
type ModalMode = 'add' | 'edit';

export default function LocationManagementPage() {
  const { user, fetchProfile, fetchSavedLocations, invalidateSavedLocations } = useAuthStore();

  // ── Home / Office state ────────────────────────────────────────────────────
  const [homeModal,   setHomeModal]   = useState(false);
  const [officeModal, setOfficeModal] = useState(false);
  const [savingHome,  setSavingHome]  = useState(false);
  const [savingOff,   setSavingOff]   = useState(false);

  // ── Saved locations state ─────────────────────────────────────────────────
  const [locs,        setLocs]        = useState<SavedLoc[]>([]);
  const [locsLoading, setLocsLoading] = useState(true);

  // Add / edit modal
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [addMethod,     setAddMethod]     = useState<AddMethod>('search');
  const [modalMode,     setModalMode]     = useState<ModalMode>('add');
  const [editingLoc,    setEditingLoc]    = useState<SavedLoc | null>(null);

  // Form state for add/edit
  const [formAlias,     setFormAlias]     = useState('');
  const [formLat,       setFormLat]       = useState<number | null>(null);
  const [formLng,       setFormLng]       = useState<number | null>(null);
  const [formAddress,   setFormAddress]   = useState('');
  const [formSource,    setFormSource]    = useState<'SEARCH' | 'PIN'>('SEARCH');
  const [formSaving,    setFormSaving]    = useState(false);
  const [formError,     setFormError]     = useState('');
  const [searchText,    setSearchText]    = useState('');

  // Pin modal inside add/edit
  const [showPinInModal, setShowPinInModal] = useState(false);

  // Inline rename
  const [renamingId,    setRenamingId]    = useState<string | null>(null);
  const [renameAlias,   setRenameAlias]   = useState('');
  const [renameSaving,  setRenameSaving]  = useState(false);

  // ── Load saved locations ──────────────────────────────────────────────────
  useEffect(() => {
    savedLocationsApi.getMine()
      .then(r => setLocs(r.data ?? []))
      .catch(() => {})
      .finally(() => setLocsLoading(false));
  }, []);

  // ── Home/Office handlers ──────────────────────────────────────────────────
  const saveHome = async (loc: any) => {
    setSavingHome(true);
    try {
      await usersApi.updateProfile({
        homeLocation: loc.alias || loc.address?.split(',')[0] || 'Home',
        homeLat:      loc.lat,
        homeLng:      loc.lng,
        homeAddress:  loc.address,
      });
      await fetchProfile();
    } catch { /* silent */ }
    setSavingHome(false);
    setHomeModal(false);
  };

  const saveOffice = async (loc: any) => {
    setSavingOff(true);
    try {
      await usersApi.updateProfile({
        officeLocation: loc.alias || loc.address?.split(',')[0] || 'Office',
        officeLat:      loc.lat,
        officeLng:      loc.lng,
        officeAddress:  loc.address,
      });
      await fetchProfile();
    } catch { /* silent */ }
    setSavingOff(false);
    setOfficeModal(false);
  };

  // ── Open add modal ────────────────────────────────────────────────────────
  const openAdd = () => {
    setModalMode('add');
    setEditingLoc(null);
    setFormAlias('');
    setFormLat(null);
    setFormLng(null);
    setFormAddress('');
    setFormSource('SEARCH');
    setFormError('');
    setAddMethod('search');
    setShowAddModal(true);
  };

  const openEdit = (loc: SavedLoc) => {
    setModalMode('edit');
    setEditingLoc(loc);
    setFormAlias(loc.alias);
    setFormLat(loc.lat);
    setFormLng(loc.lng);
    setFormAddress(loc.address);
    setFormSource(loc.sourceType as 'SEARCH' | 'PIN');
    setFormError('');
    setAddMethod('search');
    setShowAddModal(true);
  };

  // ── Save add/edit ─────────────────────────────────────────────────────────
  const handleFormSave = async () => {
    if (!formAlias.trim()) { setFormError('Name is required'); return; }
    if (formLat === null || formLng === null) { setFormError('Please select a location'); return; }
    setFormSaving(true);
    setFormError('');
    try {
      if (modalMode === 'add') {
        const res = await savedLocationsApi.create({
          alias:      formAlias.trim(),
          lat:        formLat,
          lng:        formLng,
          address:    formAddress,
          isFavorite: false,
          sourceType: formSource,
        });
        setLocs(prev => [res.data, ...prev]);
      } else if (editingLoc) {
        const res = await savedLocationsApi.update(editingLoc.id, {
          alias:     formAlias.trim(),
          lat:       formLat,
          lng:       formLng,
          address:   formAddress,
          sourceType: formSource,
        });
        setLocs(prev => prev.map(l => l.id === editingLoc.id ? res.data : l));
      }
      invalidateSavedLocations();
      setShowAddModal(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to save location');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Favorite toggle ────────────────────────────────────────────────────────
  const toggleFav = async (loc: SavedLoc) => {
    try {
      const res = await savedLocationsApi.toggleFavorite(loc.id);
      setLocs(prev => prev.map(l => l.id === loc.id ? { ...l, isFavorite: res.data.isFavorite } : l));
      invalidateSavedLocations();
    } catch { /* silent */ }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteLoc = async (id: string) => {
    try {
      await savedLocationsApi.remove(id);
      setLocs(prev => prev.filter(l => l.id !== id));
      invalidateSavedLocations();
    } catch { /* silent */ }
  };

  // ── Inline rename ─────────────────────────────────────────────────────────
  const saveRename = async (id: string) => {
    if (!renameAlias.trim()) return;
    setRenameSaving(true);
    try {
      const res = await savedLocationsApi.update(id, { alias: renameAlias.trim() });
      setLocs(prev => prev.map(l => l.id === id ? { ...l, alias: res.data.alias } : l));
      invalidateSavedLocations();
    } catch { /* silent */ }
    setRenameSaving(false);
    setRenamingId(null);
  };

  // ── Sorted locs: favorites → recently used → rest ────────────────────────
  const sortedLocs = [
    ...locs.filter(l => l.isFavorite),
    ...locs.filter(l => !l.isFavorite && l.lastUsedAt).sort((a, b) =>
      new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime()),
    ...locs.filter(l => !l.isFavorite && !l.lastUsedAt),
  ];

  const homeSet   = !!(user as any)?.homeLat;
  const officeSet = !!(user as any)?.officeLat;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <Link href="/profile" className="text-gray-500 hover:text-gray-700 text-xl">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Location Management</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ── Home Location ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏠</span>
              <span className="font-semibold text-gray-800">Home Location</span>
            </div>
            <button
              onClick={() => setHomeModal(true)}
              className="text-xs text-brand-600 font-medium hover:underline"
            >
              {homeSet ? '📍 Update Pin' : '+ Set Location'}
            </button>
          </div>
          <div className="px-4 py-3">
            {homeSet ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{(user as any).homeLocation ?? 'Home'}</p>
                {(user as any).homeAddress && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{(user as any).homeAddress}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {(user as any).homeLat?.toFixed(5)}, {(user as any).homeLng?.toFixed(5)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not set — tap "+ Set Location" to pin your home</p>
            )}
          </div>
        </section>

        {/* ── Office Location ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <span className="font-semibold text-gray-800">Office Location</span>
            </div>
            <button
              onClick={() => setOfficeModal(true)}
              className="text-xs text-brand-600 font-medium hover:underline"
            >
              {officeSet ? '📍 Update Pin' : '+ Set Location'}
            </button>
          </div>
          <div className="px-4 py-3">
            {officeSet ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{(user as any).officeLocation ?? 'Office'}</p>
                {(user as any).officeAddress && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{(user as any).officeAddress}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {(user as any).officeLat?.toFixed(5)}, {(user as any).officeLng?.toFixed(5)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not set — tap "+ Set Location" to pin your office</p>
            )}
          </div>
        </section>

        {/* ── Saved Locations ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📍</span>
              <span className="font-semibold text-gray-800">Saved Locations</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {locs.length}/30
              </span>
            </div>
            {locs.length < 30 && (
              <button
                onClick={openAdd}
                className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium"
              >
                + Add
              </button>
            )}
          </div>

          {locsLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
          ) : sortedLocs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 text-sm">No saved locations yet</p>
              <p className="text-gray-300 text-xs mt-1">Add up to 30 locations for quick reuse</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sortedLocs.map(loc => (
                <li key={loc.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Favorite star */}
                  <button
                    onClick={() => toggleFav(loc)}
                    className={`mt-0.5 text-lg shrink-0 transition-transform active:scale-110 ${loc.isFavorite ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                    title={loc.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                  >★</button>

                  {/* Location info */}
                  <div className="flex-1 min-w-0">
                    {renamingId === loc.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={renameAlias}
                          onChange={e => setRenameAlias(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(loc.id); if (e.key === 'Escape') setRenamingId(null); }}
                          className="flex-1 text-sm px-2 py-1 border border-brand-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                        <button onClick={() => saveRename(loc.id)} disabled={renameSaving}
                          className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg disabled:opacity-50">
                          {renameSaving ? '…' : '✓'}
                        </button>
                        <button onClick={() => setRenamingId(null)} className="text-xs text-gray-400 px-1">✕</button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-800 truncate">{loc.alias}</p>
                    )}
                    {loc.address && <p className="text-xs text-gray-400 truncate mt-0.5">{loc.address}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-300">
                        {loc.sourceType === 'PIN' ? '📍 Pinned' : '🔍 Search'}
                      </span>
                      {loc.lastUsedAt && (
                        <span className="text-[10px] text-gray-300">
                          · Used {new Date(loc.lastUsedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setRenamingId(loc.id); setRenameAlias(loc.alias); }}
                      className="text-gray-300 hover:text-brand-500 p-1 rounded text-sm"
                      title="Rename"
                    >✏️</button>
                    <button
                      onClick={() => openEdit(loc)}
                      className="text-gray-300 hover:text-blue-500 p-1 rounded text-sm"
                      title="Edit location"
                    >🗺️</button>
                    <button
                      onClick={() => deleteLoc(loc.id)}
                      className="text-gray-300 hover:text-red-500 p-1 rounded text-sm"
                      title="Delete"
                    >🗑</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Info note */}
        <p className="text-xs text-center text-gray-400">
          Home and Office locations are stored in your profile and don't count toward the 30-location limit.
        </p>
      </div>

      {/* ── Home pin modal ──────────────────────────────────────────────── */}
      {homeModal && (
        <MapPinModal
          title="Pin your Home location"
          defaultAlias="Home"
          initialLat={(user as any)?.homeLat ?? undefined}
          initialLng={(user as any)?.homeLng ?? undefined}
          onConfirm={loc => saveHome(loc)}
          onClose={() => setHomeModal(false)}
        />
      )}
      {savingHome && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-6 text-sm text-gray-700">Saving home location…</div>
        </div>
      )}

      {/* ── Office pin modal ────────────────────────────────────────────── */}
      {officeModal && (
        <MapPinModal
          title="Pin your Office location"
          defaultAlias="Office"
          initialLat={(user as any)?.officeLat ?? undefined}
          initialLng={(user as any)?.officeLng ?? undefined}
          onConfirm={loc => saveOffice(loc)}
          onClose={() => setOfficeModal(false)}
        />
      )}
      {savingOff && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-6 text-sm text-gray-700">Saving office location…</div>
        </div>
      )}

      {/* ── Add / Edit saved location modal ────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40 sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {modalMode === 'add' ? 'Add Location' : 'Edit Location'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>

            {/* Method tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setAddMethod('search')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${addMethod === 'search' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >🔍 Search</button>
              <button
                onClick={() => setAddMethod('pin')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${addMethod === 'pin' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >📍 Drop Pin</button>
            </div>

            {/* Search method */}
            {addMethod === 'search' && (
              <OlaPlacesAutocomplete
                value={searchText}
                onChange={setSearchText}
                placeholder="Search for a place…"
                onSelect={(address, lat, lng) => {
                  setFormLat(lat ?? null);
                  setFormLng(lng ?? null);
                  setFormAddress(address);
                  setSearchText(address);
                  setFormSource('SEARCH');
                  if (!formAlias) setFormAlias(address.split(',')[0]);
                }}
              />
            )}

            {/* Pin method */}
            {addMethod === 'pin' && (
              <button
                onClick={() => setShowPinInModal(true)}
                className="w-full py-3 border-2 border-dashed border-brand-300 rounded-xl text-sm text-brand-600 font-medium hover:bg-brand-50 transition"
              >
                {formLat !== null ? `📍 ${formAddress || `${formLat?.toFixed(4)}, ${formLng?.toFixed(4)}`}` : '📍 Open map to drop a pin'}
              </button>
            )}

            {/* Selected location confirmation */}
            {formLat !== null && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 text-xs text-brand-700">
                📍 {formAddress || `${formLat.toFixed(5)}, ${formLng?.toFixed(5)}`}
              </div>
            )}

            {/* Alias input */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name <span className="text-red-500">*</span></label>
              <input
                value={formAlias}
                onChange={e => setFormAlias(e.target.value)}
                placeholder="e.g. Gym, Parents' Home, Client Office"
                maxLength={60}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <button
              onClick={handleFormSave}
              disabled={formSaving}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {formSaving ? 'Saving…' : modalMode === 'add' ? 'Save Location' : 'Update Location'}
            </button>
          </div>
        </div>
      )}

      {/* Pin modal inside add/edit */}
      {showPinInModal && (
        <MapPinModal
          title="Drop a pin"
          initialLat={formLat ?? undefined}
          initialLng={formLng ?? undefined}
          onConfirm={loc => {
            setFormLat(loc.lat);
            setFormLng(loc.lng);
            setFormAddress(loc.address);
            setFormSource('PIN');
            if (!formAlias) setFormAlias(loc.alias || loc.address.split(',')[0]);
            setShowPinInModal(false);
          }}
          onClose={() => setShowPinInModal(false)}
        />
      )}
    </div>
  );
}
