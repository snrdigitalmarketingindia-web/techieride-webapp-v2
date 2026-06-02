'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ridesApi, vehiclesApi, templatesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const PREFS_KEY = 'tr_ride_prefs';

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
};
const savePrefs = (prefs: object) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
};

// Returns now+1h rounded up to the nearest 15 min as "HH:MM"
const defaultDepartureTime = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  if (m >= 60) { d.setHours(d.getHours() + 1); d.setMinutes(0); }
  else { d.setMinutes(m); }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Returns true if selected date+time is at least 1 hour from now
const isAtLeastOneHourAhead = (date: string, time: string) => {
  const departure = new Date(`${date}T${time}:00`);
  return departure.getTime() - Date.now() >= 60 * 60 * 1000;
};

export default function CreateRidePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isGiver = user?.role === 'RIDE_GIVER';

  useEffect(() => {
    if (user && !isGiver) router.replace('/dashboard');
  }, [user]);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    originName: '',
    originLat: 17.4401,
    originLng: 78.3489,
    destinationName: '',
    destinationLat: 17.4489,
    destinationLng: 78.3696,
    departureDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    departureTime: defaultDepartureTime(),
    totalSeats: 2,
    notes: '',
    womenOnly: false,
    saveAsTemplate: false,
    departureDays: [1, 2, 3, 4, 5],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved prefs client-side (localStorage unavailable during SSR)
  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs.originName || prefs.destinationName) {
      setForm((f) => ({
        ...f,
        originName: prefs.originName ?? f.originName,
        originLat: prefs.originLat ?? f.originLat,
        originLng: prefs.originLng ?? f.originLng,
        destinationName: prefs.destinationName ?? f.destinationName,
        destinationLat: prefs.destinationLat ?? f.destinationLat,
        destinationLng: prefs.destinationLng ?? f.destinationLng,
        departureTime: prefs.departureTime ?? f.departureTime,
      }));
    }
  }, []);

  useEffect(() => {
    vehiclesApi.getMine().then((r) => {
      setVehicles(r.data);
      if (r.data.length > 0) setForm((f) => ({ ...f, vehicleId: r.data[0].id }));
    });
    ridesApi.getGiven('PUBLISHED').then((r) => {
      const active = (r.data || []).find((ride: any) =>
        ['PUBLISHED', 'STARTED'].includes(ride.status)
      );
      if (active) setActiveRide(active);
    });
  }, []);

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.vehicleId) { setError('Please select a vehicle'); return; }
    if (!form.originName || !form.destinationName) { setError('Please fill in origin and destination'); return; }
    if (!isAtLeastOneHourAhead(form.departureDate, form.departureTime)) {
      setError('Departure time must be at least 1 hour from now'); return;
    }
    setLoading(true);
    setError('');
    try {
      const { saveAsTemplate, departureDays, ...ridePayload } = form;
      const { data: ride } = await ridesApi.create(ridePayload);

      if (form.saveAsTemplate) {
        await templatesApi.create({
          vehicleId: form.vehicleId,
          originName: form.originName,
          originLat: form.originLat,
          originLng: form.originLng,
          destinationName: form.destinationName,
          destinationLat: form.destinationLat,
          destinationLng: form.destinationLng,
          departureTime: form.departureTime,
          totalSeats: form.totalSeats,
          departureDays: form.departureDays,
        });
      }

      await ridesApi.publish(ride.id);

      // Save last-used values so they pre-fill next time
      savePrefs({
        originName: form.originName,
        originLat: form.originLat,
        originLng: form.originLng,
        destinationName: form.destinationName,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
        departureTime: form.departureTime,
      });

      router.push('/rides');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">Offer a Ride</h1>

      {activeRide && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ You already have an active ride (<strong>{activeRide.originName} → {activeRide.destinationName}</strong>).
          Complete or cancel it before posting a new one.{' '}
          <Link href={`/rides/${activeRide.id}`} className="font-medium underline">View ride →</Link>
        </div>
      )}

      {vehicles.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ You need to add a vehicle first.{' '}
          <a href="/profile" className="font-medium underline">Add vehicle →</a>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Vehicle</label>
          <select value={form.vehicleId} onChange={(e) => update('vehicleId', e.target.value)} className={`${inputCls} mt-1`}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} · {v.plateNumber}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">📍 From (Pickup area)</label>
            <input value={form.originName} onChange={(e) => update('originName', e.target.value)} placeholder="Kondapur, Hyderabad" className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">🏢 To (Destination)</label>
            <input value={form.destinationName} onChange={(e) => update('destinationName', e.target.value)} placeholder="HITEC City, Hyderabad" className={`${inputCls} mt-1`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">📅 Date</label>
            <input type="date" value={form.departureDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => update('departureDate', e.target.value)} className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">🕐 Departure Time</label>
            <input type="time" value={form.departureTime} onChange={(e) => update('departureTime', e.target.value)} className={`${inputCls} mt-1`} />
            {!isAtLeastOneHourAhead(form.departureDate, form.departureTime) && (
              <p className="text-xs text-red-500 mt-1">⚠️ Must be at least 1 hour from now</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Seats to Offer</label>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => update('totalSeats', n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.totalSeats === n ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="E.g. No music, no smoking" rows={2} className={`${inputCls} mt-1 resize-none`} />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.womenOnly} onChange={(e) => update('womenOnly', e.target.checked)} className="w-4 h-4 text-pink-600" />
          <span className="text-sm text-gray-700">👩 Women-only ride <span className="text-gray-400">(only female passengers allowed)</span></span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.saveAsTemplate} onChange={(e) => update('saveAsTemplate', e.target.checked)} className="w-4 h-4 text-brand-600" />
          <span className="text-sm text-gray-700">Save as recurring commute template (Mon–Fri)</span>
        </label>
      </div>

      <button onClick={submit} disabled={loading || vehicles.length === 0 || !!activeRide}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition">
        {loading ? 'Creating...' : '🚗 Publish Ride'}
      </button>
    </div>
  );
}
