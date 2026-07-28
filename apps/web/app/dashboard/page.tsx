'use client';

import { useState } from 'react';
import { AppShell } from '../../lib/appshell';
import { ROLES, recentVouchers, compliance, approvals, pendingInward, pendingOutward } from '../../lib/mock';

export default function Dashboard() {
  const [role, setRole] = useState('controller');
  const r = ROLES[role]!;
  const has = (list: string[]) => list.includes(role);

  return (
    <AppShell role={role} setRole={setRole} crumb="Dashboard">
      <div className="page-head">
        <div>
          <div className="eyebrow">FY 2026–27 · Q2 · {r.name} dashboard · as on 27 Jul 2026</div>
          <h1 className="display">Good evening, Rajesh</h1>
          <p>{r.greeting}</p>
        </div>
      </div>

      <section className="kpis">
        {r.kpis.map((k, i) => (
          <div className={`tile ${i === 3 ? 'accent' : ''}`} key={i}>
            <div className="label">{k.label}</div>
            <div className="value num">{k.value}</div>
            <div className={`delta ${k.tone}`}>{k.sub}</div>
          </div>
        ))}
      </section>

      <section className="dash" id="dashGrid">
        {has(['controller', 'owner', 'accountant']) && (
          <div className="card span-2">
            <div className="card-head"><div><h3>Cash Flow</h3><div className="csub">Inflow vs outflow · last 6 months (₹ Lakh)</div></div></div>
            <div className="chart-wrap">
              <div className="chart-legend"><span className="lg"><i style={{ background: 'var(--red)' }} />Inflow</span><span className="lg"><i style={{ background: '#6C6C76' }} />Outflow</span></div>
              <svg viewBox="0 0 640 230" width="100%" height="220" preserveAspectRatio="none" role="img" aria-label="Cash flow">
                <defs><linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--red)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--red)" stopOpacity="0" /></linearGradient></defs>
                <g stroke="var(--line)" strokeWidth={1}><line x1="0" y1="40" x2="640" y2="40" /><line x1="0" y1="95" x2="640" y2="95" /><line x1="0" y1="150" x2="640" y2="150" /><line x1="0" y1="200" x2="640" y2="200" /></g>
                <path d="M0,145 L106,115 L213,130 L320,78 L426,92 L533,52 L640,58 L640,200 L0,200 Z" fill="url(#fillRed)" />
                <path d="M0,145 L106,115 L213,130 L320,78 L426,92 L533,52 L640,58" fill="none" stroke="var(--red)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,168 L106,162 L213,172 L320,145 L426,156 L533,135 L640,142" fill="none" stroke="#6C6C76" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="640" cy="58" r="4.5" fill="var(--red)" />
                <g fill="var(--text-3)" fontSize="11" textAnchor="middle"><text x="20" y="220">Feb</text><text x="106" y="220">Mar</text><text x="213" y="220">Apr</text><text x="320" y="220">May</text><text x="426" y="220">Jun</text><text x="533" y="220">Jul</text></g>
              </svg>
            </div>
          </div>
        )}

        {has(['controller', 'owner', 'accountant', 'compliance']) && (
          <div className="card span-1">
            <div className="card-head"><h3>Compliance Calendar</h3><span className="pill crit" style={{ marginLeft: 'auto' }}>2 due soon</span></div>
            <div className="due-list">
              {compliance.map((c, i) => (
                <div className="due" key={i}>
                  <div className="stripe" style={{ background: c.tone === 'crit' ? 'var(--red)' : c.tone === 'ok' ? 'var(--good)' : '#C9C7CB' }} />
                  <div><div className="t">{c.t}</div><div className="m">{c.m}</div></div>
                  <div className="when"><b>{c.when}</b><span className={`pill ${c.tone}`}>{c.tag}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {has(['owner', 'auditor', 'controller']) && (
          <div className="card span-1">
            <div className="card-head"><div><h3>Profit &amp; Loss</h3><div className="csub">FY 2026–27 · live</div></div><div className="tools"><span className="pill ok">GP 45.2%</span><span className="pill ok">NP 13.4%</span></div></div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              <div className="kv"><span className="k">Process charges (income)</span><span className="v">₹38,60,000</span></div>
              <div className="kv"><span className="k">– Direct / process cost</span><span className="v" style={{ color: 'var(--red)' }}>₹21,15,000</span></div>
              <div className="kv" style={{ background: 'var(--good-tint)', margin: '6px -8px', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800, color: 'var(--good)' }}>= Gross Profit</span><span className="v" style={{ fontSize: 16, fontWeight: 800, color: 'var(--good)' }}>₹17,45,000</span></div>
              <div className="kv"><span className="k">– Indirect · finance · tax</span><span className="v" style={{ color: 'var(--red)' }}>₹12,27,000</span></div>
              <div className="kv" style={{ background: 'color-mix(in srgb,var(--red) 8%,var(--paper-2))', margin: '6px -8px 0', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800 }}>= Net Profit (PAT)</span><span className="v" style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>₹5,18,000</span></div>
            </div>
          </div>
        )}

        {has(['supervisor']) && (
          <div className="card span-1">
            <div className="card-head"><h3>Pending Inward</h3><span className="pill warn" style={{ marginLeft: 'auto' }}>6 jobs</span></div>
            <div className="due-list">
              {pendingInward.map((c, i) => (
                <div className="due" key={i}><div className="stripe" style={{ background: c.tone === 'crit' ? 'var(--red)' : c.tone === 'warn' ? 'var(--warn)' : '#C9C7CB' }} /><div><div className="t">{c.t}</div><div className="m">{c.m}</div></div><div className="when"><b>{c.qty}</b><span className={`pill ${c.tone}`}>{c.tag}</span></div></div>
              ))}
            </div>
          </div>
        )}
        {has(['supervisor']) && (
          <div className="card span-1">
            <div className="card-head"><h3>Pending Outward</h3><span className="pill warn" style={{ marginLeft: 'auto' }}>4 jobs</span></div>
            <div className="due-list">
              {pendingOutward.map((c, i) => (
                <div className="due" key={i}><div className="stripe" style={{ background: c.tone === 'crit' ? 'var(--red)' : 'var(--good)' }} /><div><div className="t">{c.t}</div><div className="m">{c.m}</div></div><div className="when"><b>{c.qty}</b><span className={`pill ${c.tone}`}>{c.tag}</span></div></div>
              ))}
            </div>
          </div>
        )}

        {has(['payroll']) && (
          <div className="card span-1">
            <div className="card-head"><h3>Attendance · Today</h3><span className="pill ok" style={{ marginLeft: 'auto' }}>biometric</span></div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              <div className="kv"><span className="k">Mapped on device</span><span className="v">142 / 142</span></div>
              <div className="kv"><span className="k">Present (punched in)</span><span className="v" style={{ color: 'var(--good)' }}>138</span></div>
              <div className="kv"><span className="k">On leave</span><span className="v">3</span></div>
              <div className="kv"><span className="k">Overtime hours</span><span className="v">46.5</span></div>
            </div>
          </div>
        )}

        {has(['controller', 'accountant', 'auditor']) && (
          <div className="card span-2">
            <div className="card-head"><h3>Recent Vouchers</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Voucher</th><th>Party</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {recentVouchers.map((v) => (
                    <tr key={v.no}><td className="vno">{v.no}</td><td className="party">{v.party}</td><td><span className="tag">{v.type}</span></td><td className="amt">{v.amount}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {has(['controller', 'owner', 'accountant']) && (
          <div className="card span-1">
            <div className="card-head"><h3>Approvals · You</h3><span className="pill crit" style={{ marginLeft: 'auto' }}>3 pending</span></div>
            <div>
              {approvals.map((a, i) => (
                <div key={i}>
                  <div className="appr"><div className="who2" style={{ background: 'linear-gradient(135deg,var(--red),#7A0913)' }}>{a.who}</div><div className="info"><b>{a.title}</b><span>{a.sub}</span></div><div className="amt2 num">{a.amt}</div></div>
                  <div className="appr-actions" style={{ borderBottom: i < approvals.length - 1 ? '1px solid var(--line)' : 0 }}><button className="mini">Reject</button><button className="mini go">Approve</button></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
