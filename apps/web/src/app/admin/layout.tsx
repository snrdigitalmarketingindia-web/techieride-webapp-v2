'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/verification', label: 'Verification', icon: '✅' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/admin/rides', label: 'Rides', icon: '🚗' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, _hasHydrated, fetchProfile } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    const init = async () => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Fetch profile if we don't have user yet
      let currentUser = user;
      if (!currentUser) {
        await fetchProfile();
        currentUser = useAuthStore.getState().user;
      }

      // Enforce admin role before rendering anything
      if (!currentUser || currentUser.role !== 'ADMIN') {
        router.push('/login');
        return;
      }

      setReady(true);
    };

    init();
  }, [_hasHydrated, isAuthenticated]);

  // Show spinner until we've confirmed admin role
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌿</div>
          <p className="text-gray-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xl">🌿</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">Techie Ride</p>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                pathname === l.href
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 space-y-1">
          <p className="text-xs font-medium text-gray-700">{user?.fullName}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
