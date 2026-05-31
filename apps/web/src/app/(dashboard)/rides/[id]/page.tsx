'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ridesApi, requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const RideMap = dynamic(() => import('@/components/maps/RideMap'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED:  'bg-blue-100 text-blue-700',
  ONGOING:    'bg-green-100 text-green-700',
  COMPLETED:  'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-red-100 text-red-600',
  DRAFT:      'bg-yellow-100 text-yellow-700',
};

const ECO_BADGES: Record<string, string> = {
  SEED: '🌱', SPROUT: '🌿', LEAF: '🍃', TREE: '🌳', FOREST: '🌲',
};

export default function RideDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [showRequestSheet, setShowRequestSheet] = useState(false);
  const [pickupName, setPickupName] = useState('');
  const [dropName, setDropName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    ridesApi.getById(params.id)
      .then(r => setRide(r.data))
      .catch(() => router.push('/rides/search'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const isMyRide = ride?.rideGiver?.userId === user?.id;
  const isSeeker = user?.role === 'RIDE_SEEKER' || user?.role === 'BOTH';
  const alreadyParticipant = ride?.participants?.some((p: any) => p.seeker?.userId === user?.id);

  const requestSeat = async () => {
    setRequesting(true);
    setError('');
    try {
      await requestsApi.create({
        rideId: params.id,
        pickupName: pickupName || undefined,
        dropName: dropName || undefined,
      });
      setRequested(true);
      setShowRequestSheet(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">🚗</div>
          <p className="text-gray-400 text-sm">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (!ride) return null;

  const giver = ride.rideGiver;
  const giverUser = giver?.user;
  const vehicle = ride.vehicle;

  return (
    <div className="space-y-4 max-w-lg pb-24">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition">
        ← Back
      </button>

      {/* Giver card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700">
            {giverUser?.fullName?.[0] || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{giverUser?.fullName}</p>
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">✅ Verified</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">⭐ {giver?.averageRating?.toFixed(1) || '—'}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">{giver?.totalRidesGiven || 0} rides given</span>
              <span className="text-gray-300">·</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                giverUser?.ecoLevel === 'FOREST' ? 'bg-brand-600 text-white' :
                giverUser?.ecoLevel === 'TREE' ? 'bg-brand-100 text-brand-700' :
                'bg-green-50 text-green-700'
              }`}>
                {ECO_BADGES[giverUser?.ecoLevel || 'SEED']} {giverUser?.ecoLevel}
              </span>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>
            {ride.status}
          </span>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <span>🚗</span>
          <span className="text-gray-700 font-medium">{vehicle?.make} {vehicle?.model}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{vehicle?.color}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 font-mono text-xs">{vehicle?.plateNumber}</span>
          {vehicle?.rcVerified && <span className="ml-auto text-xs text-green-600">✅ RC</span>}
        </div>
      </div>

      {/* Route map */}
      <div className="h-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <RideMap
          rides={[]}
          originLat={ride.originLat}
          originLng={ride.originLng}
          destLat={ride.destinationLat}
          destLng={ride.destinationLng}
        />
      </div>

      {/* Ride info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-green-500 mt-0.5">📍</span>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">From</p>
            <p className="text-sm font-medium text-gray-900">{ride.originName}</p>
          </div>
        </div>
        <div className="ml-3 w-px h-4 bg-gray-200 ml-5" />
        <div className="flex items-start gap-3">
          <span className="text-red-500 mt-0.5">🏢</span>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">To</p>
            <p className="text-sm font-medium text-gray-900">{ride.destinationName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-400">Date</p>
            <p className="text-sm font-semibold text-gray-900">{new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Departs</p>
            <p className="text-sm font-semibold text-gray-900">{ride.departureTime}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Seats left</p>
            <p className={`text-sm font-semibold ${ride.availableSeats === 0 ? 'text-red-600' : 'text-brand-600'}`}>
              {ride.availableSeats}/{ride.totalSeats}
            </p>
          </div>
        </div>

        {ride.estimatedDistanceKm && (
          <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span>📏 {ride.estimatedDistanceKm} km</span>
            {ride.estimatedDurationMin && <span>⏱ ~{ride.estimatedDurationMin} min</span>}
          </div>
        )}

        {ride.notes && (
          <div className="bg-amber-50 rounded-lg px-3 py-2 text-sm text-amber-800 border border-amber-100">
            💬 {ride.notes}
          </div>
        )}
      </div>

      {/* Co-passengers */}
      {ride.participants?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            👥 Co-passengers ({ride.participants.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {ride.participants.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                  {p.seeker?.user?.fullName?.[0]}
                </div>
                <span className="text-sm text-gray-700">{p.seeker?.user?.fullName?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions — sticky bottom */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 sm:relative sm:bottom-auto sm:px-0 sm:pb-0 max-w-lg mx-auto">
        {isMyRide ? (
          <div className="flex gap-2">
            {ride.status === 'PUBLISHED' && (
              <>
                <Link href={`/requests?rideId=${params.id}`}
                  className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition shadow">
                  📥 View Requests
                </Link>
                <button
                  onClick={async () => { await ridesApi.start(params.id); router.refresh(); }}
                  className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-700 transition shadow"
                >
                  ▶ Start Ride
                </button>
              </>
            )}
            {ride.status === 'ONGOING' && (
              <Link href={`/tracking/${params.id}?giver=true`}
                className="flex-1 text-center bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 transition shadow">
                📡 Share My Location
              </Link>
            )}
          </div>
        ) : isSeeker && ride.status === 'PUBLISHED' ? (
          <div className="space-y-2">
            {error && <p className="text-xs text-red-600 text-center">{error}</p>}
            {alreadyParticipant ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-green-700 text-sm font-medium">🎉 You're booked on this ride!</p>
                {ride.status === 'ONGOING' && (
                  <Link href={`/tracking/${params.id}`} className="inline-block mt-2 text-xs text-brand-600 font-medium underline">
                    Track live →
                  </Link>
                )}
              </div>
            ) : requested ? (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
                <p className="text-brand-700 text-sm font-medium">⏳ Request sent! Waiting for giver to approve.</p>
              </div>
            ) : ride.availableSeats === 0 ? (
              <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-medium cursor-not-allowed shadow">
                No seats available
              </button>
            ) : (
              <button
                onClick={() => setShowRequestSheet(true)}
                className="w-full bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-700 transition shadow"
              >
                Request a Seat →
              </button>
            )}
          </div>
        ) : ride.status === 'ONGOING' && alreadyParticipant ? (
          <Link href={`/tracking/${params.id}`}
            className="block text-center w-full bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition shadow">
            📍 Track Live
          </Link>
        ) : null}
      </div>

      {/* Request seat sheet */}
      {showRequestSheet && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowRequestSheet(false)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Confirm Seat Request</h3>
              <button onClick={() => setShowRequestSheet(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Custom pickup point (optional)</label>
                <input
                  value={pickupName}
                  onChange={e => setPickupName(e.target.value)}
                  placeholder="e.g. Kondapur Metro Station"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Custom drop point (optional)</label>
                <input
                  value={dropName}
                  onChange={e => setDropName(e.target.value)}
                  placeholder="e.g. Inorbit Mall gate"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              By requesting, you commit to being on time and following community guidelines.
            </p>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              onClick={requestSeat}
              disabled={requesting}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {requesting ? 'Sending...' : 'Send Seat Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
