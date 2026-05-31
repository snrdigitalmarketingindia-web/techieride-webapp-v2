'use client';

import { useState } from 'react';
import { ridesApi, requestsApi } from '@/lib/api';
import dynamic from 'next/dynamic';

const RideMap = dynamic(() => import('@/components/maps/RideMap'), { ssr: false });

export default function RideSearchPage() {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    originName: '',
    originLat: 17.4401,
    originLng: 78.3489,
    destinationName: '',
    destinationLat: 17.4489,
    destinationLng: 78.3696,
    date: today,
  });
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'list' | 'map'>('list');

  const search = async () => {
    setLoading(true);
    try {
      const { data } = await ridesApi.search({
        originLat: form.originLat,
        originLng: form.originLng,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
        date: form.date,
      });
      setRides(data);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const requestSeat = async (rideId: string) => {
    try {
      await requestsApi.create({ rideId });
      setRequested((prev) => new Set(prev).add(rideId));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to send request');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Find a Ride</h1>

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">📍 Pickup area</label>
            <input
              value={form.originName}
              onChange={(e) => setForm((f) => ({ ...f, originName: e.target.value }))}
              placeholder="Kondapur"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">🏢 Drop area</label>
            <input
              value={form.destinationName}
              onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
              placeholder="HITEC City"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">📅 Date</label>
          <input
            type="date"
            value={form.date}
            min={today}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {loading ? 'Searching...' : '🔍 Search Rides'}
        </button>
      </div>

      {/* View toggle */}
      {rides.length > 0 && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('list')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            📋 List
          </button>
          <button onClick={() => setView('map')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            🗺️ Map
          </button>
        </div>
      )}

      {/* Map view */}
      {view === 'map' && rides.length > 0 && (
        <div className="h-80 rounded-xl overflow-hidden border border-gray-200">
          <RideMap
            rides={rides}
            originLat={form.originLat}
            originLng={form.originLng}
            destLat={form.destinationLat}
            destLng={form.destinationLng}
          />
        </div>
      )}

      {/* Results */}
      {view === 'list' && (
        <div className="space-y-3">
          {rides.length === 0 && !loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-2">🛣️</div>
              <p className="text-gray-500 text-sm">No rides found. Try adjusting your search.</p>
            </div>
          )}
          {rides.map((ride) => (
            <div key={ride.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                      {ride.rideGiver?.user?.fullName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ride.rideGiver?.user?.fullName}</p>
                      <p className="text-xs text-gray-500">⭐ {ride.rideGiver?.averageRating?.toFixed(1) || '—'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{ride.originName} → {ride.destinationName}</p>
                  <p className="text-xs text-gray-500">
                    🕐 {ride.departureTime} · 📍 {ride.distanceFromOriginM}m from pickup
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-brand-700">{ride.availableSeats} seats</p>
                  <p className="text-xs text-gray-400">available</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.make} {ride.vehicle?.model}</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.vehicle?.color}</span>
              </div>

              <button
                onClick={() => requestSeat(ride.id)}
                disabled={requested.has(ride.id) || ride.availableSeats === 0}
                className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                  requested.has(ride.id)
                    ? 'bg-gray-100 text-gray-500'
                    : ride.availableSeats === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {requested.has(ride.id) ? '✅ Request Sent' : ride.availableSeats === 0 ? 'No seats' : 'Request Seat'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
