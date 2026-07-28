import Link from 'next/link';
import type { ReactNode } from 'react';
import { MOCK } from './api';

export const C = {
  ink: '#0E0E11',
  red: '#C8102E',
  redInk: '#7A0913',
  paper: '#F6F5F4',
  surface: '#FFFFFF',
  line: '#E4E2E0',
  text: '#14141A',
  muted: '#5C5A5E',
  good: '#1F7A54',
  warn: '#9A6A00',
};

/** App shell: dark top bar with brand + nav, and a mock-mode banner for demos. */
export function Shell({ children, active }: { children: ReactNode; active?: string }) {
  const navItem = (href: string, label: string) => (
    <Link
      href={href}
      style={{
        color: active === label ? '#fff' : '#B8B6BA',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 14,
        padding: '6px 10px',
        borderRadius: 8,
        background: active === label ? '#202027' : 'transparent',
      }}
    >
      {label}
    </Link>
  );
  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <header style={{ background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <b style={{ fontSize: 18, letterSpacing: '-0.02em', color: '#fff' }}>AJI <span style={{ color: C.red }}>DEAM</span></b>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A787E' }}>Heat Treatment · Rajkot</span>
        </div>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
          {navItem('/dashboard', 'Dashboard')}
          {navItem('/import', 'Import')}
        </nav>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#7A787E' }}>Powered by <b style={{ color: C.red }}>Fintranact</b> · Rajkot</div>
      </header>
      {MOCK && (
        <div style={{ background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', padding: '5px' }}>
          DEMO · mock data (no backend). Set NEXT_PUBLIC_USE_MOCK=false + NEXT_PUBLIC_API_URL to use the live API.
        </div>
      )}
      {children}
    </div>
  );
}
