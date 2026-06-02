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
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <div className="flex-1">{children}</div>
        <Toaster />
        <footer className="text-center py-3 text-gray-400 text-xs border-t border-gray-100 bg-white">
          Designed by{' '}
          <a
            href="https://www.snrdigitalmarketing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 transition"
          >
            SNR Digital Marketing
          </a>
        </footer>
      </body>
    </html>
  );
}
