import type { ReactNode } from 'react';

export const metadata = {
  title: 'Fintranact — RAVI Metal Treatment',
  description: 'Indian accounting, GST/TDS/TCS, job-work & payroll platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#F6F5F4',
          color: '#14141A',
        }}
      >
        {children}
      </body>
    </html>
  );
}
