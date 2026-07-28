'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, MOCK } from '../../lib/api';
import { C } from '../../lib/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ajideam.local');
  const [password, setPassword] = useState(MOCK ? 'demo' : '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { accessToken } = await login(email, password);
      sessionStorage.setItem('accessToken', accessToken);
      router.push('/dashboard');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14, marginTop: 6 };

  return (
    <main style={{ minHeight: '100vh', background: C.paper, display: 'grid', placeItems: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ width: 360, padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'inline-flex', marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ravi-logo.gif" alt="RAVI Metal Treatment" style={{ height: 52, width: 'auto', display: 'block' }} />
        </div>
        <h2 style={{ marginBottom: 2 }}>Sign in</h2>
        <p style={{ color: C.muted, marginTop: 0, fontSize: 13 }}>Fintranact · Aji Deam Unit 3, Rajkot {MOCK && '· demo'}</p>
        <form onSubmit={onSubmit}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Email
            <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginTop: 12 }}>Password
            <input style={input} value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 16, background: C.red, color: '#fff', border: 0, padding: 11, borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Signing in…' : MOCK ? 'Enter demo' : 'Sign in'}
          </button>
        </form>
        {msg && <p style={{ marginTop: 14, fontSize: 13, color: C.redInk }}>{msg}</p>}
      </div>
    </main>
  );
}
