import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BoardGameBliss Monitor',
  description: 'Detect new restock collections on BoardGameBliss before they go public',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950">{children}</body>
    </html>
  );
}
