import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Stockroom — Considered workspace essentials', template: '%s | Stockroom' },
  description: 'A considered collection of electronics and everyday workspace essentials.',
  icons: { icon: '/favicon-stockroom.svg' },
  robots: { index: false, follow: false },
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
