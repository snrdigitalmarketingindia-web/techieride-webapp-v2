'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const STEPS = ['Account', 'Company'];

const BLOCKED_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'outlook.com','hotmail.com','hotmail.co.in','hotmail.co.uk','live.com','live.in','msn.com',
  'yahoo.com','yahoo.co.in','yahoo.co.uk','ymail.com','rocketmail.com',
  'icloud.com','me.com','mac.com',
  'rediffmail.com','rediff.com','indiatimes.com','sify.com',
  'protonmail.com','proton.me','tutanota.com','aol.com','mail.com',
  'gmx.com','gmx.net','fastmail.com','yandex.com','mail.ru',
]);
function isDomainPersonal(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? BLOCKED_DOMAINS.has(domain) : false;
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
  const { login: storeLogin } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [domainHint, setDomainHint] = useState('');
  const [domainValid, setDomainValid] = useState(false);
  const [domainChecking, setDomainChecking] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    employeeId: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleEmailBlur = async () => {
    if (!form.email.includes('@')) return;
    if (isDomainPersonal(form.email)) {
      setDomainHint('⚠️ Personal emails are not accepted. Please use your office email.');
      setDomainValid(false);
      return;
    }
    setDomainChecking(true);
    setDomainHint('');
    setDomainValid(false);
    try {
      const res = await authApi.checkDomain(form.email);
      if (res.data.valid) {
        setDomainValid(true);
        setDomainHint('');
      } else {
        setDomainHint(`⚠️ ${res.data.reason}`);
        setDomainValid(false);
      }
    } catch {
      // network error — allow form to proceed, backend will validate
      setDomainValid(true);
    } finally {
      setDomainChecking(false);
    }
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Please enter your full name';
      if (!form.email.includes('@')) return 'Please enter a valid office email';
      if (isDomainPersonal(form.email)) return 'Personal emails are not accepted. Use your office email.';
      if (domainChecking) return 'Please wait while we verify your email domain.';
      if (!domainValid && form.email.includes('@') && !isDomainPersonal(form.email)) return 'We could not verify this email domain. Please use a valid company email.';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
      if (!form.phone.trim()) return 'Please enter your mobile number';
      if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return 'Enter a valid 10-digit Indian mobile number (starting with 6–9)';
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
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        employeeId: form.employeeId.trim() || undefined,
      });
      // Auto-login after registration so the user has a session token.
      // This lets them navigate to /exception-verification directly from
      // the "Check your inbox" screen if they can't access their company email.
      // The EmailVerifiedGuard + DashboardLayout guard ensure they can only
      // reach /exception-verification — all other dashboard pages are blocked.
      await storeLogin(form.email.toLowerCase().trim(), form.password).catch(() => {});
      setRegisteredEmail(form.email.toLowerCase().trim());
      setRegistered(true);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      // Filter out raw class-validator noise like "phone must be a string"
      const clean = Array.isArray(msg)
        ? msg.filter((m: string) => !/must be a string|must be a number/i.test(m)).join(', ')
        : msg;
      setError(clean || 'Registration failed. Please try again.');
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
            <p className="font-medium mb-2">What happens next?</p>
            <ol className="text-left text-brand-600 space-y-2 list-decimal list-inside">
              <li>Verify your office email</li>
              <li>Login with your official email</li>
              <li>Upload your company ID card</li>
              <li>Admin approves — you're in!</li>
            </ol>
          </div>
          <button
            onClick={async () => { try { await authApi.resendVerification(registeredEmail); } catch {} }}
            className="w-full border border-brand-500 text-brand-600 bg-brand-50 hover:bg-brand-100 text-sm font-semibold py-2.5 rounded-lg transition mb-6"
          >
            📩 Didn't receive it? Resend verification link
          </button>
          {/* Exception request — for users who genuinely can't access their company email */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left">
            <p className="text-sm font-semibold text-orange-800 mb-1">🚫 Can't access your company email?</p>
            <p className="text-xs text-orange-700 mb-3">
              If your company blocks external emails or you don't have individual access, request a manual exception — an admin will verify you directly.
            </p>
            <Link
              href="/exception-verification"
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Request Admin Exception →
            </Link>
          </div>
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
          <span className="inline-block mt-1 text-xs text-orange-400 font-medium">v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_APP_COMMIT}</span>
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
                onChange={(e) => { update('email', e.target.value); setDomainHint(''); setDomainValid(false); }}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                className={`${inputCls} ${domainHint ? 'border-orange-400' : ''}`}
                autoComplete="email" />
              {domainChecking && <p className="text-xs text-gray-400 mt-1">⏳ Checking domain...</p>}
              {!domainChecking && domainHint && <p className="text-xs text-orange-500 mt-1">{domainHint}</p>}
              {!domainChecking && !domainHint && domainValid && (
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

            <Field label="Mobile Number" required hint="10-digit Indian number (e.g. 98765 43210)">
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                  🇮🇳 +91
                </span>
                <input
                  type="tel" inputMode="numeric" maxLength={10}
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className={`${inputCls} rounded-l-none`}
                  autoComplete="tel-national"
                />
              </div>
              {form.phone.length > 0 && !/^[6-9]\d{9}$/.test(form.phone) && (
                <p className="text-xs text-red-500 mt-1">Must be a 10-digit number starting with 6–9</p>
              )}
              {/^[6-9]\d{9}$/.test(form.phone) && (
                <p className="text-xs text-brand-600 mt-1">✅ Valid mobile number</p>
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
