'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = (showPending: boolean) => {
    setLoading(true);
    adminApi.listVehicles(showPending)
      .then((r) => setVehicles(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter === 'pending'); }, [filter]);

  const verify = async (id: string) => {
    setProcessing(id);
    try {
      await adminApi.verifyVehicle(id);
      setVehicles((v) => v.map((x) => x.id === id ? { ...x, rcVerified: true } : x));
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (id: string) => {
    setProcessing(id);
    try {
      await adminApi.rejectVehicle(id);
      setVehicles((v) => v.map((x) => x.id === id ? { ...x, rcVerified: false } : x));
    } finally {
      setProcessing(null);
    }
  };

  const pending = vehicles.filter((v) => !v.rcVerified);
  const verified = vehicles.filter((v) => v.rcVerified);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle RC Verification</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition ${filter === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Pending {filter === 'pending' && `(${pending.length})`}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition ${filter === 'all' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            All Vehicles
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-500">{filter === 'pending' ? 'No vehicles pending RC verification.' : 'No vehicles found.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((veh) => (
            <div key={veh.id} className={`bg-white rounded-xl border p-5 ${!veh.rcVerified ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{veh.make} {veh.model} · {veh.color}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${veh.rcVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {veh.rcVerified ? '✅ RC Verified' : '⏳ RC Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Plate: <span className="font-mono font-medium">{veh.plateNumber}</span> · {veh.totalSeats} seats</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Giver: <span className="font-medium">{veh.rideGiver?.user?.fullName}</span> · {veh.rideGiver?.user?.email}
                  </p>
                  {/* Show what RC was parsed as — so admin can cross-check the physical document */}
                  {veh.rcParsedData && (
                    <div className="mt-1 text-xs text-gray-400">
                      RC reads: {[veh.rcParsedData.make, veh.rcParsedData.model, veh.rcParsedData.plateNumber, veh.rcParsedData.color].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {veh.rcUrl ? (
                  <a
                    href={veh.rcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition"
                  >
                    📄 View RC Document
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">No RC document uploaded yet</span>
                )}

                {!veh.rcVerified ? (
                  <>
                    <button
                      onClick={() => verify(veh.id)}
                      disabled={processing === veh.id}
                      className="ml-auto bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {processing === veh.id ? '...' : '✅ Approve RC'}
                    </button>
                    <button
                      onClick={() => reject(veh.id)}
                      disabled={processing === veh.id}
                      className="bg-red-50 text-red-700 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition"
                    >
                      ❌ Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => reject(veh.id)}
                    disabled={processing === veh.id}
                    className="ml-auto text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                  >
                    Revoke RC
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
