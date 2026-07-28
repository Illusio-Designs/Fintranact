'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../lib/appshell';
import { money } from '../../lib/components';
import { getDashboard, getPnl, type Dashboard, type Pnl } from '../../lib/api';

const EMPTY: Dashboard = { role: 'controller', name: 'Finance Controller', greeting: '', kpis: [], recentVouchers: [], compliance: [], approvals: [], pendingInward: [], pendingOutward: [] };

export default function DashboardPage() {
  const [role, setRole] = useState('controller');
  const [d, setD] = useState<Dashboard>(EMPTY);
  const [pnl, setPnl] = useState<Pnl | null>(null);

  useEffect(() => { getDashboard(role).then(setD).catch(() => setD(EMPTY)); }, [role]);
  useEffect(() => { getPnl().then(setPnl).catch(() => {}); }, []);

  return (
    <AppShell role={role} setRole={setRole} crumb="Dashboard">
      <div className="page-head">
        <div>
          <div className="eyebrow">FY 2026–27 · {d.name} dashboard · live</div>
          <h1 className="display">Welcome back</h1>
          <p>{d.greeting || 'Live data from the books — figures update as you post vouchers, run payroll and file returns.'}</p>
        </div>
      </div>

      <section className="kpis">
        {d.kpis.map((k, i) => (
          <div className={`tile ${i === 3 ? 'accent' : ''}`} key={i}>
            <div className="label">{k.label}</div>
            <div className="value num">{k.value}</div>
            <div className={`delta ${k.tone ?? ''}`}>{k.sub}</div>
          </div>
        ))}
        {d.kpis.length === 0 && <div className="tile"><div className="label">No data yet</div><div className="value num">—</div><div className="delta">Post a voucher to begin</div></div>}
      </section>

      <section className="dash" id="dashGrid">
        {/* Profit & Loss — live */}
        <div className="card span-1">
          <div className="card-head"><div><h3>Profit &amp; Loss</h3><div className="csub">FY 2026–27 · live</div></div></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <div className="kv"><span className="k">Income</span><span className="v">{money(pnl?.totalIncome ?? 0)}</span></div>
            <div className="kv"><span className="k">– Direct cost</span><span className="v" style={{ color: 'var(--red)' }}>{money(pnl?.totalDirect ?? 0)}</span></div>
            <div className="kv" style={{ background: 'var(--good-tint)', margin: '6px -8px', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800, color: 'var(--good)' }}>= Gross Profit</span><span className="v" style={{ fontSize: 16, fontWeight: 800, color: 'var(--good)' }}>{money(pnl?.grossProfit ?? 0)}</span></div>
            <div className="kv"><span className="k">– Indirect · finance · tax</span><span className="v" style={{ color: 'var(--red)' }}>{money(pnl?.totalIndirect ?? 0)}</span></div>
            <div className="kv" style={{ background: 'color-mix(in srgb,var(--red) 8%,var(--paper-2))', margin: '6px -8px 0', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800 }}>= Net Profit (PAT)</span><span className="v" style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{money(pnl?.netProfit ?? 0)}</span></div>
          </div>
        </div>

        {/* Compliance calendar — live */}
        <div className="card span-1">
          <div className="card-head"><h3>Compliance Calendar</h3></div>
          <div className="due-list">
            {d.compliance.map((c, i) => (
              <div className="due" key={i}>
                <div className="stripe" style={{ background: c.days < 0 ? 'var(--red)' : 'var(--text-3)' }} />
                <div><div className="t">{c.t}</div><div className="m">{c.m}</div></div>
                <div className="when"><b>{c.when}</b></div>
              </div>
            ))}
            {d.compliance.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No filings scheduled yet.</div>}
          </div>
        </div>

        {/* Recent vouchers — live */}
        <div className="card span-2">
          <div className="card-head"><h3>Recent Vouchers</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Voucher</th><th>Type</th><th>Narration</th><th>Status</th></tr></thead>
              <tbody>
                {d.recentVouchers.map((v) => (
                  <tr key={v.no}><td className="vno">{v.no}</td><td><span className="tag">{v.type}</span></td><td className="party">{v.narration || '—'}</td><td>{v.status}</td></tr>
                ))}
                {d.recentVouchers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No vouchers posted yet — use Quick Entry to post the first one.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
