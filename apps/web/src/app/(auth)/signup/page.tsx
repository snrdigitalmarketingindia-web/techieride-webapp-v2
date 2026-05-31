'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { UserRole, Gender } from '@techieride/shared';

const STEPS = ['Account', 'Work Info', 'Role'];

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState(0);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    phone: '',
    email: '',
    fullName: '',
    gender: Gender.MALE,
    companyName: '',
    employeeId: '',
    role: UserRole.RIDE_SEEKER,
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.register(form);
      setOtpStep(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await login(form.phone, otp);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (otpStep) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📱</div>
            <h2 className="text-xl font-bold text-gray-900">Verify your phone</h2>
            <p className="text-sm text-gray-500 mt-1">OTP sent to +91 {form.phone}</p>
          </div>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • • • •"
            className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image src="/logo.png" alt="Techieride" width={160} height={54} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join Techieride — Hyderabad's IT carpool network</p>
          <span className="inline-block mt-1 text-xs text-orange-400 font-medium">v2.0_Beta</span>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
              <p className={`text-xs mt-1 text-center ${i === step ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{s}</p>
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full Name">
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Arjun Mehta" className={input} />
            </Field>
            <Field label="Phone">
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">+91</span>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" className={`${input} rounded-l-none`} />
              </div>
            </Field>
            <Field label="Work Email">
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="arjun@company.com" className={input} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className={input}>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </Field>
            <button onClick={() => setStep(1)} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
              Next →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Company Name">
              <input value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="TCS, Infosys, etc." className={input} />
            </Field>
            <Field label="Employee ID">
              <input value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)} placeholder="EMP-12345" className={input} />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">← Back</button>
              <button onClick={() => setStep(2)} className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">I want to:</p>
            {[
              { value: UserRole.RIDE_SEEKER, label: '🧳 Find rides', desc: 'Look for rides offered by verified colleagues' },
              { value: UserRole.RIDE_GIVER, label: '🚗 Offer rides', desc: 'Share your commute with verified colleagues' },
              { value: UserRole.BOTH, label: '⚡ Both', desc: 'Offer rides on some days, take rides on others' },
            ].map((r) => (
              <label key={r.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={(e) => update('role', e.target.value)} className="mt-1" />
                <div>
                  <div className="font-medium text-gray-900">{r.label}</div>
                  <div className="text-sm text-gray-500">{r.desc}</div>
                </div>
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">← Back</button>
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

const input = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
