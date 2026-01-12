import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: `${BRAND_NAME} simulation-based hiring platform`,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
