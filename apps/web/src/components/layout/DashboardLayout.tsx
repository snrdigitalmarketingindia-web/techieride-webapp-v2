'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { EcoLevel } from '@techieride/shared';
import NotificationDrawer from './NotificationDrawer';

const ECO_BADGES: Record<EcoLevel, string> = {
  SEED: '🌱',
  SPROUT: '🌿',
  LEAF: '🍃',
  TREE: '🌳',
  FOREST: '🌲',
};

const navLinks = [
  { href: '/dashboard',     label: 'Home',      icon: '🏠' },
  { href: '/rides',         label: 'My Rides',  icon: '🚗' },
  { href: '/rides/search',  label: 'Find Ride', icon: '🔍' },
  { href: '/profile',       label: 'Profile',   icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, fetchProfile, logout } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage before checking auth.
    // Without this, _hasHydrated is false on first render and isAuthenticated
    // is always false, causing an instant redirect to /login on every page load.
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user) fetchProfile();
  }, [_hasHydrated, isAuthenticated]);

  // Show loading skeleton while Zustand is hydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/TR_Logo_black.png" alt="Techieride" width={80} height={80} className="object-contain animate-pulse mb-3" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2.5 sticky top-0 z-10">

        {/* Logo + version — fixed left */}
        <div className="flex flex-col items-center gap-0 shrink-0">
          <Image src="/TR_Logo_black.png" alt="Techieride" width={36} height={36} className="object-contain" priority />
          <span className="text-[9px] font-medium text-gray-400 leading-none tracking-tight">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </div>

        {/* Full name + eco badge — immediately after logo, fills available space */}
        {user && (
          <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition">
            {/* Full name: bold, small font so long names fit; wraps to 2 lines gracefully */}
            {/* TODO: prefix with TRID short-ID (e.g. "TRID0042") once user ID sequence is available */}
            <span className="font-bold text-gray-800 text-[13px] leading-[1.25] min-w-0 break-words">
              {user.fullName}
            </span>
            {/* Eco pill: single line, self-stretch so it spans full height of a 2-line name */}
            <span className="shrink-0 self-stretch flex items-center gap-0.5 text-[11px] bg-brand-100 text-brand-700 px-2 rounded-full font-semibold whitespace-nowrap">
              {ECO_BADGES[user.ecoLevel as EcoLevel]} {user.ecoPoints} pts
            </span>
          </Link>
        )}

        {/* Right actions — notifications + logout */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            A Product of{' '}
            <a href="https://www.snrdigitalmarketing.com" target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 transition">
              SNR Digital Marketing
            </a>
          </span>
          <NotificationDrawer />
          {/* Logout — door-with-arrow icon */}
          <button
            onClick={() => { logout(); router.push('/'); }}
            title="Logout"
            aria-label="Logout"
            className="text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <div className="sticky bottom-0 sm:hidden">
        <nav className="bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
                  active ? 'text-brand-600' : 'text-gray-500'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        {/* Version + SNR branding strip — mobile only */}
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            A product of{' '}
            <a href="https://www.snrdigitalmarketing.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              SNR Digital Marketing
            </a>
          </span>
          <span className="text-[10px] text-gray-400">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>
      </div>

      {/* Desktop sidebar nav */}
      <div className="hidden sm:flex fixed top-16 left-0 h-full w-16 flex-col items-center pt-6 bg-white border-r border-gray-200 gap-6">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`text-2xl p-2 rounded-xl transition ${
                active ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              {link.icon}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
