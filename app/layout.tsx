import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Instagram Play All',
  description: 'Continuous player for Instagram saved collections',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
