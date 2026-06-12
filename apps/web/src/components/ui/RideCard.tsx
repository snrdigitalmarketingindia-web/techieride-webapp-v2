'use client';

import { FEATURES } from '@/lib/featureFlags';
import { useState } from 'react';
import Link from 'next/link';
import { CallButton } from './CallButton';
import { ReportUserModal } from './ReportUserModal';
import { haversineMeters, formatDistance, estimatePickupTime } from '@/lib/geo';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING:   'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT:     'bg-yellow-100 text-yellow-700',
};

const BOARDING_BADGE: Record<string, { label: string; cls: string }> = {
  BOARDED:   { label: '✅ Boarded',   cls: 'bg-green-100 text-green-700' },
  DEBOARDED: { label: '🏁 Deboarded', cls: 'bg-gray-100 text-gray-500'   },
  NO_SHOW:   { label: '👻 No-show',   cls: 'bg-red-100 text-red-500'     },
};

/** WAITING means different things depending on whether the ride has started */
function waitingBadge(rideStatus: string) {
  return rideStatus === 'ONGOING'
    ? { label: '⏳ Yet to board', cls: 'bg-amber-100 text-amber-700' }
    : { label: '✅ Seat Confirmed', cls: 'bg-green-100 text-green-700' };
}

interface RideCardProps {
  ride: any;
  /** 'giver' — you own the ride; 'seeker' — you joined the ride; 'browse' — search results */
  viewAs: 'giver' | 'seeker' | 'browse';
  /** Extra action buttons rendered below the header */
  actions?: React.ReactNode;
  /**
   * Per-participant inline actions rendered directly on each passenger row.
   * Keyed by rideParticipant.id. Used to place No-Show buttons inline
   * instead of repeating the passenger in a separate warning section below.
   */
  participantActions?: Record<string, React.ReactNode>;
}

