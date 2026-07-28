'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getTdsReturn, type TdsReturn } from '../../../lib/api';

export default function TdsReturnsPage() {
  const [r, setR] = useState<TdsReturn | null>(null);
  const [quarter, setQuarter] = useState('q1');
  const [section, setSection] = useState('all');
  useEffect(() => { getTdsReturn().then(setR).catch(() => {}); }, [quarter]);

  const rows = useMemo(() => (r?.rows ?? []).filter((x) => section === 'all' || x.section === section), [r, section]);
  const sections = useMemo(() => Array.from(new Set((r?.rows ?? []).map((x) => x.section))), [r]);

  return (
    <AppShell crumb="TDS / Returns 24Q 26Q 27Q">
      <div className="page-head">
        <div>
          <div className="eyebrow">TDS · quarterly e-return</div>
          <h1 className="display">TDS Return — {r?.form ?? '26Q'}</h1>
          <p>Deductee-wise statement of TDS on non-salary payments for the quarter, filed to TRACES.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Generate FVU</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> File return</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Quarter</span>
          <Dropdown width={170} value={quarter} onChange={setQuarter} options={[{ value: 'q1', label: 'Q1 · Apr–Jun 2026' }, { value: 'q2', label: 'Q2 · Jul–Sep 2026' }]} />
        </div>
        <div className="tb-field"><span>Section</span>
          <Dropdown width={150} value={section} onChange={setSection} options={[{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      {r && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Deductees</div><div className="value num">{r.rows.length}</div></div>
            <div className="tile"><div className="label">Amount paid / credited</div><div className="value num">{money(r.totalPaid)}</div></div>
            <div className="tile accent"><div className="label">Total TDS</div><div className="value num">{money(r.totalTds)}</div><div className="delta">{r.quarter}</div></div>
          </section>

          <div className="card">
            <div className="card-head"><h3>Deductee statement</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length} rows</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Deductee</th><th>PAN</th><th>Section</th><th style={{ textAlign: 'right' }}>Amount paid</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>TDS</th><th>Challan</th></tr></thead>
                <tbody>
                  {rows.map((x, i) => (
                    <tr key={i}>
                      <td className="party">{x.name}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{x.date}</small></td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{x.pan}</td>
                      <td><span className="pill neut">{x.section}</span></td>
                      <td className="amt">{money(x.paid)}</td>
                      <td className="amt">{x.rate}%</td>
                      <td className="amt">{money(x.tds)}</td>
                      <td>{x.challan ? <span className="pill ok">{x.challan}</span> : <span className="pill crit">unpaid</span>}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7}><div className="empty">No deductees in this section.</div></td></tr>}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total</td><td className="amt">{money(rows.reduce((s, x) => s + x.paid, 0))}</td><td /><td className="amt">{money(rows.reduce((s, x) => s + x.tds, 0))}</td><td /></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
