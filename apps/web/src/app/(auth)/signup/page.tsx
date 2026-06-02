'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

const STEPS = ['Account', 'Company'];

const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];
function isDomainPersonal(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? PERSONAL_DOMAINS.includes(domain) : false;
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

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

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [domainHint, setDomainHint] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    employeeId: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEmailBlur = () => {
    if (!form.email.includes('@')) return;
    setDomainHint(isDomainPersonal(form.email)
      ? '⚠️ Personal emails are not accepted. Please use your office email.'
      : '');
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Please enter your full name';
      if (!form.email.includes('@')) return 'Please enter a valid office email';
      if (isDomainPersonal(form.email)) return 'Personal emails are not accepted. Use your office email.';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
    }
    if (step === 1) {
      if (!form.companyName.trim()) return 'Please enter your company name';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.register({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        companyName: form.companyName.trim(),
        employeeId: form.employeeId.trim() || undefined,
      });
      setRegisteredEmail(form.email.toLowerCase().trim());
      setRegistered(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/TR_Logo_black.png" alt="TechieRide" width={80} height={80} className="object-contain" priority />
          </div>
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox!</h2>
          <p className="text-sm text-gray-600 mb-2">
            We sent a verification link to <strong>{registeredEmail}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link to activate your account. Check spam if you don't see it.
          </p>
          <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700 mb-6">
            <p className="font-medium">What happens next?</p>
            <ol className="mt-2 text-left text-brand-600 space-y-1 list-decimal list-inside">
              <li>Verify your office email</li>
              <li>Upload your company ID card</li>
              <li>Admin approves — you're in!</li>
            </ol>
          </div>
          <button
            onClick={async () => { try { await authApi.resendVerification(registeredEmail); } catch {} }}
            className="text-sm text-brand-600 hover:underline mb-4 block w-full"
          >
            Didn't receive it? Resend email
          </button>
          <button
            onClick={() => { setRegistered(false); setDomainHint(''); setStep(0); setForm({ fullName: '', email: '', password: '', companyName: '', employeeId: '' }); }}
            className="text-sm text-gray-500 hover:underline mb-2 block w-full"
          >
            Use a different email
          </button>
          <Link href="/login" className="block w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition text-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image src="/TR_Logo_black.png" alt="TechieRide" width={96} height={96} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join TechieRide — Hyderabad's IT carpool network</p>
          <span className="inline-block mt-1 text-xs text-orange-400 font-medium">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
              <p className={`text-xs mt-1 text-center ${i === step ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{s}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* ── Step 0 — Account ──────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full Name" required>
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
                placeholder="Arjun Mehta" className={inputCls} autoComplete="name" />
            </Field>

            <Field label="Office Email" required hint="Used for account verification. Must be your company email.">
              <input type="email" value={form.email}
                onChange={(e) => { update('email', e.target.value); setDomainHint(''); }}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                className={`${inputCls} ${domainHint ? 'border-orange-400' : ''}`}
                autoComplete="email" />
              {domainHint && <p className="text-xs text-orange-500 mt-1">{domainHint}</p>}
              {!domainHint && form.email.includes('@') && !isDomainPersonal(form.email) && (
                <p className="text-xs text-brand-600 mt-1">✅ Office email accepted</p>
              )}
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${inputCls} pr-10`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
              )}
            </Field>

            <button onClick={nextStep} disabled={!!domainHint}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              Next →
            </button>
          </div>
        )}

        {/* ── Step 1 — Company ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-xl p-3 text-sm text-brand-700">
              <p>You're creating an account for <strong>{form.email}</strong></p>
            </div>

            <Field label="Company Name" required>
              <input value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
                placeholder="TCS, Infosys, Wipro, HCL..." className={inputCls} />
            </Field>

            <Field label="Employee ID" hint="Optional — helps with faster verification">
              <input value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)}
                placeholder="EMP12345 (optional)" className={inputCls} />
            </Field>

            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              After registration you'll verify your email, then upload your company ID card for identity verification. You can add your phone, location and other details after approval.
            </p>

            <div className="flex gap-2">
              <button onClick={() => { setError(''); setStep(0); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">← Back</button>
              <button onClick={submit} disabled={loading}
                className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition">
                {loading ? 'Creating...' : 'Create Account 🚀'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
