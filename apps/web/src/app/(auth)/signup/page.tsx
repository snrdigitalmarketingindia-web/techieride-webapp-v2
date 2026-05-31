'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { UserRole, Gender } from '@techieride/shared';

const STEPS = ['Account', 'Work Info', 'Role'];
const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];

function isDomainPersonal(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? PERSONAL_DOMAINS.includes(domain) : false;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [domainHint, setDomainHint] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    gender: Gender.MALE as string,
    companyName: '',
    role: UserRole.RIDE_SEEKER as string,
    phone: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEmailBlur = () => {
    if (!form.email.includes('@')) return;
    if (isDomainPersonal(form.email)) {
      setDomainHint('⚠️ Personal emails are not accepted. Please use your office email.');
    } else {
      setDomainHint('');
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Please enter your full name';
      if (!form.email.includes('@')) return 'Please enter a valid email';
      if (isDomainPersonal(form.email)) return 'Personal emails are not accepted. Use your office email.';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
    }
    if (step === 1) {
      if (!form.companyName.trim()) return 'Please enter your company name';
      if (form.phone.length !== 10) return 'Please enter a valid 10-digit mobile number';
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
    setLoading(true);
    setError('');
    try {
      await authApi.register({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        gender: form.gender,
        companyName: form.companyName.trim(),
        employeeId: 'N/A',
        role: form.role,
        phone: form.phone,
      });
      setRegistered(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success: check your inbox ─────────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="TechieRide" width={140} height={48} className="object-contain" priority />
          </div>
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox!</h2>
          <p className="text-sm text-gray-600 mb-2">
            We sent a verification link to <strong>{form.email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to activate your account. Check your spam folder if you don't see it.
          </p>
          <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700 mb-6">
            <p className="font-medium">📋 Why verify?</p>
            <p className="mt-1 text-brand-600">We confirm your office email to ensure only verified IT employees join TechieRide.</p>
          </div>
          <button
            onClick={async () => {
              try { await authApi.resendVerification(form.email); }
              catch {}
            }}
            className="text-sm text-brand-600 hover:underline mb-4 block w-full"
          >
            Didn't receive it? Resend email
          </button>
          <Link href="/login" className="block w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition text-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image src="/logo.png" alt="TechieRide" width={160} height={54} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join TechieRide — Hyderabad's IT carpool network</p>
          <span className="inline-block mt-1 text-xs text-orange-400 font-medium">v2.0_Beta</span>
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

        {/* Step 0 — Account */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full Name">
              <input
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Arjun Mehta"
                className={inputCls}
                autoComplete="name"
              />
            </Field>

            <Field label="Office Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => { update('email', e.target.value); setDomainHint(''); }}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                className={`${inputCls} ${domainHint ? 'border-orange-400' : ''}`}
                autoComplete="email"
              />
              {domainHint && <p className="text-xs text-orange-500 mt-1">{domainHint}</p>}
              {!domainHint && form.email.includes('@') && !isDomainPersonal(form.email) && (
                <p className="text-xs text-brand-600 mt-1">✅ Office email accepted</p>
              )}
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${inputCls} pr-10`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
              )}
            </Field>

            <Field label="Gender">
              <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className={inputCls}>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </Field>

            <button
              onClick={nextStep}
              disabled={!!domainHint}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 1 — Work Info */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Company Name">
              <input
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                placeholder="TCS, Infosys, Wipro..."
                className={inputCls}
              />
            </Field>
            <Field label="Mobile Number">
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) update('phone', val);
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`${inputCls} rounded-l-none`}
                  autoComplete="tel"
                />
              </div>
              <div className="flex justify-between mt-1">
                {form.phone.length > 0 && form.phone.length < 10 && (
                  <p className="text-xs text-orange-500">{10 - form.phone.length} more digit{10 - form.phone.length !== 1 ? 's' : ''} needed</p>
                )}
                {form.phone.length === 10 && (
                  <p className="text-xs text-brand-600">✅ Valid number</p>
                )}
                <p className="text-xs text-gray-400 ml-auto">{form.phone.length}/10</p>
              </div>
            </Field>
            <div className="flex gap-2">
              <button onClick={() => { setError(''); setStep(0); }} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">← Back</button>
              <button onClick={nextStep} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">Next →</button>
            </div>
          </div>
        )}

        {/* Step 2 — Role */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">I want to:</p>
            {[
              { value: UserRole.RIDE_SEEKER, label: '🧳 Ride Seeker', desc: 'Look for rides offered by verified colleagues' },
              { value: UserRole.RIDE_GIVER,  label: '🚗 Ride Giver',  desc: 'Share your commute with verified colleagues' },
              { value: UserRole.BOTH,        label: '⚡ Both',         desc: 'Offer rides on some days, take rides on others' },
            ].map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={(e) => update('role', e.target.value)} className="mt-1" />
                <div>
                  <div className="font-medium text-gray-900">{r.label}</div>
                  <div className="text-sm text-gray-500">{r.desc}</div>
                </div>
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => { setError(''); setStep(1); }} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">← Back</button>
              <button onClick={submit} disabled={loading} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition">
                {loading ? 'Creating...' : 'Create Account'}
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

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
