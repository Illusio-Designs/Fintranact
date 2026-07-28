'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getTcs, type TcsData } from '../../../lib/api';

export default function TcsReturnPage() {
  const [d, setD] = useState<TcsData | null>(null);
  const [quarter, setQuarter] = useState('q1');
  useEffect(() => { getTcs().then(setD).catch(() => {}); }, [quarter]);

  return (
    <AppShell crumb="TCS / Return 27EQ">
      <div className="page-head">
        <div>
          <div className="eyebrow">TCS · quarterly e-return</div>
          <h1 className="display">TCS Return — 27EQ</h1>
          <p>Buyer-wise statement of tax collected at source for the quarter, filed to TRACES.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Generate FVU</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> File 27EQ</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Quarter</span>
          <Dropdown width={180} value={quarter} onChange={setQuarter} options={[{ value: 'q1', label: 'Q1 · Apr–Jun 2026' }, { value: 'q2', label: 'Q2 · Jul–Sep 2026' }]} />
        </div>
      </div>

      {d && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Buyers</div><div className="value num">{d.rows.length}</div></div>
            <div className="tile"><div className="label">Sale value</div><div className="value num">{money(d.totalSale)}</div></div>
            <div className="tile accent"><div className="label">Total TCS</div><div className="value num">{money(d.totalTcs)}</div><div className="delta">Q1 FY 2026-27</div></div>
          </section>
          <div className="card">
            <div className="card-head"><h3>Buyer statement</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Buyer</th><th>PAN</th><th>Section</th><th style={{ textAlign: 'right' }}>Sale value</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>TCS</th><th>Challan</th></tr></thead>
                <tbody>
                  {d.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="party">{r.party}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{r.pan}</td>
                      <td><span className="pill neut">{r.section}</span></td>
                      <td className="amt">{money(r.sale)}</td>
                      <td className="amt">{r.rate}%</td>
                      <td className="amt">{money(r.tcs)}</td>
                      <td>{r.challan ? <span className="pill ok">{r.challan}</span> : <span className="pill crit">unpaid</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total</td><td className="amt">{money(d.totalSale)}</td><td /><td className="amt">{money(d.totalTcs)}</td><td /></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
