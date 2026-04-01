import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'Random Pin Cuisine',
  description:
    'Drop a pin anywhere on Earth. Discover the local cuisine. Find restaurants serving it in NYC.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://random-pin.michaelpyon.com'
  ),
  openGraph: {
    title: 'Random Pin Cuisine',
    description:
      'Drop a pin anywhere on Earth. Discover the local cuisine. Find restaurants serving it in NYC.',
    type: 'website',
    siteName: 'Random Pin Cuisine',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Random Pin Cuisine',
    description:
      'Drop a pin anywhere on Earth. Discover the local cuisine. Find restaurants serving it in NYC.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-slate-900 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
