'use client';

import { useEffect } from 'react';
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
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/login');
    }
  }, [isAuthenticated, user]);

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
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${pathname === l.href ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-gray-400 px-3">{user?.fullName}</p>
      </aside>
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
