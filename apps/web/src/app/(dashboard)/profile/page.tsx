'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { vehiclesApi, verificationApi, api, usersApi } from '@/lib/api';
import { uploadDocument } from '@/lib/uploadDocument';
import { FEATURES } from '@/lib/featureFlags';
import { MapPinModal, type MapLocation } from '@/components/ui/MapPinModal';

// Returns a mismatch message or null if RC data matches vehicle form

const ECO_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  SEED:   { icon: '🌱', label: 'Seed',   color: 'bg-gray-100 text-gray-700' },
  SPROUT: { icon: '🌿', label: 'Sprout', color: 'bg-green-100 text-green-700' },
  LEAF:   { icon: '🍃', label: 'Leaf',   color: 'bg-emerald-100 text-emerald-700' },
  TREE:   { icon: '🌳', label: 'Tree',   color: 'bg-brand-100 text-brand-700' },
  FOREST: { icon: '🌲', label: 'Forest', color: 'bg-brand-600 text-white' },
};

interface UploadedDocs {
  employeeIdUrl?: string;
  drivingLicenseUrl?: string;
  rcUrl?: string;
}

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [verStatus, setVerStatus] = useState<any>(null);
  const [addVehicle, setAddVehicle] = useState(false);
  const [vForm, setVForm] = useState({ make: '', model: '', color: '', plateNumber: '', totalSeats: 4 });
  const [newVehicleRcUrl, setNewVehicleRcUrl] = useState<string | null>(null);
  const [vehicleRcUploading, setVehicleRcUploading] = useState(false);
  const [perVehicleRcUploading, setPerVehicleRcUploading] = useState<string | null>(null); // vehicleId
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs>({});
  const [minioAvailable, setMinioAvailable] = useState<boolean | null>(null);
  const [submitMsg, setSubmitMsg] = useState('');

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '', phone: '', companyName: '',
    homeLocation: '', homeLat: 0, homeLng: 0, homeAddress: '',
    officeLocation: '', officeLat: 0, officeLng: 0, officeAddress: '',
    bloodGroup: '', gender: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  // Map pin modal state
  const [mapModal, setMapModal] = useState<'home' | 'office' | null>(null);

  // Email change state (official)
  const [emailChangeMode, setEmailChangeMode] = useState(false);
  const [newOfficialEmail, setNewOfficialEmail] = useState('');
  const [emailChangeSending, setEmailChangeSending] = useState(false);
  const [emailChangeMsg, setEmailChangeMsg] = useState('');

  // Personal email change state
  const [personalEmailMode, setPersonalEmailMode] = useState(false);
  const [newPersonalEmail, setNewPersonalEmail] = useState('');
  const [personalEmailSending, setPersonalEmailSending] = useState(false);
  const [personalEmailMsg, setPersonalEmailMsg] = useState('');

  // Deep link from the ride-create nudge: /profile?edit=locations
  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit')) {
      openEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openEdit = () => {
    setEditForm({
      fullName:       user?.fullName                ?? '',
      phone:          (user as any)?.phone          ?? '',
      companyName:    user?.companyName             ?? '',
      homeLocation:   (user as any)?.homeLocation   ?? '',
      homeLat:        (user as any)?.homeLat        ?? 0,
      homeLng:        (user as any)?.homeLng        ?? 0,
      homeAddress:    (user as any)?.homeAddress    ?? '',
      officeLocation: (user as any)?.officeLocation ?? '',
      officeLat:      (user as any)?.officeLat      ?? 0,
      officeLng:      (user as any)?.officeLng      ?? 0,
      officeAddress:  (user as any)?.officeAddress  ?? '',
      bloodGroup:     ((user as any)?.bloodGroup ?? '').replace(/−/g, '-'),
      gender:         (user as any)?.gender         ?? '',
    });
    setEditMsg('');
    setEditing(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditMsg('');
    try {
      await usersApi.updateProfile(editForm);
      await fetchProfile();
      setEditing(false);
    } catch (e: any) {
      setEditMsg(e.response?.data?.message?.[0] ?? e.response?.data?.message ?? 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

  const sendOfficialEmailChange = async () => {
    setEmailChangeSending(true);
    setEmailChangeMsg('');
    try {
      await usersApi.requestEmailChange(newOfficialEmail);
      setEmailChangeMsg(`✅ Verification link sent to ${newOfficialEmail}. Check your inbox and click the link to confirm.`);
      setNewOfficialEmail('');
    } catch (e: any) {
      setEmailChangeMsg(e.response?.data?.message ?? 'Failed to send verification email');
    } finally {
      setEmailChangeSending(false);
    }
  };

  const sendPersonalEmailChange = async () => {
    setPersonalEmailSending(true);
    setPersonalEmailMsg('');
    try {
      await usersApi.requestPersonalEmailChange(newPersonalEmail);
      setPersonalEmailMsg(`✅ Confirmation link sent to ${newPersonalEmail}. Check your inbox.`);
      setNewPersonalEmail('');
    } catch (e: any) {
      setPersonalEmailMsg(e.response?.data?.message ?? 'Failed to send confirmation email');
    } finally {
      setPersonalEmailSending(false);
    }
  };

  useEffect(() => {
    vehiclesApi.getMine().then((r) => setVehicles(r.data));
    verificationApi.getStatus().then((r) => setVerStatus(r.data));
    // Check MinIO availability
    api.get('/uploads/status').then(r => setMinioAvailable(r.data.available)).catch(() => setMinioAvailable(false));
  }, []);

  const uploadFile = (file: File, docType: string): Promise<string> =>
    uploadDocument(file, docType);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(docType);
    try {
      const url = await uploadFile(file, docType);
      const keyMap: Record<string, keyof UploadedDocs> = {
        employee_id:      'employeeIdUrl',
        driving_license:  'drivingLicenseUrl',
        rc:               'rcUrl',
      };
      const key = keyMap[docType];
      if (key) setUploadedDocs(prev => ({ ...prev, [key]: url }));
    } catch {
      alert('Upload failed. Make sure MinIO is running.');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  // Identity docs are now submitted via /verify-identity — redirect there
  const submitVerification = () => { window.location.href = '/verify-identity'; };

  const submitVehicle = async () => {
    setLoading(true);
    try {
      const created = await vehiclesApi.create(vForm);
      const vehicleId = created.data?.id;
      if (vehicleId && newVehicleRcUrl) {
        await vehiclesApi.updateRc(vehicleId, newVehicleRcUrl, null);
      }
      const r = await vehiclesApi.getMine();
      setVehicles(r.data);
      setAddVehicle(false);
      setVForm({ make: '', model: '', color: '', plateNumber: '', totalSeats: 4 });
      setNewVehicleRcUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNewVehicleRcChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVehicleRcUploading(true);
    try {
      const url = await uploadFile(file, 'rc');
      setNewVehicleRcUrl(url);
    } catch {
      alert('RC upload failed. Make sure storage is available.');
    } finally {
      setVehicleRcUploading(false);
      e.target.value = '';
    }
  };

  const handlePerVehicleRcChange = async (e: React.ChangeEvent<HTMLInputElement>, vehicleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPerVehicleRcUploading(vehicleId);
    try {
      const url = await uploadFile(file, 'rc');
      await vehiclesApi.updateRc(vehicleId, url, null);
      const r = await vehiclesApi.getMine();
      setVehicles(r.data);
    } catch {
      alert('RC upload failed. Make sure storage is available.');
    } finally {
      setPerVehicleRcUploading(null);
      e.target.value = '';
    }
  };

  const eco = user?.ecoLevel ? ECO_BADGES[user.ecoLevel] : ECO_BADGES.SEED;
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';
  const isGiver = user?.role === 'RIDE_GIVER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
            {user?.fullName?.[0]}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{user?.fullName}{(user as any)?.trid ? ` [${(user as any).trid}]` : ''} <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium align-middle ${eco.color}`}>{eco.icon} {eco.label} · {user?.ecoPoints} pts</span></p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button onClick={openEdit}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shrink-0">
            ✏️ Edit
          </button>
        </div>

        {/* Home / Office — always visible so the feature is discoverable */}
        {!editing && (
          <div className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([['🏠 Home', (user as any)?.homeLocation || (user as any)?.homeAddress],
               ['🏢 Office', (user as any)?.officeLocation || (user as any)?.officeAddress]] as const).map(([label, value]) => (
              <button key={label} onClick={openEdit}
                className="flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition">
                <span className="text-xs text-gray-500 shrink-0">{label}</span>
                <span className={`text-xs truncate ${value ? 'text-gray-800 font-medium' : 'text-amber-600'}`}>
                  {value || 'Not set — add →'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Inline edit form */}
        {editing && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">Edit Profile</p>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
              {[
                { label: 'Full Name', key: 'fullName', type: 'text' },
                { label: 'Company',   key: 'companyName', type: 'text' },
              ].map(({ label, key, type }) => (
                <React.Fragment key={key}>
                  <label htmlFor={`edit-${key}`} className="text-xs text-gray-500 whitespace-nowrap">{label}</label>
                  <input
                    id={`edit-${key}`}
                    type={type}
                    value={(editForm as any)[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </React.Fragment>
              ))}
              <label htmlFor="edit-phone" className="text-xs text-gray-500 whitespace-nowrap">Phone</label>
              <div>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">🇮🇳 +91</span>
                  <input
                    id="edit-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                {editForm.phone.length > 0 && !/^[6-9]\d{9}$/.test(editForm.phone) && (
                  <p className="text-xs text-red-500 mt-1">Must be a 10-digit number starting with 6–9</p>
                )}
              </div>
              <label className="text-xs text-gray-500 whitespace-nowrap">🏠 Home</label>
              {FEATURES.MAPS_ENABLED ? (
              <button
                type="button"
                onClick={() => setMapModal('home')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition text-left"
              >
                <span className="text-base">📍</span>
                <span className={editForm.homeLat ? 'text-gray-800' : 'text-gray-400'}>
                  {editForm.homeLocation
                    ? `${editForm.homeLocation}${editForm.homeAddress ? ` — ${editForm.homeAddress.slice(0, 40)}…` : ''}`
                    : 'Tap to pin on map'}
                </span>
              </button>
              ) : (
              <input
                type="text"
                value={editForm.homeLocation || editForm.homeAddress || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, homeLocation: e.target.value, homeAddress: e.target.value }))}
                placeholder="e.g. Hayathnagar"
                maxLength={60}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              )}
              <label className="text-xs text-gray-500 whitespace-nowrap">🏢 Office</label>
              {FEATURES.MAPS_ENABLED ? (
              <button
                type="button"
                onClick={() => setMapModal('office')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition text-left"
              >
                <span className="text-base">📍</span>
                <span className={editForm.officeLat ? 'text-gray-800' : 'text-gray-400'}>
                  {editForm.officeLocation
                    ? `${editForm.officeLocation}${editForm.officeAddress ? ` — ${editForm.officeAddress.slice(0, 40)}…` : ''}`
                    : 'Tap to pin on map'}
                </span>
              </button>
              ) : (
              <input
                type="text"
                value={editForm.officeLocation || editForm.officeAddress || ''}
                onChange={(e) => setEditForm((f: any) => ({ ...f, officeLocation: e.target.value, officeAddress: e.target.value }))}
                placeholder="e.g. Hitec City"
                maxLength={60}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              )}
              <span className="text-xs text-gray-500">📁 Saved</span>
              <a href="/profile/locations" className="text-xs text-brand-600 hover:underline font-medium">Manage Locations →</a>
              <label htmlFor="bloodGroup" className="text-xs text-gray-500 whitespace-nowrap">Blood / Gender</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="bloodGroup"
                  value={editForm.bloodGroup}
                  onChange={(e) => setEditForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            {editMsg && <p className="text-xs text-red-600 mt-2">{editMsg}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Company</p>
            <p className="font-medium text-gray-900">{user?.companyName || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Account Status</p>
            <p className={`font-medium text-sm ${
              user?.accountStatus === 'DRIVER_VERIFIED' || user?.accountStatus === 'SEEKER_VERIFIED' ? 'text-green-600' :
              user?.accountStatus === 'REJECTED' ? 'text-red-600' :
              user?.accountStatus === 'SUSPENDED' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {user?.accountStatus === 'DRIVER_VERIFIED' ? '✅ Ride Giver Verified' :
               user?.accountStatus === 'SEEKER_VERIFIED' ? '✅ Ride Seeker Verified' :
               user?.accountStatus === 'DRIVER_VERIFICATION_PENDING' ? '⏳ Ride Giver Review' :
               user?.accountStatus === 'DOCUMENT_VERIFICATION_PENDING' ? '⏳ Identity Pending' :
               user?.accountStatus === 'EMAIL_VERIFICATION_PENDING' ? '📧 Email Unverified' :
               user?.accountStatus === 'PERSONAL_EMAIL_PENDING' ? '📬 Personal Email Pending' :
               user?.accountStatus === 'REJECTED' ? '❌ Rejected' :
               user?.accountStatus === 'SUSPENDED' ? '🚫 Suspended' : '⏳ Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Email Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Official Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900">Official Email</p>
              <button onClick={() => { setEmailChangeMode(!emailChangeMode); setEmailChangeMsg(''); }}
                className="text-xs text-brand-600 hover:underline">
                {emailChangeMode ? 'Cancel' : '✏️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          {/* Personal Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900">Personal Email</p>
              <button onClick={() => { setPersonalEmailMode(!personalEmailMode); setPersonalEmailMsg(''); }}
                className="text-xs text-brand-600 hover:underline">
                {personalEmailMode ? 'Cancel' : (user as any)?.personalEmail ? '✏️' : '+ Add'}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-xs text-gray-500 truncate">{(user as any)?.personalEmail || 'Not set'}</p>
              {(user as any)?.personalEmail && (
                (user as any)?.personalEmailVerified
                  ? <span className="text-[10px] text-green-600">✅</span>
                  : <span className="text-[10px] text-amber-600">⚠️</span>
              )}
            </div>
          </div>
        </div>
        {emailChangeMode && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 pt-2">Enter your new corporate email. A verification link will be sent there.</p>
            <input type="email" value={newOfficialEmail} onChange={(e) => setNewOfficialEmail(e.target.value)}
              placeholder="new@company.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            {emailChangeMsg && (
              <p className={`text-xs ${emailChangeMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{emailChangeMsg}</p>
            )}
            <button onClick={sendOfficialEmailChange} disabled={emailChangeSending || !newOfficialEmail.trim()}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {emailChangeSending ? 'Sending…' : 'Send Verification Email'}
            </button>
          </div>
        )}
        {personalEmailMode && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 pt-2">A confirmation link will be sent to this address before it's saved.</p>
            <input type="email" value={newPersonalEmail} onChange={(e) => setNewPersonalEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            {personalEmailMsg && (
              <p className={`text-xs ${personalEmailMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{personalEmailMsg}</p>
            )}
            <button onClick={sendPersonalEmailChange} disabled={personalEmailSending || !newPersonalEmail.trim()}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {personalEmailSending ? 'Sending…' : 'Send Confirmation Email'}
            </button>
          </div>
        )}
      </div>

      {/* Become a Giver CTA */}
      {user?.accountStatus === 'SEEKER_VERIFIED' && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-brand-900">Want to offer rides?</p>
            <p className="text-sm text-brand-700 mt-0.5">Upload your DL and RC to become a Ride Giver and share your commute.</p>
          </div>
          <a href="/become-giver"
            className="shrink-0 bg-brand-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition">
            Become a Giver →
          </a>
        </div>
      )}

      {/* Identity docs CTA (not yet submitted) */}
      {user?.accountStatus === 'DOCUMENT_VERIFICATION_PENDING' && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-brand-900">Complete identity verification</p>
            <p className="text-sm text-brand-700 mt-0.5">Upload your company ID + government ID to get your TRID and start booking rides.</p>
          </div>
          <a href="/verify-identity"
            className="shrink-0 bg-brand-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition">
            Verify Now →
          </a>
        </div>
      )}

      {/* Legacy verification upload (kept for REJECTED re-upload) */}
      {!['SEEKER_VERIFIED', 'DOCUMENT_VERIFICATION_PENDING', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'].includes(user?.accountStatus || '') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">📄 Verification Documents</h2>

          {minioAvailable === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-800">
              ⚠️ Document storage (MinIO) is not running. Start it with <code className="bg-amber-100 px-1 rounded">minio server ~/minio-data</code> then refresh.
            </div>
          )}

          {verStatus?.status === 'REJECTED' && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">
              ❌ Rejected: {verStatus.rejectionReason || 'Please re-upload your documents'}
            </div>
          )}

          <div className="space-y-3">
            {/* Employee ID */}
            <FileUploadField
              label="Employee ID *"
              docType="employee_id"
              uploaded={!!uploadedDocs.employeeIdUrl}
              uploading={uploading === 'employee_id'}
              disabled={!minioAvailable}
              onChange={e => handleFileChange(e, 'employee_id')}
            />

            {/* Driving License — Givers only */}
            {isGiver && (
              <FileUploadField
                label="Driving License (Givers)"
                docType="driving_license"
                uploaded={!!uploadedDocs.drivingLicenseUrl}
                uploading={uploading === 'driving_license'}
                disabled={!minioAvailable}
                onChange={e => handleFileChange(e, 'driving_license')}
              />
            )}

            {/* RC — Givers only */}
            {isGiver && (
              <FileUploadField
                label="Vehicle RC (Givers)"
                docType="rc"
                uploaded={!!uploadedDocs.rcUrl}
                uploading={uploading === 'rc'}
                disabled={!minioAvailable}
                onChange={e => handleFileChange(e, 'rc')}
              />
            )}

            {submitMsg && (
              <p className={`text-sm ${submitMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {submitMsg}
              </p>
            )}

            <button
              onClick={submitVerification}
              disabled={loading || !uploadedDocs.employeeIdUrl}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}

      {/* Phase 3 — Prompt for existing DRIVER_VERIFIED users with no rcVerified vehicle */}
      {user?.accountStatus === 'DRIVER_VERIFIED' && vehicles.length > 0 && vehicles.every(v => !v.rcVerified) && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">⚠️ Your vehicle RC is not yet verified</p>
          <p className="text-xs text-amber-700">
            To publish rides, at least one of your vehicles must have a verified RC.
            Upload your RC below and admin will approve it shortly.
          </p>
        </div>
      )}

      {/* Vehicles — givers only */}
      {isGiver && <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">🚗 My Vehicles</h2>
          <button onClick={() => setAddVehicle(!addVehicle)} className="text-sm text-brand-600 font-medium hover:underline">
            {addVehicle ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {addVehicle && (
          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
            {[
              ['make', 'Make (e.g. Maruti)'],
              ['model', 'Model (e.g. Swift)'],
              ['color', 'Color'],
              ['plateNumber', 'Plate Number'],
            ].map(([k, p]) => (
              <input key={k} placeholder={p} value={(vForm as any)[k]}
                onChange={e => setVForm(f => ({ ...f, [k]: e.target.value }))}
                className={inputCls} />
            ))}
            <div>
              <label className="text-xs text-gray-600">Total Seats</label>
              <select value={vForm.totalSeats}
                onChange={e => setVForm(f => ({ ...f, totalSeats: +e.target.value }))}
                className={`${inputCls} mt-1`}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''} (excl. Ride Giver)</option>)}
              </select>
            </div>
            {/* RC Upload — required for vehicle verification */}
            <div>
              <FileUploadField
                label="Vehicle RC (Registration Certificate)"
                docType="rc"
                uploaded={!!newVehicleRcUrl}
                uploading={vehicleRcUploading}
                disabled={!minioAvailable}
                onChange={handleNewVehicleRcChange}
              />
              <p className="text-xs text-amber-600 mt-1">⚠️ RC required for admin verification. You can add it later too.</p>
            </div>
            <button onClick={submitVehicle} disabled={loading}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        )}

        {vehicles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No vehicles added yet</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map(v => {
              const rcInputId = `rc-upload-${v.id}`;
              return (
                <div key={v.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.make} {v.model}</p>
                      <p className="text-xs text-gray-500">{v.plateNumber} · {v.color} · {v.totalSeats} seats</p>
                    </div>
                    {v.rcVerified
                      ? <span className="text-xs text-green-600 font-medium">✅ RC Verified</span>
                      : v.rcUrl
                        ? <span className="text-xs text-amber-600 font-medium">⏳ RC Pending</span>
                        : user?.accountStatus === 'DRIVER_VERIFIED'
                          ? null
                          : <span className="text-xs text-red-500 font-medium">❌ No RC</span>}
                  </div>
                  {/* Show upload RC button if not verified yet */}
                  {!v.rcVerified && (
                    <div className="flex items-center gap-2">
                      <input
                        id={rcInputId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePerVehicleRcChange(e, v.id)}
                      />
                      <button
                        type="button"
                        disabled={!minioAvailable || perVehicleRcUploading === v.id}
                        onClick={() => document.getElementById(rcInputId)?.click()}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {perVehicleRcUploading === v.id ? '⏳ Uploading...' : v.rcUrl ? '🔄 Replace RC' : '📄 Upload RC'}
                      </button>
                      {v.rcUrl && <span className="text-xs text-gray-400">Waiting for admin approval</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* Map Pin Modal — Home / Office */}
      {mapModal && (
        <MapPinModal
          title={mapModal === 'home' ? 'Set Home Location' : 'Set Office Location'}
          defaultAlias={mapModal === 'home' ? (editForm.homeLocation || 'Home') : (editForm.officeLocation || 'Office')}
          initialLat={mapModal === 'home' ? (editForm.homeLat || undefined) : (editForm.officeLat || undefined)}
          initialLng={mapModal === 'home' ? (editForm.homeLng || undefined) : (editForm.officeLng || undefined)}
          onConfirm={(loc: MapLocation) => {
            if (mapModal === 'home') {
              setEditForm((f) => ({ ...f, homeLocation: loc.alias, homeLat: loc.lat, homeLng: loc.lng, homeAddress: loc.address }));
            } else {
              setEditForm((f) => ({ ...f, officeLocation: loc.alias, officeLat: loc.lat, officeLng: loc.lng, officeAddress: loc.address }));
            }
            setMapModal(null);
          }}
          onClose={() => setMapModal(null)}
        />
      )}
    </div>
  );
}

// ── Reusable file upload field ──────────────────────────────────────────────
function FileUploadField({
  label, docType, uploaded, uploading, disabled, onChange,
}: {
  label: string;
  docType: string;
  uploaded: boolean;
  uploading: boolean;
  disabled: boolean | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {uploaded && <p className="text-xs text-green-600 mt-0.5">✅ Uploaded</p>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!disabled || uploading}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            uploaded
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {uploading ? '⏳ Uploading...' : uploaded ? 'Replace' : 'Upload'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">📷 Images only (jpg, png, heic etc.) — PDFs not accepted</p>
    </>
  );
}
