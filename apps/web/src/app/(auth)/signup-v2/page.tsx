'use client';

import Image from 'next/image';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { registrationApi } from '@/lib/api';

const STEPS = ['Personal Email', 'Profile', 'Office Email', 'Documents', 'Review'];

const BLOCKED_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'outlook.com','hotmail.com','hotmail.co.in','hotmail.co.uk','live.com','live.in','msn.com',
  'yahoo.com','yahoo.co.in','yahoo.co.uk','ymail.com','rocketmail.com',
  'icloud.com','me.com','mac.com',
  'rediffmail.com','rediff.com','indiatimes.com','sify.com',
  'protonmail.com','proton.me','tutanota.com','aol.com','mail.com',
  'gmx.com','gmx.net','fastmail.com','yandex.com','mail.ru',
]);

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';
const btnPrimary = 'w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm';
const btnOutline = 'w-full py-2.5 border border-brand-600 text-brand-600 rounded-lg font-medium hover:bg-brand-50 disabled:opacity-50 text-sm';

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            i < current ? 'bg-green-500 text-white' :
            i === current ? 'bg-brand-600 text-white' :
            'bg-gray-200 text-gray-500'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`hidden sm:inline text-xs ml-1 ${i === current ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="w-4 sm:w-8 h-px bg-gray-300 mx-1" />}
        </div>
      ))}
    </div>
  );
}

export default function SignupV2Page() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}><SignupV2Content /></Suspense>;
}

function SignupV2Content() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [showException, setShowException] = useState(false);

  // Form state
  const [personalEmail, setPersonalEmail] = useState('');
  const [profile, setProfile] = useState({
    fullName: '', gender: '' as string, password: '', phone: '',
    companyName: '', bloodGroup: '', homeLocation: '', officeLocation: '',
    emergencyContactName: '', emergencyContactPhone: '',
  });
  const [officeEmail, setOfficeEmail] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [docs, setDocs] = useState({ employeeIdUrl: '', govtIdUrl: '', selfDeclarationAccepted: false });

  // Sub-steps for email verification waiting screens
  const [waitingPersonal, setWaitingPersonal] = useState(false);
  const [waitingOffice, setWaitingOffice] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Restore pending registration from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tr_pending_reg');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPendingId(data.pendingId);
        // Fetch current status to resume at correct step
        registrationApi.getStatus(data.pendingId).then(res => {
          const s = res.data;
          setPersonalEmail(s.personalEmail || '');
          setOfficeEmail(s.officeEmail || '');
          if (s.status === 'PENDING_REVIEW' || s.status === 'APPROVED') {
            setSubmitted(true);
            setStep(4);
          } else if (s.status === 'REJECTED') {
            localStorage.removeItem('tr_pending_reg');
            setPendingId('');
            setError(`Your previous application was rejected${s.rejectionReason ? ': ' + s.rejectionReason : ''}. Please register again.`);
            setStep(0);
          } else if (s.employeeIdUrl) {
            setStep(4);
            setSubmitted(true);
          } else if (s.officeEmailVerified || s.isException) {
            setStep(3);
          } else if (s.officeEmail) {
            setStep(2);
            setWaitingOffice(true);
          } else if (s.fullName) {
            setStep(2);
          } else if (s.personalEmailVerified) {
            setStep(1);
          } else {
            setStep(0);
            setWaitingPersonal(true);
          }
        }).catch(() => {
          localStorage.removeItem('tr_pending_reg');
          setPendingId('');
          setSuccess('Your registration may have been approved! Try logging in with your personal email.');
        });
      } catch { localStorage.removeItem('tr_pending_reg'); }
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const savePendingId = (id: string) => {
    setPendingId(id);
    localStorage.setItem('tr_pending_reg', JSON.stringify({ pendingId: id }));
  };

  // ── Step 0: Submit personal email ──────────────────────────────────

  const handleStartRegistration = async () => {
    if (!personalEmail.includes('@')) { setError('Please enter a valid email address.'); return; }
    setLoading(true); setError('');
    try {
      const res = await registrationApi.start(personalEmail.toLowerCase().trim());
      savePendingId(res.data.pendingId);
      setWaitingPersonal(true);
      setSuccess('Verification link sent! Check your personal email inbox.');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResendPersonal = async () => {
    if (!pendingId) return;
    setLoading(true); setError('');
    try {
      await registrationApi.resendPersonal(pendingId);
      setSuccess('Verification link resent!');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to resend.');
    } finally { setLoading(false); }
  };

  const handleUpdatePersonalEmail = async () => {
    if (!personalEmail.includes('@')) { setError('Please enter a valid email.'); return; }
    setLoading(true); setError('');
    try {
      await registrationApi.updatePersonalEmail(pendingId, personalEmail.toLowerCase().trim());
      setEditingEmail(false);
      setSuccess('Verification link sent to your updated email!');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update email.');
    } finally { setLoading(false); }
  };

  // ── Step 1: Submit profile ─────────────────────────────────────────

  const handleSubmitProfile = async () => {
    if (!profile.fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!profile.gender) { setError('Please select your gender.'); return; }
    if (profile.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/^[6-9]\d{9}$/.test(profile.phone.trim())) { setError('Enter a valid 10-digit Indian mobile number (starting with 6–9).'); return; }
    if (!profile.companyName.trim()) { setError('Please enter your company name.'); return; }
    setLoading(true); setError('');
    try {
      await registrationApi.submitProfile(pendingId, {
        ...profile,
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        companyName: profile.companyName.trim(),
      });
      setStep(2);
      setSuccess('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save profile.');
    } finally { setLoading(false); }
  };

  // ── Step 2: Submit office email ────────────────────────────────────

  const handleSubmitOfficeEmail = async () => {
    if (!officeEmail.includes('@')) { setError('Please enter a valid office email.'); return; }
    const domain = officeEmail.split('@')[1]?.toLowerCase();
    if (domain && BLOCKED_DOMAINS.has(domain)) {
      setError('Personal emails (Gmail, Yahoo, etc.) are not accepted. Please use your company email.');
      return;
    }
    setLoading(true); setError('');
    try {
      await registrationApi.submitOfficeEmail(pendingId, officeEmail.toLowerCase().trim());
      setWaitingOffice(true);
      setSuccess('Verification link sent to your office email!');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit office email.');
    } finally { setLoading(false); }
  };

  const handleResendOffice = async () => {
    setLoading(true); setError('');
    try {
      await registrationApi.resendOffice(pendingId);
      setSuccess('Verification link resent!');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to resend.');
    } finally { setLoading(false); }
  };

  const handleUpdateOfficeEmail = async () => {
    if (!officeEmail.includes('@')) { setError('Please enter a valid email.'); return; }
    setLoading(true); setError('');
    try {
      await registrationApi.updateOfficeEmail(pendingId, officeEmail.toLowerCase().trim());
      setEditingEmail(false);
      setSuccess('Verification link sent to your updated office email!');
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update email.');
    } finally { setLoading(false); }
  };

  const handleSubmitException = async () => {
    if (exceptionReason.trim().length < 20) { setError('Please provide a reason (at least 20 characters).'); return; }
    setLoading(true); setError('');
    try {
      await registrationApi.submitException(pendingId, exceptionReason.trim());
      setShowException(false);
      setWaitingOffice(false);
      setStep(3);
      setSuccess('Exception submitted. You can now upload your documents.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit exception.');
    } finally { setLoading(false); }
  };

  // ── Step 3: Upload documents ───────────────────────────────────────

  const handleSubmitDocs = async () => {
    if (!docs.employeeIdUrl) { setError('Please upload your Company ID card.'); return; }
    if (!docs.govtIdUrl) { setError('Please upload your Government ID.'); return; }
    if (!docs.selfDeclarationAccepted) { setError('Please accept the self-declaration.'); return; }
    setLoading(true); setError('');
    try {
      await registrationApi.submitDocuments(pendingId, docs);
      setSubmitted(true);
      setStep(4);
      setSuccess('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit documents.');
    } finally { setLoading(false); }
  };

  // ── Upload helper (reuses existing upload endpoint) ────────────────

  const uploadDoc = async (file: File, type: 'employee_id' | 'govt_id', setUrl: (url: string) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/register/${pendingId}/upload?type=${type}`,
        { method: 'POST', body: formData },
      );
      const data = await res.json();
      if (data.url) setUrl(data.url);
      else setError('Upload failed. Please try again.');
    } catch {
      setError('Upload failed. Check your connection.');
    }
  };

  const updateProfile = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }));

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="TechieRide" width={48} height={48} className="mx-auto mb-2" />
          <h1 className="text-xl font-bold text-gray-900">Create your TechieRide Account</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Stepper current={step} />

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}

          {/* ── Step 0: Personal Email ───────────────────────────── */}
          {step === 0 && !waitingPersonal && (
            <div className="space-y-4">
              <Field label="Personal Email" required hint="Gmail, Outlook, Yahoo etc. — this will be your login email forever">
                <input type="email" className={inputCls} placeholder="yourname@gmail.com"
                  value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} />
              </Field>
              <button className={btnPrimary} disabled={loading} onClick={handleStartRegistration}>
                {loading ? 'Sending...' : 'Send Verification Link'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Already have an account? <Link href="/login" className="text-brand-600 font-medium">Sign In</Link>
              </p>
            </div>
          )}

          {/* ── Waiting for personal email verification ──────────── */}
          {step === 0 && waitingPersonal && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📧</div>
              <h2 className="text-lg font-semibold">Check your personal email</h2>
              <p className="text-sm text-gray-600">
                We sent a verification link to <strong>{personalEmail}</strong>
              </p>
              <p className="text-xs text-gray-400">Click the link in the email to continue registration.</p>

              {!editingEmail ? (
                <div className="space-y-2">
                  <button className={btnOutline} onClick={handleResendPersonal}
                    disabled={loading || resendCooldown > 0}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                  </button>
                  <button className="text-sm text-brand-600 underline" onClick={() => { setEditingEmail(true); setError(''); }}>
                    Wrong email? Edit it
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="email" className={inputCls} value={personalEmail}
                    onChange={e => setPersonalEmail(e.target.value)} />
                  <button className={btnPrimary} disabled={loading} onClick={handleUpdatePersonalEmail}>
                    {loading ? 'Updating...' : 'Update & Resend'}
                  </button>
                  <button className="text-sm text-gray-500 underline" onClick={() => setEditingEmail(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Profile ──────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-green-600 font-medium mb-2">✅ Personal email verified: {personalEmail}</p>

              <Field label="Full Name" required>
                <input className={inputCls} placeholder="Arjun Mehta"
                  value={profile.fullName} onChange={e => updateProfile('fullName', e.target.value)} />
              </Field>

              <Field label="Gender" required>
                <select className={inputCls} value={profile.gender} onChange={e => updateProfile('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>

              <Field label="Password" required hint="Minimum 8 characters">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className={inputCls}
                    placeholder="Min. 8 characters" value={profile.password}
                    onChange={e => updateProfile('password', e.target.value)} />
                  <button type="button" className="absolute right-3 top-2.5 text-gray-400 text-sm"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Field label="Mobile Number" required hint="10-digit number starting with 6-9">
                <div className="flex gap-2">
                  <span className="flex items-center px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm">🇮🇳 +91</span>
                  <input className={inputCls} placeholder="9876543210" maxLength={10}
                    value={profile.phone}
                    onChange={e => updateProfile('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
              </Field>

              <Field label="Company Name" required>
                <input className={inputCls} placeholder="TCS, Infosys, Wipro..."
                  value={profile.companyName} onChange={e => updateProfile('companyName', e.target.value)} />
              </Field>

              <button className={btnPrimary} disabled={loading} onClick={handleSubmitProfile}>
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── Step 2: Office Email ─────────────────────────────── */}
          {step === 2 && !waitingOffice && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter your <strong>company/office email</strong> to verify your employment.
              </p>
              <Field label="Office Email" required hint="Must be a company domain (no Gmail, Yahoo, etc.)">
                <input type="email" className={inputCls} placeholder="you@company.com"
                  value={officeEmail} onChange={e => setOfficeEmail(e.target.value)} />
              </Field>
              <button className={btnPrimary} disabled={loading} onClick={handleSubmitOfficeEmail}>
                {loading ? 'Sending...' : 'Send Verification Link'}
              </button>
            </div>
          )}

          {/* ── Waiting for office email verification ────────────── */}
          {step === 2 && waitingOffice && !showException && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">🏢</div>
              <h2 className="text-lg font-semibold">Check your office email</h2>
              <p className="text-sm text-gray-600">
                We sent a verification link to <strong>{officeEmail}</strong>
              </p>

              {!editingEmail ? (
                <div className="space-y-2">
                  <button className={btnOutline} onClick={handleResendOffice}
                    disabled={loading || resendCooldown > 0}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                  </button>
                  <button className="text-sm text-brand-600 underline" onClick={() => { setEditingEmail(true); setError(''); }}>
                    Wrong email? Edit it
                  </button>
                  <div className="pt-2 border-t border-gray-200 mt-4">
                    <button className="text-sm text-amber-600 underline" onClick={() => setShowException(true)}>
                      Can&apos;t access your company email? Request exception
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="email" className={inputCls} value={officeEmail}
                    onChange={e => setOfficeEmail(e.target.value)} />
                  <button className={btnPrimary} disabled={loading} onClick={handleUpdateOfficeEmail}>
                    {loading ? 'Updating...' : 'Update & Resend'}
                  </button>
                  <button className="text-sm text-gray-500 underline" onClick={() => setEditingEmail(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* ── Exception request ────────────────────────────────── */}
          {step === 2 && showException && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Exception Request</h2>
              <p className="text-sm text-gray-600">
                If your company blocks external emails, explain why you can&apos;t verify your office email.
                Admin will review your request along with your identity documents.
              </p>
              <Field label="Reason" required hint="Minimum 20 characters">
                <textarea className={inputCls} rows={3} placeholder="Explain why you cannot receive the verification email..."
                  value={exceptionReason} onChange={e => setExceptionReason(e.target.value)} />
              </Field>
              <button className={btnPrimary} disabled={loading} onClick={handleSubmitException}>
                {loading ? 'Submitting...' : 'Submit Exception & Continue'}
              </button>
              <button className="text-sm text-gray-500 underline w-full text-center"
                onClick={() => setShowException(false)}>Back</button>
            </div>
          )}

          {/* ── Step 3: Documents ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Upload Identity Documents</h2>
              <p className="text-sm text-gray-600">Upload your Company ID card and Government ID for verification.</p>

              <Field label="Company / Employee ID Card" required>
                {docs.employeeIdUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-sm">✅ Uploaded</span>
                    <button className="text-xs text-brand-600 underline"
                      onClick={() => setDocs(d => ({ ...d, employeeIdUrl: '' }))}>Re-upload</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,.pdf" className="text-sm"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc(f, 'employee_id', url => setDocs(d => ({ ...d, employeeIdUrl: url })));
                    }} />
                )}
              </Field>

              <Field label="Government ID (Aadhaar / PAN / Passport)" required>
                {docs.govtIdUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-sm">✅ Uploaded</span>
                    <button className="text-xs text-brand-600 underline"
                      onClick={() => setDocs(d => ({ ...d, govtIdUrl: '' }))}>Re-upload</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,.pdf" className="text-sm"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc(f, 'govt_id', url => setDocs(d => ({ ...d, govtIdUrl: url })));
                    }} />
                )}
              </Field>

              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" id="self-decl" className="mt-1"
                  checked={docs.selfDeclarationAccepted}
                  onChange={e => setDocs(d => ({ ...d, selfDeclarationAccepted: e.target.checked }))} />
                <label htmlFor="self-decl" className="text-xs text-gray-600">
                  I declare that I am a verified IT professional. The documents I have uploaded are genuine and belong to me.
                  I understand that providing false information will result in account termination.
                </label>
              </div>

              <button className={btnPrimary} disabled={loading} onClick={handleSubmitDocs}>
                {loading ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          )}

          {/* ── Step 4: Submitted / Under Review ─────────────────── */}
          {step === 4 && submitted && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">⏳</div>
              <h2 className="text-lg font-semibold">Application Under Review</h2>
              <p className="text-sm text-gray-600">
                Your documents have been submitted. Our admin team will review your application
                within <strong>2 business days</strong>.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                You will receive an email at <strong>{personalEmail}</strong> once your account is approved.
              </div>
              <div className="text-left space-y-2 mt-4">
                <h3 className="text-sm font-semibold text-gray-700">What happens next?</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>1. ✅ Admin reviews your identity documents</p>
                  <p>2. ✅ Your TechieRide ID (TRID) is assigned</p>
                  <p>3. ✅ Account activated — login with your personal email</p>
                  <p>4. 🚗 Start searching and booking rides!</p>
                </div>
              </div>
              <Link href="/login" className={`${btnOutline} inline-block mt-4`}>
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
