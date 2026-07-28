'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ROLES, recentVouchers, compliance, approvals, pendingInward, pendingOutward } from '../../lib/mock';

/** Sidebar nav — pages may carry `*` (active) or `#N` (red count badge). */
const NAV: { group: string; open?: boolean; badge?: string; pages: string[] }[] = [
  { group: 'Overview', open: true, pages: ['Dashboard*', 'Compliance Calendar#2', 'Documents (Document Root)', 'Notifications'] },
  { group: 'Accounting', open: true, pages: ['Chart of Accounts', 'Ledgers & Groups', 'Vouchers', 'Day Book', 'Bank & Cash'] },
  { group: 'Sales & Purchase', pages: ['Sales Invoices', 'Purchase Bills', 'Credit / Debit Notes', 'Customers & Vendors', 'Items & Price Lists'] },
  { group: 'GST & Returns', badge: '3', pages: ['GST Invoices (e-Invoice)', 'E-Way Bills', 'GSTR-1', 'GSTR-3B', 'GSTR-2B Reconciliation'] },
  { group: 'TDS', pages: ['TDS Deductions', 'Payable / Receivable', 'Challans (ITNS 281)#1', 'Returns 24Q / 26Q / 27Q'] },
  { group: 'TCS', pages: ['TCS Collections (206C)', 'Challans', 'Return 27EQ'] },
  { group: 'Job Work & Process', pages: ['Inward — Cash / Debit memo', 'Outward Challans (Rule 45)', 'Pending — Inward / Outward#10', 'Job Cards', 'Lien / Forfeiture#1', 'ITC-04'] },
  { group: 'Payroll & HR', pages: ['Employees', 'Salary Structures', 'Attendance & Leave', 'Payroll Run#1', 'Payslips', 'Statutory — PF / ESI / PT'] },
  { group: 'Masters', pages: ['Process Master', 'Rate Master', 'Item / Material Master', 'Ledger Categories', 'Financial Year'] },
  { group: 'Reports', pages: ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Ageing'] },
  { group: 'Admin · Ravi Metal Ops', pages: ['Companies & Branches', 'Users & Roles', 'Permissions', 'Audit Trail', 'System & Tax Config'] },
];

const GIcon = () => (
  <svg className="g-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
);
const Chev = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M9 6l6 6-6 6" /></svg>
);

export default function Dashboard() {
  const [role, setRole] = useState('controller');
  const r = ROLES[role]!;
  const has = (list: string[]) => list.includes(role);

  function toggleTheme() {
    const el = document.documentElement;
    const cur = el.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    el.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  }
  const openNav = () => document.body.classList.add('nav-open');
  const closeNav = () => document.body.classList.remove('nav-open');

  function page(p: string, i: number) {
    const active = p.endsWith('*');
    const hashIdx = p.indexOf('#');
    const tail = hashIdx >= 0 ? p.slice(hashIdx + 1) : '';
    const label = p.replace('*', '').replace(/#.*/, '');
    const isDash = label === 'Dashboard';
    const inner = (
      <>
        <span className="pdot" />
        {label}
        {tail && <span className="tail red">{tail}</span>}
      </>
    );
    return isDash ? (
      <Link key={i} className={`page ${active ? 'active' : ''}`} href="/dashboard" onClick={closeNav}>{inner}</Link>
    ) : label === 'Documents (Document Root)' ? (
      <Link key={i} className="page" href="/import" onClick={closeNav}>{inner}</Link>
    ) : (
      <a key={i} className={`page ${active ? 'active' : ''}`} onClick={closeNav}>{inner}</a>
    );
  }

  return (
    <>
      <div className="scrim" onClick={closeNav} />
      <div className="app">
        {/* ===== SIDEBAR ===== */}
        <aside className="rail">
          <div className="brand" style={{ paddingTop: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>AJI <span style={{ color: 'var(--red)' }}>DEAM</span></div>
            <div className="brand-tag" style={{ textAlign: 'left', marginTop: 4 }}>Heat Treatment · Rajkot · <b>Fintranact</b></div>
          </div>
          <nav className="nav">
            {NAV.map((g, gi) => (
              <details className="grp" key={gi} open={g.open}>
                <summary>
                  <GIcon />
                  {g.group}
                  {g.badge && <span className="count alert">{g.badge}</span>}
                  <Chev />
                </summary>
                <div className="sub">{g.pages.map(page)}</div>
              </details>
            ))}
          </nav>
          <div className="rail-foot">
            <div className="avatar">RJ</div>
            <div className="who"><b>Rajesh J.</b><span>{r.name}</span></div>
          </div>
        </aside>

        {/* ===== MAIN ===== */}
        <div className="main">
          <div className="topbar">
            <button className="hamb" onClick={openNav} aria-label="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="crumbs">Home / <b>Dashboard</b></div>
            <button className="switcher"><span className="dot" /> Aji Deam <span className="gstin">· 24AABCS1429P1Z5 · Rajkot</span> ▾</button>
            <select className="topsel fy" defaultValue="FY 2026–27"><option>FY 2026–27</option><option>FY 2025–26</option></select>
            <select className="topsel role" value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <div className="spacer" />
            <div className="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg> Search… <kbd>⌘K</kbd></div>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
            <button className="icon-btn" title="Notifications"><span className="dot-alert num">6</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg></button>
            <button className="btn btn-primary"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M13 2L4 13h6l-1 9 9-11h-6z" /></svg> Quick Entry</button>
          </div>

          <div className="content">
            <div className="page-head">
              <div>
                <div className="eyebrow">FY 2026–27 · Q2 · {r.name} dashboard · as on 27 Jul 2026</div>
                <h1 className="display">Good evening, Rajesh</h1>
                <p>{r.greeting}</p>
              </div>
            </div>

            {/* KPIs */}
            <section className="kpis">
              {r.kpis.map((k, i) => (
                <div className={`tile ${i === 3 ? 'accent' : ''}`} key={i}>
                  <div className="label">{k.label}</div>
                  <div className="value num">{k.value}</div>
                  <div className={`delta ${k.tone}`}>{k.sub}</div>
                </div>
              ))}
            </section>

            {/* Cards */}
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

            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: '2px 0 14px' }}>
              Aji Deam · Fintranact — DEMO (mock data) · every action is RBAC-scoped &amp; audit-logged
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