export function RideCard({ ride, viewAs, actions, participantActions }: RideCardProps) {
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const participants: any[] = ride.participants ?? [];
  const dateStr = ride.departureDate
    ? new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
    : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">

      {/* ── Ride header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            {ride.originName} → {ride.destinationName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            📅 {dateStr} · 🕐 {ride.departureTime}
            {ride.vehicle && ` · ${ride.vehicle.make} ${ride.vehicle.model}`}
          </p>
          {/* Mobile: badges below route */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1 sm:hidden">
            {ride.womenOnly && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-pink-100 text-pink-700">👩 Women only</span>
            )}
            {ride.totalSeats != null && (
              <span className="text-xs text-gray-400">{ride.availableSeats}/{ride.totalSeats} seats</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {ride.status}
            </span>
            <Link href={`/rides/${ride.id}`} className="text-xs text-brand-600 font-medium hover:underline">View →</Link>
          </div>
        </div>
        {/* Desktop: badges on right side */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {ride.womenOnly && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-pink-100 text-pink-700">
              👩 Women only
            </span>
          )}
          {ride.totalSeats != null && (
            <span className="text-xs text-gray-400">
              {ride.availableSeats}/{ride.totalSeats} seats
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {ride.status}
          </span>
          <Link href={`/rides/${ride.id}`} className="text-xs text-brand-600 font-medium hover:underline">
            View →
          </Link>
        </div>
      </div>

      {/* ── Seeker view: giver contact ───────────────── */}
      {viewAs === 'seeker' && ride.rideGiver?.user && (
        <div className="border-t border-gray-100 pt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
            {ride.rideGiver.user.fullName?.[0] ?? '🚗'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">
              {ride.rideGiver.user.fullName}
              <span className="text-gray-400 font-normal"> · Ride Giver</span>
            </p>
          </div>
          {ride.rideGiver.user.phone && (
            <CallButton
              phone={ride.rideGiver.user.phone}
              countryCode={ride.rideGiver.user.countryCode}
              receiverId={ride.rideGiver.userId}
              rideId={ride.id}
              label="Call"
              size="sm"
              variant="ghost"
            />
          )}
          {['ONGOING', 'COMPLETED'].includes(ride.status) && (
            <button
              onClick={() => setReportTarget({ id: ride.rideGiver.userId, name: ride.rideGiver.user.fullName })}
              className="text-xs text-red-500 hover:text-red-700 hover:underline shrink-0"
              title="Report this user"
            >
              🚩 Report
            </button>
          )}
        </div>
      )}

      {/* ── Giver / seeker view: all participants ────── */}
      {(viewAs === 'giver' || viewAs === 'seeker') && participants.length > 0 && (
        <div className="border-t border-gray-100 pt-2 space-y-1.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            👥 Passengers ({participants.length})
          </p>
          {participants.map((p: any) => {
            const name      = p.seeker?.user?.fullName ?? 'Seeker';
            const company   = p.seeker?.user?.companyName;
            const phone     = p.seeker?.user?.phone;
            const cc        = p.seeker?.user?.countryCode;
            const recvId    = p.seeker?.userId;
            // Seat-status badge (Seat Confirmed / Yet to board) always shows;
            // true attendance badges (Boarded/Deboarded/No-show) are feature-gated.
            const badge     = p.boardingStatus === 'WAITING' || !FEATURES.ATTENDANCE_TRACKING_ENABLED
              ? waitingBadge(ride.status)
              : BOARDING_BADGE[p.boardingStatus];
            const noShow    = p.boardingStatus === 'NO_SHOW';
            // Pickup info — prefer request coords, fallback to participant pickupName
            const pickupName = p.request?.pickupName ?? p.pickupName;
            const pickupLat  = p.request?.pickupLat;
            const pickupLng  = p.request?.pickupLng;
            const distStr    = pickupLat && pickupLng && ride.originLat && ride.originLng
              ? formatDistance(haversineMeters(ride.originLat, ride.originLng, pickupLat, pickupLng))
              : null;
            const eta        = estimatePickupTime(ride.departureTime, ride.originLat, ride.originLng, pickupLat, pickupLng);

            return (
              <div key={p.id} className={`flex items-start gap-2 ${noShow ? 'opacity-40' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 mt-0.5">
                  {name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                  {company && (
                    <p className="text-xs text-gray-500 truncate">{company}</p>
                  )}
                  {pickupName && (
                    <a
                      href={pickupLat && pickupLng
                        ? `https://maps.google.com/?q=${pickupLat},${pickupLng}`
                        : `https://maps.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupName)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center gap-0.5"
                      title="Open pickup location in Google Maps"
                    >
                      📍 {pickupName} <span className="text-gray-400 text-[10px]">↗</span>
                    </a>
                  )}
                  {p.pickupTime ? (
                    <p className="text-xs text-brand-600 font-medium">🕐 Pickup at {p.pickupTime}</p>
                  ) : eta ? (
                    <p className="text-xs text-gray-400">🕐 Est. pickup ~{eta}</p>
                  ) : null}
                </div>
                {/* Right column: Call → Badge/NoShow → dist (top to bottom) */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {phone && !noShow && (
                    <CallButton
                      phone={phone}
                      countryCode={cc}
                      receiverId={recvId}
                      rideId={ride.id}
                      label="Call"
                      size="sm"
                      variant="ghost"
                    />
                  )}
                  {/* Inline participant action (e.g. No-Show button) takes priority over badge */}
                  {participantActions?.[p.id]
                    ? participantActions[p.id]
                    : badge && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )
                  }
                  {distStr && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">📏 {distStr} from you</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Browse view: just show giver + seat count ── */}
      {viewAs === 'browse' && ride.rideGiver?.user && (
        <div className="border-t border-gray-100 pt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
            {ride.rideGiver.user.fullName?.[0] ?? '🚗'}
          </div>
          <p className="text-xs text-gray-600 flex-1 truncate">{ride.rideGiver.user.fullName}</p>
          {participants.length > 0 && (
            <span className="text-xs text-gray-400">{participants.length} joined</span>
          )}
        </div>
      )}

      {/* ── Report modal ─────────────────────────────── */}
      {reportTarget && (
        <ReportUserModal
          reportedId={reportTarget.id}
          reportedName={reportTarget.name}
          rideId={ride.id}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* ── Action buttons slot ──────────────────────── */}
      {actions && <div className="border-t border-gray-100 pt-2">{actions}</div>}
    </div>
  );
}
