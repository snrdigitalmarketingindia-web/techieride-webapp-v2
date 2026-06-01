'use client';

import Link from 'next/link';
import { CallButton } from './CallButton';

interface ContactCardProps {
  userId: string;
  name: string;
  company?: string;
  phone?: string;
  countryCode?: string;
  rating?: number;
  totalRides?: number;
  role: 'RIDE_GIVER' | 'RIDE_SEEKER';
  rideId?: string;
  /** compact = single row; full = card with all details */
  variant?: 'compact' | 'full';
}

const ROLE_LABELS = {
  RIDE_GIVER: { label: 'Ride Giver', color: 'bg-brand-50 text-brand-700 border-brand-200', icon: '🚗' },
  RIDE_SEEKER: { label: 'Ride Seeker', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🧳' },
};

/**
 * ContactCard — displays user info + call button.
 *
 * Future-ready: add `onWhatsApp`, `onChat`, `onVoIP` props without breaking
 * existing usages.
 */
export function ContactCard({
  userId,
  name,
  company,
  phone,
  countryCode = '+91',
  rating,
  totalRides,
  role,
  rideId,
  variant = 'full',
}: ContactCardProps) {
  const roleInfo = ROLE_LABELS[role];

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{roleInfo.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            {company && <p className="text-xs text-gray-500 truncate">{company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {phone ? (
            <CallButton
              phone={phone}
              countryCode={countryCode}
              receiverId={userId}
              rideId={rideId}
              label="Call"
              size="sm"
              variant="outline"
            />
          ) : (
            <span className="text-xs text-gray-400">No phone</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900">{name}</p>
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${roleInfo.color}`}>
              {roleInfo.icon} {roleInfo.label}
            </span>
          </div>
          {company && <p className="text-sm text-gray-500">{company}</p>}
          {rating !== undefined && (
            <p className="text-xs text-gray-400 mt-0.5">
              ⭐ {rating.toFixed(1)} · {totalRides ?? 0} rides
            </p>
          )}
        </div>
        <Link href={`/users/${userId}/public`}
          className="shrink-0 text-xs text-brand-600 hover:underline">
          View Profile
        </Link>
      </div>

      {/* Phone + Call action */}
      {phone ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-800 font-mono">{countryCode} {phone}</p>
          </div>
          <CallButton
            phone={phone}
            countryCode={countryCode}
            receiverId={userId}
            rideId={rideId}
            label="Call"
            size="md"
            variant="primary"
          />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-400">
          Phone number not available
        </div>
      )}
    </div>
  );
}
