import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Fintranact — Aji Deam',
  description: 'Indian accounting, GST/TDS/TCS, job-work & payroll platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
