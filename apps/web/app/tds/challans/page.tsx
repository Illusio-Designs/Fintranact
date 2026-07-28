'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getTdsChallans, type TdsChallans } from '../../../lib/api';

export default function TdsChallansPage() {
  const [c, setC] = useState<TdsChallans | null>(null);
  const [month, setMonth] = useState('2026-06');
  useEffect(() => { getTdsChallans().then(setC).catch(() => {}); }, [month]);

  return (
    <AppShell crumb="TDS / Challans ITNS-281">
      <div className="page-head">
        <div>
          <div className="eyebrow">TDS · challan ITNS-281</div>
          <h1 className="display">TDS Challans</h1>
          <p>Section-wise TDS deducted and its deposit status. Deposit by the 7th of the following month to avoid interest u/s 201.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> Pay pending</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Deduction month</span>
          <Dropdown width={170} value={month} onChange={setMonth} options={[{ value: '2026-06', label: 'June 2026' }, { value: '2026-05', label: 'May 2026' }]} />
        </div>
        <div className="tb-field"><span>TAN</span><div className="dp-trigger" style={{ cursor: 'default' }}>RKTR02914E</div></div>
      </div>

      {c && (
        <>
          {c.totalDue > 0 && (
            <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span><b>{money(c.totalDue)}</b> TDS still to be deposited via ITNS-281 — due 07 Aug 2026.</span></div>
          )}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Total deducted</div><div className="value num">{money(c.totalDeducted)}</div></div>
            <div className="tile"><div className="label">Deposited</div><div className="value num">{money(c.totalPaid)}</div><div className="delta up">Challan paid</div></div>
            <div className="tile accent"><div className="label">Pending deposit</div><div className="value num">{money(c.totalDue)}</div><div className="delta down">Due 07 Aug</div></div>
          </section>

          <div className="card">
            <div className="card-head"><h3>Section-wise challans</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Section</th><th>Deductees</th><th style={{ textAlign: 'right' }}>TDS amount</th><th>Challan / BSR</th><th>Due / paid</th><th>Status</th></tr></thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.section}>
                      <td className="vno">{r.section}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.description}</small></td>
                      <td>{r.deductees}</td>
                      <td className="amt">{money(r.amount)}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.challanNo ? <>{r.challanNo}<small style={{ display: 'block', color: 'var(--text-3)' }}>BSR {r.bsr}</small></> : '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.status === 'paid' ? r.paidOn : r.dueOn}</td>
                      <td><span className={`pill ${r.status === 'paid' ? 'ok' : 'crit'}`}>{r.status === 'paid' ? 'Deposited' : 'Due'}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={2}>Total</td><td className="amt">{money(c.totalDeducted)}</td><td colSpan={3} /></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
