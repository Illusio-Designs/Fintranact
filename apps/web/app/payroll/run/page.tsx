'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon, UserGroupIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getPayrollRun, type PayrollRun } from '../../../lib/api';

export default function PayrollRunPage() {
  const [r, setR] = useState<PayrollRun | null>(null);
  const [month, setMonth] = useState('2026-07');
  const [posted, setPosted] = useState(false);
  useEffect(() => { getPayrollRun(month).then(setR).catch(() => {}); }, [month]);

  return (
    <AppShell crumb="Payroll / Run">
      <div className="page-head">
        <div>
          <div className="eyebrow">Payroll · off biometric attendance</div>
          <h1 className="display">Payroll Run</h1>
          <p>Gross pay, statutory deductions (PF · ESI · PT · TDS) and net payable, computed from attendance for the month.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Payslips</button>
          <button className="btn btn-primary" onClick={() => { setPosted(true); setTimeout(() => setPosted(false), 2000); }} style={posted ? { background: 'var(--good)' } : undefined}>
            <CheckmarkBadge01Icon size={15} color="currentColor" /> {posted ? 'Posted ✓' : 'Approve & post'}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Pay month</span>
          <Dropdown width={170} value={month} onChange={setMonth} options={[{ value: '2026-07', label: 'July 2026' }, { value: '2026-06', label: 'June 2026' }]} />
        </div>
        <div className="tb-field"><span>Attendance</span><div className="dp-trigger" style={{ cursor: 'default' }}><UserGroupIcon size={15} color="var(--text-3)" /> Biometric · ESSL X990</div></div>
      </div>

      {r && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Employees</div><div className="value num">{r.rows.length}</div><div className="delta">Mapped &amp; synced</div></div>
            <div className="tile"><div className="label">Gross</div><div className="value num">{money(r.gross)}</div></div>
            <div className="tile"><div className="label">Deductions</div><div className="value num">{money(r.totalDeductions)}</div><div className="delta down">PF · ESI · PT · TDS</div></div>
            <div className="tile accent"><div className="label">Net payable (bank)</div><div className="value num">{money(r.net)}</div></div>
          </section>

          <div className="card">
            <div className="card-head"><h3>Salary register — {month}</h3><span className="csub" style={{ marginLeft: 'auto' }}>{r.rows.length} employees</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Employee</th><th style={{ textAlign: 'right' }}>Basic</th><th style={{ textAlign: 'right' }}>Gross</th><th style={{ textAlign: 'right' }}>PF</th><th style={{ textAlign: 'right' }}>ESI</th><th style={{ textAlign: 'right' }}>PT</th><th style={{ textAlign: 'right' }}>TDS</th><th style={{ textAlign: 'right' }}>Net</th></tr></thead>
                <tbody>
                  {r.rows.map((e) => (
                    <tr key={e.name}>
                      <td className="party">{e.name}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{e.designation}</small></td>
                      <td className="amt">{money(e.basic)}</td>
                      <td className="amt">{money(e.gross)}</td>
                      <td className="amt">{money(e.pf)}</td>
                      <td className="amt">{e.esi ? money(e.esi) : '—'}</td>
                      <td className="amt">{e.pt ? money(e.pt) : '—'}</td>
                      <td className="amt">{e.tds ? money(e.tds) : '—'}</td>
                      <td className="amt" style={{ fontWeight: 700 }}>{money(e.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td><td className="amt">{money(r.rows.reduce((s, e) => s + e.basic, 0))}</td><td className="amt">{money(r.gross)}</td><td className="amt">{money(r.statutory.pfEmployee)}</td><td className="amt">{money(r.statutory.esiEmployee)}</td><td className="amt">{money(r.statutory.pt)}</td><td className="amt">{money(r.statutory.tds)}</td><td className="amt">{money(r.net)}</td></tr></tfoot>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Statutory to deposit</h3><span className="csub" style={{ marginLeft: 'auto' }}>Employee + employer share</span></div>
            <div className="card-body">
              <div className="kv"><span className="k">PF — ECR (employee 12% + employer 12%)</span><span className="v">{money(r.statutory.pfEmployee + r.statutory.pfEmployer)}</span></div>
              <div className="kv"><span className="k">ESI (employee 0.75% + employer 3.25%)</span><span className="v">{money(r.statutory.esiEmployee + r.statutory.esiEmployer)}</span></div>
              <div className="kv"><span className="k">Professional Tax (PT)</span><span className="v">{money(r.statutory.pt)}</span></div>
              <div className="kv"><span className="k">TDS on salary (192) → 24Q</span><span className="v">{money(r.statutory.tds)}</span></div>
              <div className="kv"><span className="k" style={{ fontWeight: 700 }}>Total statutory payout</span><span className="v" style={{ fontSize: 15 }}>{money(r.statutory.pfEmployee + r.statutory.pfEmployer + r.statutory.esiEmployee + r.statutory.esiEmployer + r.statutory.pt + r.statutory.tds)}</span></div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
