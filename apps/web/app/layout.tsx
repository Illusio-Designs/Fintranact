import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Fintranact — RAVI Metal Treatment',
  description: 'Indian accounting, GST/TDS/TCS, job-work & payroll platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
