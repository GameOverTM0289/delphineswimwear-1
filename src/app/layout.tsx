import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import CookieConsent from '@/components/marketing/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "Delphine — Mediterranean Summer '26",
    template: '%s · Delphine',
  },
  description:
    'Refined swimwear rooted in Mediterranean light, salt, and spirit. Designed for women who move freely and dress with intention.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Delphine — Mediterranean Summer '26",
    description:
      'Refined swimwear rooted in Mediterranean light, salt, and spirit.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Cookieless, no consent required */}
        <Analytics />
        {/* Loads Google Analytics only after the visitor accepts */}
        <CookieConsent />
      </body>
    </html>
  );
}
