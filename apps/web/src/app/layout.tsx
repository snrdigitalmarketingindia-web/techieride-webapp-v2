import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `TechieRide v${process.env.NEXT_PUBLIC_APP_VERSION} — Verified IT Employee Carpooling`,
  description: 'Safe, verified carpooling for Hyderabad IT professionals',
  manifest: '/manifest.json',
  icons: { icon: '/TR_Logo_black.png', apple: '/TR_Logo_black.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Floating designer credit — top right, always visible */}
        <div className="fixed top-2 right-3 z-50 text-[10px] text-gray-400 pointer-events-none select-none">
          Designed by{' '}
          <a
            href="https://www.snrdigitalmarketing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 transition pointer-events-auto"
          >
            SNR Digital Marketing
          </a>
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
