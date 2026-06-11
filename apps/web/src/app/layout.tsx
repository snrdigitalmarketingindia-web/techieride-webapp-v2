import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
{children}
        <Toaster />
      </body>
    </html>
  );
}
