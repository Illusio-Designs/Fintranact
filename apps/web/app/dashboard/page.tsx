'use client';

import { useState } from 'react';
import { C, Shell } from '../../lib/ui';
import { ROLES, recentVouchers, compliance } from '../../lib/mock';

const pill: Record<string, React.CSSProperties> = {
  crit: { background: '#FBE7E9', color: C.redInk },
  warn: { background: '#F6ECD6', color: C.warn },
  ok: { background: '#E4F1EA', color: C.good },
  neut: { background: C.paper, color: C.muted, border: `1px solid ${C.line}` },
};

export default function Dashboard() {
  const [role, setRole] = useState('controller');
  const r = ROLES[role]!;

  const card: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(14,14,17,.06), 0 8px 24px rgba(14,14,17,.05)',
  };

  return (
    <Shell active="Dashboard">
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: '#8A888C' }}>
              FY 2026–27 · {r.name} dashboard · as on 27 Jul 2026
            </div>
            <h1 style={{ margin: '4px 0 2px', fontSize: 25, letterSpacing: '-0.02em' }}>Good evening, Rajesh</h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 13.5 }}>{r.greeting}</p>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>
            Role&nbsp;
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '8px 10px', borderRadius: 999, border: `1px solid ${C.line}`, fontWeight: 600 }}>
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* KPI tiles */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {r.kpis.map((k, i) => (
            <div key={i} style={{ ...card, padding: '15px 16px' }}>
              <div style={{ color: C.muted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: 26, marginTop: 7, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: k.tone === 'up' ? C.good : k.tone === 'down' ? C.red : C.muted }}>{k.sub}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          {/* Recent vouchers */}
          <div style={card}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>Recent Vouchers</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#8A888C', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 18px' }}>Voucher</th>
                    <th style={{ padding: '10px 18px' }}>Party</th>
                    <th style={{ padding: '10px 18px' }}>Type</th>
                    <th style={{ padding: '10px 18px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVouchers.map((v) => (
                    <tr key={v.no} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: '11px 18px', fontVariantNumeric: 'tabular-nums', color: C.muted, fontWeight: 600 }}>{v.no}</td>
                      <td style={{ padding: '11px 18px', fontWeight: 600 }}>{v.party}</td>
                      <td style={{ padding: '11px 18px' }}><span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: C.paper, border: `1px solid ${C.line}`, color: C.muted }}>{v.type}</span></td>
                      <td style={{ padding: '11px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance */}
          <div style={card}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>Compliance Calendar</div>
            {compliance.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < compliance.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 13.5 }}>{c.t}</div>
                  <div style={{ color: '#8A888C', fontSize: 12 }}>{c.m}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{c.when}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, ...pill[c.tone] }}>{c.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
