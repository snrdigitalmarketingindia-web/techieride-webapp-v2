'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';

interface Props {
  rideId: string | null;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const BOARDING_COLOR: Record<string, string> = {
  WAITING: 'bg-gray-100 text-gray-600',
  BOARDED: 'bg-blue-100 text-blue-700',
  DEBOARDED: 'bg-green-100 text-green-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function fmt(dt?: string | null) {
  if (!dt) return null;
  return new Date(dt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function TimelineStep({
  label, ts, done, last,
}: { label: string; ts?: string | null; done: boolean; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
        {!last && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>
      <div className="pb-4">
        <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
        {ts && <p className="text-xs text-gray-500">{fmt(ts)}</p>}
      </div>
    </div>
  );
}

export default function RideDetailPanel({ rideId, onClose }: Props) {
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [seekerStats, setSeekerStats] = useState<Record<string, any>>({});
  const [expandedSeeker, setExpandedSeeker] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [trustTimeline, setTrustTimeline] = useState<any[]>([]);
  const [showTrust, setShowTrust] = useState(false);

  useEffect(() => {
    if (!rideId) {
      setRide(null); setRelationships([]); setSeekerStats({});
      setMessages([]); setTrustTimeline([]); setShowTrust(false);
      return;
    }
    setLoading(true);
    adminApi.getRideDetail(rideId)
      .then((r: any) => {
        const data = r.data ?? r;
        setRide(data);
        const giverUserId = data?.rideGiver?.user?.id;
        if (giverUserId) {
          adminApi.getGiverSeekerRelationships(giverUserId)
            .then((res: any) => setRelationships(res.data ?? res))
            .catch(() => {});
          adminApi.getGiverTrustTimeline(giverUserId)
            .then((res: any) => setTrustTimeline(res.data ?? res))
            .catch(() => {});
        }
        // Fetch message history for this ride
        adminApi.getRideMessages(rideId)
          .then((res: any) => setMessages(res.data ?? res))
          .catch(() => {});
      })
      .catch(() => setRide(null))
      .finally(() => setLoading(false));
  }, [rideId]);

  const loadSeekerStats = useCallback(async (userId: string) => {
    if (seekerStats[userId]) {
      setExpandedSeeker(expandedSeeker === userId ? null : userId);
      return;
    }
    try {
      const res = await adminApi.getSeekerStats(userId);
      setSeekerStats((prev) => ({ ...prev, [userId]: res.data ?? res }));
      setExpandedSeeker(userId);
    } catch { /* silently ignore */ }
  }, [seekerStats, expandedSeeker]);

  if (!rideId) return null;

  const giver = ride?.rideGiver?.user;
  const vehicle = ride?.vehicle;
  const participants: any[] = ride?.participants ?? [];
  const requests: any[] = ride?.requests ?? [];
  const ratings: any[] = ride?.ratings ?? [];
  const sos: any[] = ride?.sosEvents ?? [];
  const complaints: any[] = ride?.complaints ?? [];
  const history: any[] = ride?.giverHistory ?? [];

  // Build request map for participant lookup
  const requestMap = Object.fromEntries(requests.map((r: any) => [r.seekerId, r]));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ride 360° View</h2>
            {ride && (
              <p className="text-sm text-gray-500 mt-0.5">
                {ride.originName} → {ride.destinationName}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && ride && (
            <>
              {/* ── Section 1: Ride Summary ── */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ride Summary</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-mono">{ride.id.slice(0, 8)}…</span>
                    <Badge label={ride.status} colorClass={STATUS_COLOR[ride.status] ?? 'bg-gray-100 text-gray-600'} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">From</p>
                      <p className="font-medium text-gray-900">{ride.originName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">To</p>
                      <p className="font-medium text-gray-900">{ride.destinationName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Departure</p>
                      <p className="font-medium text-gray-900">
                        {new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {ride.departureTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Seats</p>
                      <p className="font-medium text-gray-900">{ride.totalSeats - ride.availableSeats} filled / {ride.totalSeats} total</p>
                    </div>
                    {ride.estimatedDistanceKm && (
                      <div>
                        <p className="text-gray-500 text-xs">Distance</p>
                        <p className="font-medium text-gray-900">{ride.estimatedDistanceKm.toFixed(1)} km</p>
                      </div>
                    )}
                    {ride.estimatedDurationMin && (
                      <div>
                        <p className="text-gray-500 text-xs">Est. Duration</p>
                        <p className="font-medium text-gray-900">{ride.estimatedDurationMin} min</p>
                      </div>
                    )}
                    {ride.womenOnly && (
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                          👩 Women-only ride
                        </span>
                      </div>
                    )}
                    {ride.notes && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">Notes</p>
                        <p className="text-gray-700 text-sm">{ride.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Vehicle */}
                  {vehicle && (
                    <div className="border-t pt-3 mt-2">
                      <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                      <p className="text-sm font-medium text-gray-900">
                        {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''} · {vehicle.color}
                      </p>
                      <p className="text-xs text-gray-500">{vehicle.plateNumber}</p>
                      <div className="flex gap-2 mt-1">
                        {vehicle.rcVerified && <Badge label="RC Verified" colorClass="bg-green-100 text-green-700" />}
                        {!vehicle.rcVerified && <Badge label="RC Pending" colorClass="bg-yellow-100 text-yellow-700" />}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Section 2: Timeline ── */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ride Timeline</h3>
                <div className="pl-1">
                  <TimelineStep label="Ride created" ts={ride.createdAt} done={!!ride.createdAt} />
                  <TimelineStep label="Ride published" ts={ride.publishedAt} done={!!ride.publishedAt} />
                  <TimelineStep label="Ride started" ts={ride.startedAt} done={!!ride.startedAt} />
                  {ride.status === 'CANCELLED' ? (
                    <TimelineStep label="Ride cancelled" ts={ride.cancelledAt} done={!!ride.cancelledAt} last />
                  ) : (
                    <TimelineStep label="Ride completed" ts={ride.completedAt} done={!!ride.completedAt} last />
                  )}
                </div>
                {ride.cancelReason && (
                  <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mt-1">Cancel reason: {ride.cancelReason}</p>
                )}
              </section>

              {/* ── Section 3: Giver Profile ── */}
              {giver && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ride Giver</h3>
                  <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-4">
                    {giver.profilePhoto ? (
                      <img src={giver.profilePhoto} alt={giver.fullName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
                        {giver.fullName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{giver.fullName}{giver.trid && <span className="text-xs text-brand-600 font-mono ml-1">({giver.trid})</span>}</p>
                      <p className="text-xs text-gray-500">{giver.email}</p>
                      {giver.phone && <p className="text-xs text-gray-500">{giver.phone}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge label={giver.accountStatus} colorClass={
                          giver.accountStatus === 'DRIVER_VERIFIED' ? 'bg-green-100 text-green-700' :
                          giver.accountStatus === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        } />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          Trust {giver.trustScore ?? 0}
                        </span>
                        {giver.trustBand && (
                          <Badge label={giver.trustBand} colorClass="bg-indigo-100 text-indigo-700" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Giver history */}
                  {history.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Recent rides by this giver</p>
                      <div className="space-y-1.5">
                        {history.map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-gray-700 truncate max-w-[200px]">{h.originName} → {h.destinationName}</span>
                            <Badge label={h.status} colorClass={STATUS_COLOR[h.status] ?? 'bg-gray-100 text-gray-600'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust score timeline toggle */}
                  {trustTimeline.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowTrust((v) => !v)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {showTrust ? '▲ Hide trust timeline' : `▼ Trust score timeline (${trustTimeline.length} events)`}
                      </button>
                      {showTrust && (
                        <div className="mt-2 space-y-1">
                          {trustTimeline.slice(-15).map((e: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate max-w-[200px]">
                                {e.eventType.replace(/_/g, ' ')}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-medium ${e.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {e.delta >= 0 ? '+' : ''}{e.delta}
                                </span>
                                <span className="text-gray-400">→ {e.scoreAfter}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ── Section 4: Participants ── */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Participants ({participants.length})
                </h3>
                {participants.length === 0 ? (
                  <p className="text-sm text-gray-400">No confirmed participants.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p: any) => {
                      const u = p.seeker?.user;
                      const req = requestMap[p.seekerId];
                      return (
                        <div key={p.id} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                          {u?.profilePhoto ? (
                            <img src={u.profilePhoto} alt={u.fullName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
                              {u?.fullName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900">{u?.fullName ?? '—'}{u?.trid && <span className="text-xs text-brand-600 font-mono ml-1">({u.trid})</span>}</p>
                              <Badge label={p.boardingStatus} colorClass={BOARDING_COLOR[p.boardingStatus] ?? 'bg-gray-100 text-gray-600'} />
                            </div>
                            <p className="text-xs text-gray-500">{u?.email}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                              {p.pickupName && <span>Pickup: {p.pickupName} {p.pickupTime && `@ ${p.pickupTime}`}</span>}
                              {p.dropName && <span>Drop: {p.dropName}</span>}
                              {p.boardedAt && <span>Boarded: {fmt(p.boardedAt)}</span>}
                              {p.deboardedAt && <span>Deboarded: {fmt(p.deboardedAt)}</span>}
                            </div>
                            {/* Rating given/received */}
                            {u && (() => {
                              const given = ratings.find((r: any) => r.raterId === u.id);
                              const received = ratings.find((r: any) => r.rateeId === u.id);
                              if (!given && !received) return null;
                              return (
                                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                  {given && <span>Rated giver: {'⭐'.repeat(given.score)}</span>}
                                  {received && <span>Giver rated them: {'⭐'.repeat(received.score)}</span>}
                                </div>
                              );
                            })()}

                            {/* Seeker stats expand */}
                            {u && (
                              <div className="mt-2">
                                <button
                                  onClick={() => loadSeekerStats(u.id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  {expandedSeeker === u.id ? '▲ Hide stats' : '▼ Seeker stats'}
                                </button>
                                {expandedSeeker === u.id && seekerStats[u.id] && (() => {
                                  const s = seekerStats[u.id];
                                  return (
                                    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2.5 space-y-1.5 text-xs">
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                          <p className="text-gray-400">Total rides</p>
                                          <p className="font-bold text-gray-800">{s.totalRides}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">No-shows</p>
                                          <p className={`font-bold ${s.noShows > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {s.noShows} ({s.noShowRate}%)
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">Complaints</p>
                                          <p className={`font-bold ${s.complaints > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {s.complaints}
                                          </p>
                                        </div>
                                      </div>
                                      {s.trustEvents?.length > 0 && (
                                        <div className="border-t pt-1.5">
                                          <p className="text-gray-400 mb-1">Recent trust events</p>
                                          {s.trustEvents.slice(0, 3).map((e: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between">
                                              <span className="text-gray-600 truncate">{e.eventType.replace(/_/g, ' ')}</span>
                                              <span className={`font-medium ${e.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {e.delta >= 0 ? '+' : ''}{e.delta} → {e.scoreAfter}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending / cancelled requests */}
                {requests.filter((r: any) => r.status !== 'CONFIRMED').length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1.5">Other requests</p>
                    <div className="space-y-1.5">
                      {requests.filter((r: any) => r.status !== 'CONFIRMED').map((r: any) => {
                        const u = r.seeker?.user;
                        return (
                          <div key={r.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-gray-700">{u?.fullName ?? '—'}{u?.trid && <span className="text-xs text-brand-600 font-mono ml-1">({u.trid})</span>}</span>
                            <div className="flex items-center gap-2">
                              {r.cancelReason && <span className="text-gray-400 truncate max-w-[100px]">{r.cancelReason}</span>}
                              <Badge
                                label={r.status}
                                colorClass={
                                  r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  r.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                                  'bg-gray-100 text-gray-600'
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Section 5: SOS Events ── */}
              {sos.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    🆘 SOS Events ({sos.length})
                  </h3>
                  <div className="space-y-2">
                    {sos.map((s: any) => (
                      <div key={s.id} className="bg-red-50 rounded-xl p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <Badge label={s.status ?? 'TRIGGERED'} colorClass="bg-red-100 text-red-700" />
                          <span className="text-xs text-gray-500">{fmt(s.triggeredAt)}</span>
                        </div>
                        {s.lat && s.lng && (
                          <p className="text-xs text-gray-500 mt-1">Location: {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Section 6: Complaints ── */}
              {complaints.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    ⚠️ Complaints ({complaints.length})
                  </h3>
                  <div className="space-y-2">
                    {complaints.map((c: any) => (
                      <div key={c.id} className="bg-orange-50 rounded-xl p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{c.reason}</span>
                          <Badge label={c.status} colorClass={
                            c.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                            c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          } />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reported by {c.reporter?.fullName ?? '—'}{c.reporter?.trid && <span className="text-xs text-brand-600 font-mono ml-1">({c.reporter.trid})</span>} · {fmt(c.createdAt)}
                        </p>
                        {c.description && <p className="text-xs text-gray-700 mt-1">{c.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Section 7: Travel Relationships ── */}
              {relationships.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    🔁 Regular Travel Pairs
                  </h3>
                  <div className="space-y-2">
                    {relationships.map((rel: any, i: number) => {
                      const u = rel.seeker?.user;
                      if (!u) return null;
                      const strength = rel.rideCount >= 5 ? { label: 'Regular', color: 'bg-green-100 text-green-700' }
                        : rel.rideCount >= 2 ? { label: 'Occasional', color: 'bg-blue-100 text-blue-700' }
                        : { label: 'Once', color: 'bg-gray-100 text-gray-500' };
                      return (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt={u.fullName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                              {u.fullName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}{u.trid && <span className="text-xs text-brand-600 font-mono ml-1">({u.trid})</span>}</p>
                            <p className="text-xs text-gray-500">
                              {rel.rideCount} ride{rel.rideCount !== 1 ? 's' : ''} together ·{' '}
                              {new Date(rel.firstRide).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {' '}–{' '}
                              {new Date(rel.lastRide).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <Badge label={strength.label} colorClass={strength.color} />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Section 8: Quick Messages ── */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  💬 Quick Messages {messages.length > 0 && `(${messages.length})`}
                </h3>
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400">No messages logged for this ride yet. Messages sent going forward will appear here.</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m: any) => {
                      const isGiverMsg = m.senderId === ride?.rideGiver?.user?.id;
                      return (
                        <div key={m.id} className={`flex gap-2.5 ${isGiverMsg ? '' : 'flex-row-reverse'}`}>
                          {m.sender?.profilePhoto ? (
                            <img src={m.sender.profilePhoto} alt={m.sender.fullName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                          ) : (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isGiverMsg ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {m.sender?.fullName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div className={`max-w-[75%] ${isGiverMsg ? '' : 'items-end flex flex-col'}`}>
                            <div className={`rounded-2xl px-3 py-2 text-sm ${isGiverMsg ? 'bg-blue-50 text-blue-900 rounded-tl-sm' : 'bg-green-50 text-green-900 rounded-tr-sm'}`}>
                              {m.messageText}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 px-1">
                              {m.sender?.fullName?.split(' ')[0]} · {fmt(m.sentAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {!loading && !ride && rideId && (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Failed to load ride details.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
