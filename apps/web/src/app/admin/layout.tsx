'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/verification', label: 'Verification', icon: '✅' },
  { href: '/admin/vehicles', label: 'Vehicles', icon: '🚙' },
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
          <Image src="/logo.png" alt="Techieride" width={140} height={48} className="object-contain animate-pulse mb-3" />
          <p className="text-gray-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-14 sm:w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-2 sm:px-4 fixed h-full overflow-hidden">
        <div className="flex flex-col items-center gap-1 mb-8">
          <Image src="/logo.png" alt="Techieride" width={120} height={40} className="object-contain hidden sm:block" />
          <span className="text-xl sm:hidden">🚗</span>
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-xs text-gray-400">Admin Panel</span>
            <span className="text-xs font-medium text-orange-400">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
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
              <span>{l.icon}</span><span className="hidden sm:inline">{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-3 space-y-1">
          <p className="text-xs font-medium text-gray-700">{user?.fullName}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </aside>
      <main className="ml-14 sm:ml-56 flex-1 p-4 sm:p-8 min-w-0">{children}</main>
    </div>
  );
}
