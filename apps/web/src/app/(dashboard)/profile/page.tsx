'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { vehiclesApi, verificationApi } from '@/lib/api';
import { EcoLevel } from '@techieride/shared';

const ECO_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  SEED: { icon: '🌱', label: 'Seed', color: 'bg-gray-100 text-gray-700' },
  SPROUT: { icon: '🌿', label: 'Sprout', color: 'bg-green-100 text-green-700' },
  LEAF: { icon: '🍃', label: 'Leaf', color: 'bg-emerald-100 text-emerald-700' },
  TREE: { icon: '🌳', label: 'Tree', color: 'bg-brand-100 text-brand-700' },
  FOREST: { icon: '🌲', label: 'Forest', color: 'bg-brand-600 text-white' },
};

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [verStatus, setVerStatus] = useState<any>(null);
  const [addVehicle, setAddVehicle] = useState(false);
  const [vForm, setVForm] = useState({ make: '', model: '', color: '', plateNumber: '', totalSeats: 4 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    vehiclesApi.getMine().then((r) => setVehicles(r.data));
    verificationApi.getStatus().then((r) => setVerStatus(r.data));
  }, []);

  const submitVehicle = async () => {
    setLoading(true);
    try {
      await vehiclesApi.create(vForm);
      const r = await vehiclesApi.getMine();
      setVehicles(r.data);
      setAddVehicle(false);
    } finally {
      setLoading(false);
    }
  };

  const eco = user?.ecoLevel ? ECO_BADGES[user.ecoLevel] : ECO_BADGES.SEED;
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
            {user?.fullName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.fullName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${eco.color}`}>
              {eco.icon} {eco.label} · {user?.ecoPoints} pts
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Company</p>
            <p className="font-medium text-gray-900">{user?.companyName || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Verification</p>
            <p className={`font-medium ${user?.verificationStatus === 'APPROVED' ? 'text-green-600' : user?.verificationStatus === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>
              {user?.verificationStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Verification */}
      {user?.verificationStatus !== 'APPROVED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">📄 Document Verification</h2>
          {verStatus?.status === 'REJECTED' && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">
              Rejected: {verStatus.rejectionReason}
            </div>
          )}
          <p className="text-sm text-gray-600 mb-3">Submit your Employee ID for verification. Ride Givers also need Driving License + RC.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Employee ID URL (MinIO/uploaded)</label>
              <input placeholder="https://..." className={`${inputCls} mt-1`} id="empId" />
            </div>
            <button
              onClick={async () => {
                const url = (document.getElementById('empId') as HTMLInputElement).value;
                await verificationApi.submit({ employeeIdUrl: url });
                const r = await verificationApi.getStatus();
                setVerStatus(r.data);
              }}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Submit for Review
            </button>
          </div>
        </div>
      )}

      {/* Vehicles */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">🚗 My Vehicles</h2>
          <button onClick={() => setAddVehicle(!addVehicle)} className="text-sm text-brand-600 font-medium hover:underline">
            {addVehicle ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {addVehicle && (
          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
            {[['make', 'Make (e.g. Maruti)'], ['model', 'Model (e.g. Swift)'], ['color', 'Color'], ['plateNumber', 'Plate Number']].map(([k, p]) => (
              <input key={k} placeholder={p} value={(vForm as any)[k]} onChange={(e) => setVForm((f) => ({ ...f, [k]: e.target.value }))} className={inputCls} />
            ))}
            <div>
              <label className="text-xs text-gray-600">Total Seats</label>
              <select value={vForm.totalSeats} onChange={(e) => setVForm((f) => ({ ...f, totalSeats: +e.target.value }))} className={`${inputCls} mt-1`}>
                {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} seats</option>)}
              </select>
            </div>
            <button onClick={submitVehicle} disabled={loading} className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition">
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        )}

        {vehicles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No vehicles added yet</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
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
      </div>
    </div>
  );
}
