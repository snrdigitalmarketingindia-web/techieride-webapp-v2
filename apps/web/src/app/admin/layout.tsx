'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { adminApi, complaintsApi } from '@/lib/api';

const links = [
  { href: '/admin',              label: 'Dashboard',    icon: '📊' },
  { href: '/admin/verification', label: 'Verification', icon: '✅', badge: 'verification' },
  { href: '/admin/vehicles',     label: 'Vehicles',     icon: '🚙' },
  { href: '/admin/users',        label: 'Users',        icon: '👤' },
  { href: '/admin/rides',        label: 'Rides',        icon: '🚗' },
  { href: '/admin/complaints',   label: 'Complaints',   icon: '🚩', badge: 'complaints' },
  { href: '/admin/audit-log',    label: 'Audit Log',    icon: '📋' },
  { href: '/admin/occupancy',    label: 'Occupancy',    icon: '💺' },
  { href: '/admin/travel',       label: 'Travel',       icon: '🗺️' },
  { href: '/admin/suspicious',   label: 'Suspicious',   icon: '🚨' },
  { href: '/admin/pending-registrations', label: 'Registrations', icon: '📝' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, _hasHydrated, fetchProfile, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady]                       = useState(false);
  const [pendingCount, setPendingCount]         = useState(0);
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);

  useEffect(() => {
    if (!_hasHydrated) return;
    const init = async () => {
      if (!isAuthenticated) { router.push('/login'); return; }
      let currentUser = user;
      if (!currentUser) {
        await fetchProfile();
        currentUser = useAuthStore.getState().user;
      }
      if (!currentUser || currentUser.role !== 'ADMIN') { router.push('/login'); return; }
      setReady(true);
      adminApi.getPendingVerifications()
        .then((r) => setPendingCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => {});
      complaintsApi.adminGetAll({ status: 'OPEN' })
        .then((r) => setOpenComplaintsCount(r.data.length))
        .catch(() => {});
    };
    init();
  }, [_hasHydrated, isAuthenticated]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/TR_Logo_black.png" alt="Techieride" width={80} height={80} className="object-contain animate-pulse mb-3" />
          <p className="text-gray-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden sm:flex w-56 bg-white border-r border-gray-200 flex-col py-6 px-4 fixed h-full overflow-hidden z-20">
        <div className="flex flex-col items-center gap-1 mb-8">
          <Image src="/TR_Logo_black.png" alt="Techieride" width={48} height={48} className="object-contain" />
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400">Admin Panel</span>
            <span className="text-xs font-medium text-orange-400">v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_APP_COMMIT}</span>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                pathname === l.href ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              {l.badge === 'verification' && pendingCount > 0 && (
                <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-semibold">{pendingCount}</span>
              )}
              {l.badge === 'complaints' && openComplaintsCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">{openComplaintsCount}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-3 space-y-1">
          <p className="text-xs font-medium text-gray-700 truncate">{user?.fullName}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <button onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition mt-1">
            <span>🚪</span><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/TR_Logo_black.png" alt="Techieride" width={28} height={28} className="object-contain" />
          <span className="text-sm font-bold text-gray-900">Admin</span>
          <span className="text-xs text-orange-400 font-medium">v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_APP_COMMIT}</span>
        </div>
        <button onClick={() => { logout(); router.push('/'); }}
          className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-lg">
          Logout
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="
        w-full sm:ml-56
        pt-16 pb-20 px-4
        sm:pt-0 sm:pb-0 sm:px-8 sm:py-8
        flex-1 min-w-0
      ">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ───────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex items-stretch">
        {links.map((l) => {
          const active = pathname === l.href;
          const badge = (l.badge === 'verification' && pendingCount > 0) ? pendingCount
                      : (l.badge === 'complaints' && openComplaintsCount > 0) ? openComplaintsCount
                      : 0;
          return (
            <Link key={l.href} href={l.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative ${
                active ? 'text-brand-700' : 'text-gray-400'
              }`}>
              <span className="text-xl leading-none">{l.icon}</span>
              <span className="text-[10px] font-medium leading-none">{l.label}</span>
              {badge > 0 && (
                <span className={`absolute top-1 right-1/4 translate-x-1/2 text-[9px] font-bold text-white px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                  l.badge === 'complaints' ? 'bg-red-500' : 'bg-amber-500'
                }`}>{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
