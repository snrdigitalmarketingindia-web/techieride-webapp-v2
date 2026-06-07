'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CallButton } from './CallButton';
import { ReportUserModal } from './ReportUserModal';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ONGOING:   'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  DRAFT:     'bg-yellow-100 text-yellow-700',
};

const BOARDING_BADGE: Record<string, { label: string; cls: string }> = {
  WAITING:   { label: '⏳ Waiting',   cls: 'bg-yellow-100 text-yellow-700' },
  BOARDED:   { label: '✅ Boarded',   cls: 'bg-green-100 text-green-700'   },
  DEBOARDED: { label: '🏁 Deboarded', cls: 'bg-gray-100 text-gray-500'     },
  NO_SHOW:   { label: '👻 No-show',   cls: 'bg-red-100 text-red-500'       },
};

interface RideCardProps {
  ride: any;
  /** 'giver' — you own the ride; 'seeker' — you joined the ride; 'browse' — search results */
  viewAs: 'giver' | 'seeker' | 'browse';
  /** Extra action buttons rendered below the header */
  actions?: React.ReactNode;
}

export function RideCard({ ride, viewAs, actions }: RideCardProps) {
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const participants: any[] = ride.participants ?? [];
  const dateStr = ride.departureDate
    ? new Date(ride.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">

      {/* ── Ride header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            {ride.originName} → {ride.destinationName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            📅 {dateStr} · 🕐 {ride.departureTime}
            {ride.vehicle && ` · ${ride.vehicle.make} ${ride.vehicle.model}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            const name    = p.seeker?.user?.fullName ?? 'Seeker';
            const phone   = p.seeker?.user?.phone;
            const cc      = p.seeker?.user?.countryCode;
            const recvId  = p.seeker?.userId;
            const badge   = BOARDING_BADGE[p.boardingStatus];
            const noShow  = p.boardingStatus === 'NO_SHOW';

            return (
              <div key={p.id} className={`flex items-center gap-2 ${noShow ? 'opacity-40' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                  {name[0]}
                </div>
                <p className="text-xs font-medium text-gray-800 flex-1 truncate">{name}</p>
                {badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
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
