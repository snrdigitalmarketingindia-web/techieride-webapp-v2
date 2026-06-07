'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { verificationApi, vehiclesApi, uploadsApi, api } from '@/lib/api';
import { convertToWebp } from '@/lib/convertToWebp';

const STEPS = ['Requirements', 'Documents', 'Vehicle', 'Submit'];

// Returns a human-readable mismatch message, or null if everything matches.
// parsedData = what Gemini extracted from the RC image
// form = what the user filled in
function getRcMismatch(
  parsedData: Record<string, any>,
  form: { make: string; model: string; plateNumber: string },
): string | null {
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[\s\-_]/g, '');

  const parsedPlate  = norm(parsedData.plateNumber);
  const enteredPlate = norm(form.plateNumber);

  if (parsedPlate && enteredPlate && parsedPlate !== enteredPlate) {
    return `Your RC shows plate "${parsedData.plateNumber}" but you entered "${form.plateNumber}".`;
  }

  const parsedMake   = norm(parsedData.make);
  const enteredMake  = norm(form.make);
  const parsedModel  = norm(parsedData.model);
  const enteredModel = norm(form.model);

  const makeOk  = !parsedMake  || parsedMake.includes(enteredMake)  || enteredMake.includes(parsedMake);
  const modelOk = !parsedModel || parsedModel.includes(enteredModel) || enteredModel.includes(parsedModel);

  if (!makeOk || !modelOk) {
    const rcVehicle      = [parsedData.make, parsedData.model].filter(Boolean).join(' ');
    const enteredVehicle = [form.make, form.model].filter(Boolean).join(' ');
    return `Your RC is for "${rcVehicle}" but you entered "${enteredVehicle}".`;
  }

  return null;
}

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
  const [rcParsedData, setRcParsedData] = useState<Record<string, any> | null>(null);
  const [rcParsing, setRcParsing] = useState(false);
  const [vehicle, setVehicle] = useState({ make: '', model: '', color: '', plateNumber: '', totalSeats: '4' });
  const [vehicleSaved, setVehicleSaved] = useState(false);
  const [minioAvailable, setMinioAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/uploads/status')
      .then(r => setMinioAvailable(r.data.available))
      .catch(() => setMinioAvailable(false));
  }, []);

  // Guard: only EMPLOYEE_VERIFIED can access this page
  if (user && !['EMPLOYEE_VERIFIED'].includes(user.accountStatus)) {
    if (user.accountStatus === 'DRIVER_VERIFIED' || user.accountStatus === 'DRIVER_VERIFICATION_PENDING') {
      return (
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <div className="text-5xl">🚗</div>
          <h1 className="text-xl font-bold text-gray-900">
            {user.accountStatus === 'DRIVER_VERIFIED' ? 'You\'re already a Ride Giver!' : 'Driver verification pending'}
          </h1>
          <p className="text-gray-500 text-sm">
            {user.accountStatus === 'DRIVER_VERIFIED'
              ? 'You can now offer rides on TechieRide.'
              : 'Your driving license and RC are being reviewed. You\'ll be notified within 2 business days.'}
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

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    const webp = await convertToWebp(file);
    const form = new FormData();
    form.append('file', webp);
    const { data } = await api.post(`/uploads/document?type=${docType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const handleFile = async (file: File, docType: string) => {
    setUploading(docType);
    setError('');
    try {
      const url = await uploadFile(file, docType);
      const keyMap: Record<string, keyof typeof docs> = {
        driving_license: 'drivingLicenseUrl',
        rc: 'rcUrl',
      };
      const key = keyMap[docType];
      if (key) setDocs(prev => ({ ...prev, [key]: url }));

      // After RC upload — parse it with Gemini to extract vehicle details
      if (docType === 'rc') {
        setRcParsing(true);
        setRcParsedData(null);
        try {
          const { data: parseResult } = await uploadsApi.parseRc(url);
          if (!parseResult.readable) {
            // Block proceeding — ask user to re-upload
            setDocs(prev => ({ ...prev, rcUrl: '' }));
            setError(
              `⚠️ Your RC image is not clear enough to read${parseResult.reason ? ` (${parseResult.reason})` : ''}. ` +
              `Please re-upload a well-lit, flat photo where all text is clearly visible.`
            );
          } else {
            // Pre-fill vehicle form with extracted data
            const d = parseResult.data;
            setRcParsedData(d);
            setVehicle(prev => ({
              make:        d.make        || prev.make,
              model:       d.model       || prev.model,
              color:       d.color       || prev.color,
              plateNumber: d.plateNumber || prev.plateNumber,
              totalSeats:  d.totalSeats  ? String(d.totalSeats) : prev.totalSeats,
            }));
          }
        } catch {
          // Parsing failed silently — user can still fill form manually
        } finally {
          setRcParsing(false);
        }
      }
    } catch {
      setError('Upload failed. Make sure document storage is running.');
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
    // Block save if RC parsed data doesn't match what user filled
    if (rcParsedData) {
      const mismatch = getRcMismatch(rcParsedData, vehicle);
      if (mismatch) {
        setError(`⚠️ ${mismatch} Please correct the details to match your RC before saving.`);
        return;
      }
    }
    try {
      const created = await vehiclesApi.create({ ...vehicle, totalSeats: parseInt(vehicle.totalSeats) });
      // Auto-link the RC uploaded in Step 1 to this vehicle — no need to re-upload later
      const vehicleId = created.data?.id;
      if (vehicleId && docs.rcUrl) {
        await vehiclesApi.updateRc(vehicleId, docs.rcUrl, rcParsedData);
      }
      setVehicleSaved(true);
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
    setSubmitting(true);
    try {
      await verificationApi.submitDriver({ drivingLicenseUrl: docs.drivingLicenseUrl, rcUrl: docs.rcUrl });
      await fetchProfile();
      setSubmitted(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Application submitted!</h1>
        <p className="text-gray-600">Your driving license and RC are under review. Admin will approve within 2 business days.</p>
        <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700 text-left space-y-2">
          <p className="font-medium">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-600">
            <li>Admin reviews your DL and RC</li>
            <li>Your vehicle RC will also be verified</li>
            <li>You'll receive an in-app notification when approved</li>
            <li>Your role upgrades to Ride Giver automatically</li>
          </ol>
        </div>
        <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const canProceedStep1 = docs.drivingLicenseUrl && docs.rcUrl;

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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── Step 0 — Requirements ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">What you'll need</h2>
            {[
              { icon: '🪪', title: 'Driving License', desc: 'Valid Indian DL — photo or scan' },
              { icon: '🚗', title: 'Vehicle RC', desc: 'Registration Certificate for your vehicle' },
              { icon: '🚙', title: 'Vehicle Details', desc: 'Make, model, colour, plate number, seating capacity' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <span className="ml-auto text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">Required</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Admin review — up to 2 business days</p>
            <p>Your documents are reviewed manually. You'll get an in-app notification when approved.</p>
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
            {rcParsing && (
              <p className="text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                🔍 Reading your RC… vehicle details will be filled automatically.
              </p>
            )}
            {!rcParsing && rcParsedData && docs.rcUrl && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✅ RC read successfully — vehicle details pre-filled in Step 3. Please review them.
              </p>
            )}
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

            {rcParsedData && !vehicleSaved && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-700">
                ✨ Details auto-filled from your RC. Review carefully and correct anything that looks wrong before saving.
              </div>
            )}

            {vehicleSaved ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                ✅ Vehicle saved — <strong>{vehicle.make} {vehicle.model}</strong> ({vehicle.plateNumber})
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
                    {[2, 3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>{n} seats (excluding driver)</option>
                    ))}
                  </select>
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
              onClick={() => { setError(''); setStep(3); }}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition">
              {vehicleSaved ? 'Next →' : 'Skip for now →'}
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
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Vehicle</span>
                <span className={vehicleSaved ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {vehicleSaved ? `✅ ${vehicle.make} ${vehicle.model} · RC attached` : '— (can add later)'}
                </span>
              </div>
            </div>
          </div>

          {!docs.drivingLicenseUrl || !docs.rcUrl ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Please go back and upload your Driving License and RC before submitting.
            </div>
          ) : (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
              By submitting, you confirm these are your genuine documents. False submissions will result in a permanent ban.
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setError(''); setStep(2); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              onClick={submitDriver}
              disabled={submitting || !docs.drivingLicenseUrl || !docs.rcUrl}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {submitting ? '⏳ Submitting…' : 'Submit Application 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
