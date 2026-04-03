/**
 * Global styles and CSS imports
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Deepfake Detector',
  description: 'Detect whether a video is AI-generated or authentic',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-900 via-deepfake-primary/5 to-slate-900 text-gray-900">
        {children}
      </body>
    </html>
  );
}
