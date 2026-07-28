'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert01Icon } from 'hugeicons-react';
import { login } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@raviMetal.com');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { accessToken } = await login(email, password);
      sessionStorage.setItem('accessToken', accessToken);
      router.push('/dashboard');
    } catch (err) {
      setMsg((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--paper)' }}>
      <div className="card" style={{ width: 380, maxWidth: '92vw' }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24 }}>
          <div className="logo-panel" style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ravi-logo.gif" alt="RAVI Metal Treatment" style={{ height: 48, width: 'auto', display: 'block' }} />
          </div>
          <div>
            <div className="eyebrow">Fintranact · Aji Deam Unit 3, Rajkot</div>
            <h1 className="display" style={{ fontSize: 24, margin: '4px 0 0' }}>Sign in</h1>
          </div>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Email</label><input className="ctl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>Password</label><input className="ctl" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {msg && <div className="alert err"><Alert01Icon size={16} color="currentColor" /> <span>{msg}</span></div>}
        </div>
      </div>
    </main>
  );
}
