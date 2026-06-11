'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { verificationApi, vehiclesApi, api } from '@/lib/api';
import { uploadDocument } from '@/lib/uploadDocument';

const STEPS = ['Requirements', 'Documents', 'Vehicle', 'Submit'];

// ── Reusable upload field ──────────────────────────────────────────────────
function UploadField({
  label, hint, docType, url, uploading, disabled, onFile,
}: {
  label: string;
  hint?: string;
  docType: string;
  url: string;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File, docType: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const uploaded = !!url;
  return (
    <>
      <div className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
          {uploaded && <p className="text-xs text-green-600 mt-1">✅ Uploaded</p>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onFile(f, docType); e.target.value = ''; } }} />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={disabled || uploading}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
            uploaded ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :
            disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
            'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {uploading ? '⏳ Uploading…' : uploaded ? 'Replace' : 'Upload'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">📷 Images only (jpg, png, heic etc.) — PDFs not accepted</p>
    </>
  );
}

export default function BecomeGiverPage() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState<string | null>(null);
  const [docs, setDocs] = useState({ drivingLicenseUrl: '', rcUrl: '' });
  const [vehicle, setVehicle] = useState({ make: '', model: '', color: '', plateNumber: '', totalSeats: '4', photoUrl: '' });
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [minioAvailable, setMinioAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [prevRejectionReason, setPrevRejectionReason] = useState<string | null>(null);
  // Hooks must all run before any conditional return below — calling useRef
  // after the early-return guards crashes React when accountStatus changes
  // mid-flow ("Rendered fewer hooks than expected").
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/uploads/status')
      .then(r => setMinioAvailable(r.data.available))
      .catch(() => setMinioAvailable(false));
  }, []);

  useEffect(() => {
    verificationApi.getStatus().then(r => {
      const driver = r.data?.driver;
      if (driver?.status === 'REJECTED') setPrevRejectionReason(driver.rejectionReason ?? null);
    }).catch(() => {});
    vehiclesApi.getMine().then(r => {
      setExistingVehicles(r.data || []);
    }).catch(() => {});
  }, []);

  // Must be checked before the account-status guard — fetchProfile() changes
  // accountStatus to DRIVER_VERIFICATION_PENDING before setSubmitted(true) fires
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Application submitted!</h1>
        <p className="text-gray-600">Your driving license, RC, and vehicle are under review. Admin will approve within 2 business days.</p>
        <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700 text-left space-y-2">
          <p className="font-medium">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-600">
            <li>Admin reviews your DL, RC, and vehicle details together</li>
            <li>Once approved, your vehicle RC is verified automatically</li>
            <li>You'll receive an in-app notification when approved</li>
            <li>Your role upgrades to Ride Giver — you can offer rides immediately</li>
          </ol>
        </div>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Guard: only SEEKER_VERIFIED can access this page
  if (user && !['SEEKER_VERIFIED'].includes(user.accountStatus)) {
    if (user.accountStatus === 'DRIVER_VERIFIED' || user.accountStatus === 'DRIVER_VERIFICATION_PENDING') {
      return (
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <div className="text-5xl">🚗</div>
          <h1 className="text-xl font-bold text-gray-900">
            {user.accountStatus === 'DRIVER_VERIFIED' ? 'You\'re already a Ride Giver!' : 'Ride Giver verification pending'}
          </h1>
          <p className="text-gray-500 text-sm">
            {user.accountStatus === 'DRIVER_VERIFIED'
              ? 'Congratulations! You are all set to offer rides on TechieRide.'
              : 'Thank you for applying! Your driving licence and RC are under review. We\'ll notify you once approved, within 2 business days.'}
          </p>
          <Link href="/rides/create" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
            {user.accountStatus === 'DRIVER_VERIFIED' ? 'Offer a Ride →' : 'Go to Dashboard'}
          </Link>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Employee verification required</h1>
        <p className="text-gray-500 text-sm">You need to be verified as an employee before applying to become a Ride Giver.</p>
        <Link href="/profile" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Complete Verification →
        </Link>
      </div>
    );
  }

  const handleFile = async (file: File, docType: string) => {
    setUploading(docType);
    setError('');
    try {
      const url = await uploadDocument(file, docType);
      const keyMap: Record<string, keyof typeof docs> = {
        driving_license: 'drivingLicenseUrl',
        rc: 'rcUrl',
      };
      const key = keyMap[docType];
      if (key) setDocs(prev => ({ ...prev, [key]: url }));
    } catch (e: any) {
      setError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleVehiclePhoto = async (file: File) => {
    setUploading('vehicle_photo');
    setError('');
    try {
      const url = await uploadDocument(file, 'vehicle_photo');
      setVehicle(v => ({ ...v, photoUrl: url }));
    } catch (e: any) {
      setError(e?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const saveVehicle = async () => {
    setError('');
    if (!vehicle.make || !vehicle.model || !vehicle.plateNumber) {
      setError('Please fill in make, model, and plate number');
      return;
    }
    if (!docs.rcUrl) {
      setError('Please upload your RC before saving the vehicle');
      return;
    }
    try {
      const created = await vehiclesApi.create({
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        plateNumber: vehicle.plateNumber,
        totalSeats: parseInt(vehicle.totalSeats),
        ...(vehicle.photoUrl ? { photoUrl: vehicle.photoUrl } : {}),
      });
      const createdId = created.data?.id;
      if (createdId) {
        await vehiclesApi.updateRc(createdId, docs.rcUrl, null);
        setVehicleId(createdId);
      }
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save vehicle');
    }
  };

  const submitDriver = async () => {
    setError('');
    if (!docs.drivingLicenseUrl || !docs.rcUrl) {
      setError('Please upload both your Driving License and RC before submitting');
      return;
    }
    if (!vehicleId) {
      setError('Please save your vehicle details before submitting');
      return;
    }
    setSubmitting(true);
    try {
      await verificationApi.submitDriver({
        drivingLicenseUrl: docs.drivingLicenseUrl,
        rcUrl: docs.rcUrl,
        vehicleId,
      });
      // Show success screen first — fetchProfile() flips accountStatus which
      // re-renders the guard branches, so `submitted` must already be true.
      setSubmitted(true);
      fetchProfile().catch(() => {});
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = docs.drivingLicenseUrl && docs.rcUrl;
  const vehicleSaved = !!vehicleId;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-600">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Become a Ride Giver</h1>
        <p className="text-gray-500 text-sm">Share your commute and earn ECO points while helping colleagues.</p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            <p className={`text-xs mt-1 text-center ${i === step ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      {prevRejectionReason && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-1">
          <p className="text-red-800 text-sm font-semibold">❌ Your previous application was not approved</p>
          <p className="text-red-700 text-sm"><span className="font-medium">Reason:</span> {prevRejectionReason}</p>
          <p className="text-red-600 text-xs">Please address the above and re-submit your documents.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── Step 0 — Requirements ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">What you'll need</h2>
            {[
              { icon: '🪪', title: 'Driving License', desc: 'Valid Indian DL — photo or scan', required: true },
              { icon: '🚗', title: 'Vehicle RC', desc: 'Registration Certificate for your vehicle', required: true },
              { icon: '🚙', title: 'Vehicle Details', desc: 'Make, model, colour, plate number, seating capacity', required: true },
              { icon: '📸', title: 'Vehicle Photo', desc: 'A clear photo of your vehicle (front or side)', required: false },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${item.required ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {item.required ? 'Required' : 'Optional'}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Admin review — up to 2 business days</p>
            <p>Your documents are reviewed manually. Once approved, your vehicle is verified and you can offer rides immediately — no second submission needed.</p>
          </div>

          <button onClick={() => { setError(''); setStep(1); }}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 transition">
            I have these — Let's go →
          </button>
        </div>
      )}

      {/* ── Step 1 — Documents ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {minioAvailable === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ Document storage is not running. Start MinIO with <code className="bg-amber-100 px-1 rounded">minio server ~/minio-data</code> then refresh.
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-1">Upload your documents</h2>

            <UploadField
              label="Driving License"
              hint="Clear photo or scan of your valid DL (front side)"
              docType="driving_license"
              url={docs.drivingLicenseUrl}
              uploading={uploading === 'driving_license'}
              disabled={minioAvailable === false}
              onFile={handleFile}
            />

            <UploadField
              label="Vehicle RC"
              hint="Registration Certificate — shows ownership and vehicle details"
              docType="rc"
              url={docs.rcUrl}
              uploading={uploading === 'rc'}
              disabled={minioAvailable === false}
              onFile={handleFile}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setError(''); setStep(0); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              onClick={() => { if (!canProceedStep1) { setError('Please upload both documents to continue'); return; } setError(''); setStep(2); }}
              disabled={!canProceedStep1}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 — Vehicle ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Add your vehicle</h2>
            <p className="text-xs text-gray-500">Vehicle details are required. Admin will review them together with your documents.</p>

            {existingVehicles.length > 0 && !vehicleSaved && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">You already have a vehicle on file — select it or add a new one.</p>
                <div className="space-y-2">
                  {existingVehicles.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setVehicle({ make: v.make, model: v.model, color: v.color || '', plateNumber: v.plateNumber, totalSeats: String(v.totalSeats), photoUrl: v.photoUrl || '' });
                      }}
                      className="w-full text-left px-4 py-2.5 bg-white border border-blue-300 rounded-lg text-sm hover:bg-blue-50 transition"
                    >
                      <span className="font-medium">{v.make} {v.model}</span>
                      <span className="text-gray-500 ml-2">· {v.plateNumber}</span>
                      {v.rcVerified && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">RC Verified</span>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600">— or fill in the form below to add a new vehicle —</p>
              </div>
            )}

            {vehicleSaved ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                ✅ Vehicle saved — <strong>{vehicle.make} {vehicle.model}</strong> ({vehicle.plateNumber})
                <button
                  onClick={() => setVehicleId(null)}
                  className="ml-3 text-xs text-green-600 underline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'make', label: 'Make', placeholder: 'Maruti, Honda...' },
                    { key: 'model', label: 'Model', placeholder: 'Swift, City...' },
                    { key: 'color', label: 'Colour', placeholder: 'White, Silver...' },
                    { key: 'plateNumber', label: 'Plate Number', placeholder: 'TS09AB1234' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label} *</label>
                      <input
                        value={vehicle[f.key as keyof typeof vehicle]}
                        onChange={(e) => setVehicle(v => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Seating Capacity *</label>
                  <select
                    value={vehicle.totalSeats}
                    onChange={(e) => setVehicle(v => ({ ...v, totalSeats: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''} (excl. Ride Giver)</option>
                    ))}
                  </select>
                </div>

                {/* Optional vehicle photo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Photo <span className="text-gray-400">(optional)</span></label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleVehiclePhoto(f); e.target.value = ''; } }}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={minioAvailable === false || uploading === 'vehicle_photo'}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      {uploading === 'vehicle_photo' ? '⏳ Uploading…' : vehicle.photoUrl ? '🔄 Replace Photo' : '📸 Upload Photo'}
                    </button>
                    {vehicle.photoUrl && <span className="text-xs text-green-600">✅ Photo uploaded</span>}
                  </div>
                </div>

                <button onClick={saveVehicle}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition">
                  Save Vehicle
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setError(''); setStep(1); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              onClick={() => {
                if (!vehicleSaved) { setError('Please save your vehicle details to continue'); return; }
                setError('');
                setStep(3);
              }}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Submit ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-2">Review & Submit</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Driving License</span>
                <span className={docs.drivingLicenseUrl ? 'text-green-600 font-medium' : 'text-red-500'}>
                  {docs.drivingLicenseUrl ? '✅ Uploaded' : '❌ Missing'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Vehicle RC</span>
                <span className={docs.rcUrl ? 'text-green-600 font-medium' : 'text-red-500'}>
                  {docs.rcUrl ? '✅ Uploaded' : '❌ Missing'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Vehicle</span>
                <span className={vehicleSaved ? 'text-green-600 font-medium' : 'text-red-500'}>
                  {vehicleSaved ? `✅ ${vehicle.make} ${vehicle.model} · RC attached` : '❌ Missing'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Vehicle Photo</span>
                <span className={vehicle.photoUrl ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {vehicle.photoUrl ? '✅ Uploaded' : '— (optional)'}
                </span>
              </div>
            </div>
          </div>

          {(!docs.drivingLicenseUrl || !docs.rcUrl || !vehicleSaved) ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Please complete all required steps before submitting.
            </div>
          ) : (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
              By submitting, you confirm these are your genuine documents. Admin will review everything together — once approved you can offer rides immediately.
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setError(''); setStep(2); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              onClick={submitDriver}
              disabled={submitting || !docs.drivingLicenseUrl || !docs.rcUrl || !vehicleSaved}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {submitting ? '⏳ Submitting…' : 'Submit Application 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
