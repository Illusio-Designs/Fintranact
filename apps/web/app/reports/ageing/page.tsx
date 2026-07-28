'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, PrinterIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getAgeing, type Ageing } from '../../../lib/api';

export default function AgeingPage() {
  const [kind, setKind] = useState<'receivable' | 'payable'>('receivable');
  const [d, setD] = useState<Ageing | null>(null);
  useEffect(() => { getAgeing(kind).then(setD).catch(() => {}); }, [kind]);

  const cell = (v: number, warn?: boolean) => <td className="amt" style={warn && v ? { color: 'var(--red-ink)', fontWeight: 700 } : undefined}>{v ? money(v) : '—'}</td>;

  return (
    <AppShell crumb="Reports / Ageing">
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports · outstanding ageing</div>
          <h1 className="display">Ageing Analysis</h1>
          <p>Outstanding {kind === 'receivable' ? 'receivables from customers' : 'payables to suppliers'} bucketed by age. Chase the 90+ column first.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><PrinterIcon size={15} color="currentColor" /> Print</button>
          <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Type</span>
          <Dropdown width={180} value={kind} onChange={(v) => setKind(v as 'receivable' | 'payable')} options={[{ value: 'receivable', label: 'Receivables (Debtors)' }, { value: 'payable', label: 'Payables (Creditors)' }]} />
        </div>
      </div>

      {d && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Total outstanding</div><div className="value num">{money(d.totals.total)}</div></div>
            <div className="tile"><div className="label">0–30 days</div><div className="value num">{money(d.totals.b0)}</div></div>
            <div className="tile"><div className="label">31–90 days</div><div className="value num">{money(d.totals.b30 + d.totals.b60)}</div></div>
            <div className="tile accent"><div className="label">90+ days (overdue)</div><div className="value num">{money(d.totals.b90)}</div><div className="delta down">Chase first</div></div>
          </section>

          <div className="card">
            <div className="card-head"><h3>{kind === 'receivable' ? 'Debtors' : 'Creditors'} ageing</h3><span className="csub" style={{ marginLeft: 'auto' }}>{d.rows.length} parties</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Party</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>0–30</th><th style={{ textAlign: 'right' }}>31–60</th><th style={{ textAlign: 'right' }}>61–90</th><th style={{ textAlign: 'right' }}>90+</th></tr></thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.party}>
                      <td className="party">{r.party}</td>
                      <td className="amt" style={{ fontWeight: 700 }}>{money(r.total)}</td>
                      {cell(r.b0)}{cell(r.b30)}{cell(r.b60)}{cell(r.b90, true)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td><td className="amt">{money(d.totals.total)}</td><td className="amt">{money(d.totals.b0)}</td><td className="amt">{money(d.totals.b30)}</td><td className="amt">{money(d.totals.b60)}</td><td className="amt">{money(d.totals.b90)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
