'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { vehiclesApi, verificationApi, api, usersApi } from '@/lib/api';

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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs>({});
  const [minioAvailable, setMinioAvailable] = useState<boolean | null>(null);
  const [submitMsg, setSubmitMsg] = useState('');

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '', phone: '', companyName: '',
    homeLocation: '', officeLocation: '', bloodGroup: '', gender: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

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

  const openEdit = () => {
    setEditForm({
      fullName:       user?.fullName                ?? '',
      phone:          (user as any)?.phone          ?? '',
      companyName:    user?.companyName             ?? '',
      homeLocation:   (user as any)?.homeLocation   ?? '',
      officeLocation: (user as any)?.officeLocation ?? '',
      bloodGroup:     (user as any)?.bloodGroup     ?? '',
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

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/uploads/document?type=${docType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

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

  const submitVerification = async () => {
    const payload: any = {};
    if (uploadedDocs.employeeIdUrl) payload.employeeIdUrl = uploadedDocs.employeeIdUrl;
    if (uploadedDocs.drivingLicenseUrl) payload.drivingLicenseUrl = uploadedDocs.drivingLicenseUrl;
    if (uploadedDocs.rcUrl) payload.rcUrl = uploadedDocs.rcUrl;

    if (!payload.employeeIdUrl) {
      setSubmitMsg('Please upload your Employee ID first');
      return;
    }
    setLoading(true);
    try {
      await verificationApi.submit(payload);
      const r = await verificationApi.getStatus();
      setVerStatus(r.data);
      await fetchProfile();
      setSubmitMsg('✅ Documents submitted! Under review within 24 hours.');
    } catch {
      setSubmitMsg('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitVehicle = async () => {
    setLoading(true);
    try {
      await vehiclesApi.create(vForm);
      const r = await vehiclesApi.getMine();
      setVehicles(r.data);
      setAddVehicle(false);
      setVForm({ make: '', model: '', color: '', plateNumber: '', totalSeats: 4 });
    } finally {
      setLoading(false);
    }
  };

  const eco = user?.ecoLevel ? ECO_BADGES[user.ecoLevel] : ECO_BADGES.SEED;
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';
  const isGiver = user?.role === 'RIDE_GIVER' || user?.role === 'BOTH';

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
            <p className="font-semibold text-gray-900">{user?.fullName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${eco.color}`}>
              {eco.icon} {eco.label} · {user?.ecoPoints} pts
            </span>
          </div>
          <button onClick={openEdit}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shrink-0">
            ✏️ Edit
          </button>
        </div>

        {/* Inline edit form */}
        {editing && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Edit Profile</p>
            {[
              { label: 'Full Name',   key: 'fullName',       type: 'text' },
              { label: 'Phone',       key: 'phone',          type: 'tel' },
              { label: 'Company',     key: 'companyName',    type: 'text' },
              { label: 'Home Area',   key: 'homeLocation',   type: 'text' },
              { label: 'Office Area', key: 'officeLocation', type: 'text' },
              { label: 'Blood Group', key: 'bloodGroup',     type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input
                  type={type}
                  value={(editForm as any)[key]}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gender</label>
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {editMsg && <p className="text-xs text-red-600">{editMsg}</p>}
            <div className="flex gap-2 pt-1">
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

        {/* TRID Member Card */}
        {(user as any)?.trid && (
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-4 text-white text-center mb-1">
            <p className="text-brand-200 text-xs mb-1">TechieRide Member ID</p>
            <p className="text-2xl font-bold tracking-widest">{(user as any).trid}</p>
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
              user?.accountStatus === 'DRIVER_VERIFIED' ? 'text-green-600' :
              user?.accountStatus === 'EMPLOYEE_VERIFIED' ? 'text-blue-600' :
              user?.accountStatus === 'REJECTED' ? 'text-red-600' :
              user?.accountStatus === 'SUSPENDED' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {user?.accountStatus === 'DRIVER_VERIFIED' ? '✅ Driver Verified' :
               user?.accountStatus === 'EMPLOYEE_VERIFIED' ? '✅ Employee Verified' :
               user?.accountStatus === 'DRIVER_VERIFICATION_PENDING' ? '⏳ Driver Review' :
               user?.accountStatus === 'DOCUMENT_VERIFICATION_PENDING' ? '⏳ Docs Pending' :
               user?.accountStatus === 'EXCEPTION_VERIFICATION_REQUESTED' ? '🔍 Exception Review' :
               user?.accountStatus === 'EMAIL_VERIFICATION_PENDING' ? '📧 Email Unverified' :
               user?.accountStatus === 'REJECTED' ? '❌ Rejected' :
               user?.accountStatus === 'SUSPENDED' ? '🚫 Suspended' : '⏳ Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Official Email */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Official Email</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button onClick={() => { setEmailChangeMode(!emailChangeMode); setEmailChangeMsg(''); }}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {emailChangeMode ? 'Cancel' : '✏️ Change'}
          </button>
        </div>
        {emailChangeMode && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-500">Enter your new corporate email. A verification link will be sent there — your current email stays active until confirmed.</p>
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
      </div>

      {/* Change Personal Email */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Personal Email</p>
            <p className="text-sm text-gray-500">{(user as any)?.personalEmail || 'Not set'}</p>
          </div>
          <button onClick={() => { setPersonalEmailMode(!personalEmailMode); setPersonalEmailMsg(''); }}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {personalEmailMode ? 'Cancel' : (user as any)?.personalEmail ? '✏️ Change' : '+ Add'}
          </button>
        </div>
        {personalEmailMode && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-500">A confirmation link will be sent to this address before it's saved.</p>
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
      {user?.accountStatus === 'EMPLOYEE_VERIFIED' && (
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

      {/* Verification upload */}
      {!['EMPLOYEE_VERIFIED', 'DRIVER_VERIFICATION_PENDING', 'DRIVER_VERIFIED'].includes(user?.accountStatus || '') && (
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
                {[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} seats</option>)}
              </select>
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
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.make} {v.model}</p>
                  <p className="text-xs text-gray-500">{v.plateNumber} · {v.color} · {v.totalSeats} seats</p>
                </div>
                {v.rcVerified
                  ? <span className="text-xs text-green-600 font-medium">✅ RC Verified</span>
                  : <span className="text-xs text-amber-600 font-medium">⏳ RC Pending</span>}
              </div>
            ))}
          </div>
        )}
      </div>}
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
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {uploaded && <p className="text-xs text-green-600 mt-0.5">✅ Uploaded</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" onChange={onChange} className="hidden" />
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
  );
}
