'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@ravimetal.local');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body?.errors?.[0]?.message ?? 'Login failed');
        return;
      }
      // Phase 0: store token; a real session store + refresh lands in Phase 1.
      sessionStorage.setItem('accessToken', body.data.accessToken);
      setMsg(`Signed in as ${body.data.session.roles.join(', ')}`);
    } catch {
      setMsg('Cannot reach the API. Is it running on :4000?');
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E4E2E0',
    borderRadius: 8,
    fontSize: 14,
    marginTop: 6,
  };

  return (
    <main style={{ maxWidth: 360, margin: '96px auto', padding: 24 }}>
      <h2 style={{ marginBottom: 4 }}>Sign in</h2>
      <p style={{ color: '#5C5A5E', marginTop: 0, fontSize: 13 }}>Fintranact · RAVI Metal Treatment</p>
      <form onSubmit={onSubmit}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#5C5A5E' }}>
          Email
          <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#5C5A5E', display: 'block', marginTop: 12 }}>
          Password
          <input
            style={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            marginTop: 16,
            background: '#C8102E',
            color: '#fff',
            border: 0,
            padding: '11px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {msg && <p style={{ marginTop: 14, fontSize: 13 }}>{msg}</p>}
    </main>
  );
}
