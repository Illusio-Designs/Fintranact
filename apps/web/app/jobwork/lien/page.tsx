'use client';

import { useEffect, useState } from 'react';
import { Alert01Icon, LockedIcon, Download01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { money } from '../../../lib/components';
import { getLienCases, type LienCase } from '../../../lib/api';

const statusPill: Record<LienCase['status'], { label: string; pill: string }> = {
  notice: { label: 'Notice sent', pill: 'warn' }, held: { label: 'Material held', pill: 'crit' }, recovered: { label: 'Recovered', pill: 'ok' },
};

export default function LienPage() {
  const [rows, setRows] = useState<LienCase[]>([]);
  useEffect(() => { getLienCases().then(setRows).catch(() => {}); }, []);
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);

  return (
    <AppShell crumb="Job Work / Lien & Forfeiture">
      <div className="page-head">
        <div>
          <div className="eyebrow">Job work · processor's lien (Contract Act §170)</div>
          <h1 className="display">Lien &amp; Material Forfeiture</h1>
          <p>Recover overdue dues against a customer's material held in custody — notice, approval and signing are required, and every step is audited.</p>
        </div>
        <button className="btn btn-primary"><LockedIcon size={15} color="currentColor" /> Record lien</button>
      </div>

      <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span>A processor's lien handles customer property. Serve notice, obtain approval and sign before sale; surplus is refundable, shortfall stays receivable / bad-debt.</span></div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Open cases</div><div className="value num">{rows.filter((r) => r.status !== 'recovered').length}</div></div>
        <div className="tile"><div className="label">Overdue under lien</div><div className="value num">{money(totalOverdue)}</div></div>
        <div className="tile accent"><div className="label">Expected recovery</div><div className="value num">{money(rows.reduce((s, r) => s + r.expectedSale, 0))}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Lien cases</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Customer</th><th style={{ textAlign: 'right' }}>Overdue</th><th style={{ textAlign: 'right' }}>Ageing</th><th>Material held</th><th style={{ textAlign: 'right' }}>Assessed</th><th style={{ textAlign: 'right' }}>Exp. sale</th><th style={{ textAlign: 'right' }}>Surplus / short</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const diff = r.expectedSale - r.overdue;
                return (
                  <tr key={i}>
                    <td className="party">{r.customer}</td>
                    <td className="amt">{money(r.overdue)}</td>
                    <td className="amt"><span className={`pill ${r.ageingDays > 90 ? 'crit' : 'warn'}`}>{r.ageingDays} d</span></td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.material}<small style={{ display: 'block', color: 'var(--text-3)' }}>{r.qty}</small></td>
                    <td className="amt">{money(r.assessed)}</td>
                    <td className="amt">{money(r.expectedSale)}</td>
                    <td className="amt" style={{ color: diff >= 0 ? 'var(--good)' : 'var(--red-ink)', fontWeight: 700 }}>{diff >= 0 ? '+' : '−'}{money(Math.abs(diff))}</td>
                    <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td><td className="amt">{money(totalOverdue)}</td><td colSpan={3} /><td className="amt">{money(rows.reduce((s, r) => s + r.expectedSale, 0))}</td><td colSpan={2} /></tr></tfoot>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
