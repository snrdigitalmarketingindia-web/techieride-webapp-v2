'use client';

import { callsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface CallButtonProps {
  phone: string;
  countryCode?: string;
  receiverId: string;
  rideId?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

/**
 * CallButton — renders a tel: link that opens the native dialer on mobile
 * and Skype/default handler on desktop. Fires a non-blocking audit log.
 *
 * Future-ready: replace the <a> with an in-app call handler without changing props.
 */
export function CallButton({
  phone,
  countryCode = '+91',
  receiverId,
  rideId,
  label = 'Call',
  size = 'md',
  variant = 'primary',
  className = '',
}: CallButtonProps) {
  const { user } = useAuthStore();
  const fullNumber = `${countryCode}${phone}`;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1',
    md: 'text-sm px-3 py-2 gap-1.5',
    lg: 'text-base px-4 py-2.5 gap-2',
  }[size];

  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-green-600 text-green-700 hover:bg-green-50',
    ghost: 'text-green-700 hover:bg-green-50',
  }[variant];

  const handleClick = () => {
    if (user?.id) {
      callsApi.log(receiverId, rideId); // fire-and-forget
    }
  };

  return (
    <a
      href={`tel:${fullNumber}`}
      onClick={handleClick}
      aria-label={`Call ${label} at ${fullNumber}`}
      className={`inline-flex items-center rounded-lg font-medium transition ${sizeClasses} ${variantClasses} ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
        className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}>
        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
      </svg>
      {label}
    </a>
  );
}
