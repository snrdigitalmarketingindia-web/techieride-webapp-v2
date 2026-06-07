'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContactCard } from '@/components/ui/ContactCard';
import dynamic from 'next/dynamic';
import { ridesApi, requestsApi, ratingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const BOARDING_COLORS: Record<string, string> = {
  WAITING:   'bg-yellow-100 text-yellow-700',
  BOARDED:   'bg-blue-100 text-blue-700',
  DEBOARDED: 'bg-green-100 text-green-700',
  NO_SHOW:   'bg-red-100 text-red-600',
};

const BOARDING_LABELS: Record<string, string> = {
  WAITING: '⏳ Waiting', BOARDED: '🚗 Boarded', DEBOARDED: '✅ Deboarded', NO_SHOW: '❌ No Show',
};

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

const TRUST_BAND: Record<string, { icon: string; color: string }> = {
  NEW:      { icon: '🆕', color: 'bg-gray-100 text-gray-600' },
  BRONZE:   { icon: '🥉', color: 'bg-orange-100 text-orange-700' },
  SILVER:   { icon: '🥈', color: 'bg-slate-100 text-slate-700' },
  GOLD:     { icon: '🥇', color: 'bg-yellow-100 text-yellow-700' },
  PLATINUM: { icon: '💎', color: 'bg-purple-100 text-purple-700' },
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ id: string; name: string } | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState<Record<string, boolean>>({});

  const reloadRide = () =>
    ridesApi.getById(params.id).then(r => setRide(r.data)).catch(() => {});

  const reloadPending = () =>
    requestsApi.getIncoming(params.id)
      .then(res => setPendingRequests((res.data ?? []).filter((r: any) => r.status === 'PENDING')))
      .catch(() => {});

  useEffect(() => {
    ridesApi.getById(params.id)
      .then(r => setRide(r.data))
      .catch(() => router.push('/rides/search'))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (ride?.rideGiver?.userId === user?.id && ride?.status === 'PUBLISHED') {
      reloadPending();
    }
  }, [ride?.id, user?.id]);

  const handleNoShow = async (seekerUserId: string) => {
    setActionLoading(`noshow-${seekerUserId}`);
    setError('');
    try {
      await ridesApi.markNoShow(params.id, seekerUserId);
      await reloadRide();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to mark no-show');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    setActionLoading('complete');
    setError('');
    try {
      await ridesApi.complete(params.id);
      await reloadRide();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to complete ride');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBoard = async () => {
    setActionLoading('board');
    setError('');
    try {
      await ridesApi.board(params.id);
      await reloadRide();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to board');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeboard = async () => {
    setActionLoading('deboard');
    setError('');
    try {
      await ridesApi.deboard(params.id);
      await reloadRide();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to deboard');
    } finally {
      setActionLoading(null);
    }
  };

  const openRating = (id: string, name: string) => {
    setRatingTarget({ id, name });
    setRatingScore(0);
    setRatingComment('');
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!ratingTarget || ratingScore < 1) return;
    setRatingSubmitting(true);
    try {
      await ratingsApi.submit({ rideId: params.id, rateeId: ratingTarget.id, score: ratingScore, comment: ratingComment || undefined });
      setRatingDone(prev => ({ ...prev, [ratingTarget.id]: true }));
      setShowRatingModal(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleApproveRequest = async (reqId: string) => {
    setActionLoading(`approve-${reqId}`);
    try {
      await requestsApi.approve(reqId);
      await Promise.all([reloadRide(), reloadPending()]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    setActionLoading(`reject-${reqId}`);
    try {
      await requestsApi.reject(reqId, rejectReason || undefined);
      setRejectingReqId(null);
      setRejectReason('');
      await reloadPending();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const isMyRide = ride?.rideGiver?.userId === user?.id;
  const isSeeker = user?.role === 'RIDE_SEEKER' || user?.role === 'RIDE_GIVER' || user?.role === 'ADMIN';
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
              {giverUser?.trustBand && (() => {
                const tb = TRUST_BAND[giverUser.trustBand] ?? TRUST_BAND.NEW;
                return (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tb.color}`}>
                    {tb.icon} {giverUser.trustBand}
                  </span>
                );
              })()}
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>
            {ride.status}
          </span>
        </div>

        {/* Direct calling */}
        {giverUser?.phone && !isMyRide && (
          <ContactCard
            userId={giver?.userId || ''}
            name={giverUser.fullName}
            company={giverUser.companyName}
            phone={giverUser.phone}
            countryCode={giverUser.countryCode}
            rating={giver?.averageRating}
            totalRides={giver?.totalRidesGiven}
            role="RIDE_GIVER"
            rideId={ride.id}
            variant="compact"
          />
        )}

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
            <p className="text-sm font-semibold text-gray-900">{new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</p>
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

      {/* Pending seat requests — giver only, PUBLISHED ride */}
      {isMyRide && ride.status === 'PUBLISHED' && pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-700 mb-3">
            📥 Pending Requests ({pendingRequests.length})
          </p>
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                    {req.seeker?.user?.fullName?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {req.seeker?.user?.fullName ?? 'Seeker'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {req.seeker?.user?.companyName ?? ''}
                      {req.pickupName ? ` · 📍 ${req.pickupName}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproveRequest(req.id)}
                    disabled={actionLoading === `approve-${req.id}` || actionLoading === `reject-${req.id}`}
                    className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0"
                  >
                    {actionLoading === `approve-${req.id}` ? '…' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => { setRejectingReqId(req.id); setRejectReason(''); }}
                    disabled={!!actionLoading}
                    className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0"
                  >
                    ❌ Reject
                  </button>
                </div>
                {rejectingReqId === req.id && (
                  <div className="flex gap-2 pl-11">
                    <input
                      autoFocus
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 text-xs px-2.5 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      disabled={actionLoading === `reject-${req.id}`}
                      className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 shrink-0"
                    >
                      {actionLoading === `reject-${req.id}` ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setRejectingReqId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants / boarding status */}
      {ride.participants?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            👥 Passengers ({ride.participants.length})
          </p>
          <div className="space-y-2">
            {ride.participants.map((p: any) => {
              const name = p.seeker?.user?.fullName || 'Unknown';
              const seekerUserId = p.seeker?.userId;
              const status: string = p.boardingStatus || 'WAITING';
              return (
                <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    {p.pickupName && <p className="text-xs text-gray-400 truncate">📍 {p.pickupName}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${BOARDING_COLORS[status]}`}>
                    {BOARDING_LABELS[status]}
                  </span>
                  {isMyRide && ride.status === 'ONGOING' && status === 'WAITING' && (
                    <button
                      onClick={() => handleNoShow(seekerUserId)}
                      disabled={actionLoading === `noshow-${seekerUserId}`}
                      className="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 disabled:opacity-50 shrink-0"
                    >
                      {actionLoading === `noshow-${seekerUserId}` ? '…' : 'No Show'}
                    </button>
                  )}
                </div>
              );
            })}
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
            {ride.status === 'ONGOING' && (() => {
              const allResolved = ride.participants?.every(
                (p: any) => p.boardingStatus === 'DEBOARDED' || p.boardingStatus === 'NO_SHOW'
              ) ?? true;
              const hasUnresolved = ride.participants?.some(
                (p: any) => p.boardingStatus === 'WAITING' || p.boardingStatus === 'BOARDED'
              );
              return (
                <div className="flex gap-2 w-full">
                  <Link href={`/tracking/${params.id}?giver=true`}
                    className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition shadow">
                    📡 Location
                  </Link>
                  <button
                    onClick={handleComplete}
                    disabled={!allResolved || actionLoading === 'complete'}
                    title={hasUnresolved ? 'All passengers must deboard or be marked no-show first' : ''}
                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow"
                  >
                    {actionLoading === 'complete' ? '…' : allResolved ? '✅ Complete Ride' : '🔒 Complete Ride'}
                  </button>
                </div>
              );
            })()}
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
        ) : ride.status === 'ONGOING' && alreadyParticipant ? (() => {
          const myParticipant = ride.participants?.find((p: any) => p.seeker?.userId === user?.id);
          const myStatus: string = myParticipant?.boardingStatus || 'WAITING';
          return (
            <div className="space-y-2">
              {error && <p className="text-xs text-red-600 text-center">{error}</p>}
              <div className="flex gap-2">
                <Link href={`/tracking/${params.id}`}
                  className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition shadow">
                  📍 Track
                </Link>
                {myStatus === 'WAITING' && (
                  <button
                    onClick={handleBoard}
                    disabled={actionLoading === 'board'}
                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition shadow"
                  >
                    {actionLoading === 'board' ? '…' : '🚗 I\'ve Boarded'}
                  </button>
                )}
                {myStatus === 'BOARDED' && (
                  <button
                    onClick={handleDeboard}
                    disabled={actionLoading === 'deboard'}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow"
                  >
                    {actionLoading === 'deboard' ? '…' : '✅ I\'ve Arrived'}
                  </button>
                )}
                {(myStatus === 'DEBOARDED' || myStatus === 'NO_SHOW') && (
                  <div className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl text-sm font-medium text-center">
                    {BOARDING_LABELS[myStatus]}
                  </div>
                )}
              </div>
            </div>
          );
        })() : null}
      </div>

      {/* Rate participants — shown on COMPLETED rides */}
      {ride.status === 'COMPLETED' && user && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">⭐ Rate your ride</h3>
          {/* Seeker rates the giver */}
          {!isMyRide && alreadyParticipant && ride.rideGiver?.userId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rate {ride.rideGiver?.user?.fullName?.split(' ')[0] ?? 'Giver'} (Ride Giver)</span>
              {ratingDone[ride.rideGiver.userId] ? (
                <span className="text-xs text-green-600 font-medium">✅ Rated</span>
              ) : (
                <button onClick={() => openRating(ride.rideGiver.userId, ride.rideGiver?.user?.fullName ?? 'Giver')}
                  className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                  Rate
                </button>
              )}
            </div>
          )}
          {/* Giver rates each seeker */}
          {isMyRide && ride.participants?.map((p: any) => (
            <div key={p.seeker?.userId} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{p.seeker?.user?.fullName ?? 'Passenger'}</span>
              {ratingDone[p.seeker?.userId] ? (
                <span className="text-xs text-green-600 font-medium">✅ Rated</span>
              ) : (
                <button onClick={() => openRating(p.seeker.userId, p.seeker?.user?.fullName ?? 'Passenger')}
                  className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition">
                  Rate
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
      {/* Rating modal */}
      {showRatingModal && ratingTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setShowRatingModal(false)}>
          <div className="bg-white rounded-t-2xl w-full p-6 space-y-4 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Rate {ratingTarget.name}</h3>
              <button onClick={() => setShowRatingModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRatingScore(star)}
                  className={`text-3xl transition ${star <= ratingScore ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
                  ★
                </button>
              ))}
            </div>
            {ratingScore > 0 && (
              <p className="text-center text-xs text-gray-500">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][ratingScore]}
              </p>
            )}
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={submitRating}
              disabled={ratingScore < 1 || ratingSubmitting}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
