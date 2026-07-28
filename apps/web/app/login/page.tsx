'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, MOCK } from '../../lib/api';
import { C } from '../../lib/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ravimetal.local');
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
        <div style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: C.red, color: '#fff', fontWeight: 900, fontSize: 22, marginBottom: 12 }}>F</div>
        <h2 style={{ marginBottom: 2 }}>Sign in</h2>
        <p style={{ color: C.muted, marginTop: 0, fontSize: 13 }}>Fintranact · RAVI Metal Treatment {MOCK && '· demo'}</p>
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
