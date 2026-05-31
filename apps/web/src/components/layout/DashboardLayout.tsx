'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { EcoLevel } from '@techieride/shared';

const ECO_BADGES: Record<EcoLevel, string> = {
  SEED: '🌱',
  SPROUT: '🌿',
  LEAF: '🍃',
  TREE: '🌳',
  FOREST: '🌲',
};

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/rides', label: 'My Rides', icon: '🚗' },
  { href: '/dashboard/rides/search', label: 'Find Ride', icon: '🔍' },
  { href: '/dashboard/profile', label: 'Profile', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, fetchProfile, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!user) fetchProfile();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-brand-700">Techie Ride</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{user.fullName?.split(' ')[0]}</span>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                {ECO_BADGES[user.ecoLevel as EcoLevel]} {user.ecoPoints} pts
              </span>
            </div>
          )}
          <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-gray-500 hover:text-red-500 transition">
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">{children}</main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 px-4 py-2 flex justify-around sticky bottom-0 sm:hidden">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${active ? 'text-brand-600' : 'text-gray-500'}`}>
              <span className="text-xl">{link.icon}</span>
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar nav */}
      <div className="hidden sm:flex fixed top-16 left-0 h-full w-16 flex-col items-center pt-6 bg-white border-r border-gray-200 gap-6">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} title={link.label} className={`text-2xl p-2 rounded-xl transition ${active ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100'}`}>
              {link.icon}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
