'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, File01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getForm16, type Form16Row } from '../../../lib/api';

export default function Form16Page() {
  const [rows, setRows] = useState<Form16Row[]>([]);
  const [year, setYear] = useState('2025-26');
  const [sel, setSel] = useState<Form16Row | null>(null);
  useEffect(() => { getForm16().then((r) => { setRows(r); setSel(r[0] ?? null); }).catch(() => {}); }, [year]);

  const totalTds = rows.reduce((s, r) => s + r.tds, 0);

  return (
    <AppShell crumb="Payroll / Form 16">
      <div className="page-head">
        <div>
          <div className="eyebrow">Payroll · TDS on salary (Part B)</div>
          <h1 className="display">Form 16</h1>
          <p>Annual salary TDS certificate for each employee — salary, deductions, taxable income and tax. Part A is issued from TRACES.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn btn-ghost" href="/Form16_sample.pdf" target="_blank" rel="noopener"><File01Icon size={15} color="currentColor" /> Sample PDF</a>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> Generate all</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Assessment year</span>
          <Dropdown width={180} value={year} onChange={setYear} options={[{ value: '2025-26', label: 'AY 2025–26 (FY 24–25)' }, { value: '2026-27', label: 'AY 2026–27 (FY 25–26)' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Employees</div><div className="value num">{rows.length}</div></div>
        <div className="tile"><div className="label">Total TDS certified</div><div className="value num">{money(totalTds)}</div></div>
        <div className="tile accent"><div className="label">Certificates</div><div className="value num">{rows.length}</div><div className="delta">Ready to issue</div></div>
      </section>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>Employees</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length}</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Employee</th><th>PAN</th><th style={{ textAlign: 'right' }}>Gross</th><th style={{ textAlign: 'right' }}>TDS</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} style={sel?.name === r.name ? { background: 'var(--red-tint)' } : { cursor: 'pointer' }} onClick={() => setSel(r)}>
                    <td className="party">{r.name}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{r.pan}</td>
                    <td className="amt">{money(r.grossAnnual)}</td>
                    <td className="amt">{r.tds ? money(r.tds) : '—'}</td>
                    <td style={{ textAlign: 'right' }}><a className="mini" href="/Form16_sample.pdf" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}><Download01Icon size={13} color="currentColor" /> PDF</a></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}>Total TDS</td><td className="amt">{money(totalTds)}</td><td /></tr></tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Part B — {sel?.name ?? '—'}</h3>{sel && <span className="pill neut" style={{ marginLeft: 'auto' }}>{sel.pan}</span>}</div>
          <div className="card-body">
            {sel ? (
              <>
                <div className="kv"><span className="k">Gross salary (annual)</span><span className="v">{money(sel.grossAnnual)}</span></div>
                <div className="kv"><span className="k">Less: Standard deduction u/s 16(ia)</span><span className="v" style={{ color: 'var(--red-ink)' }}>−{money(sel.stdDeduction)}</span></div>
                <div className="kv"><span className="k">Less: Professional tax u/s 16(iii)</span><span className="v" style={{ color: 'var(--red-ink)' }}>−{money(sel.ptDeduction)}</span></div>
                <div className="kv"><span className="k">Less: Deduction u/s 80C (PF)</span><span className="v" style={{ color: 'var(--red-ink)' }}>−{money(sel.ded80C)}</span></div>
                <div className="kv" style={{ background: 'var(--paper)', margin: '6px -8px', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800 }}>Total taxable income</span><span className="v" style={{ fontSize: 15, fontWeight: 800 }}>{money(sel.taxableIncome)}</span></div>
                <div className="kv"><span className="k">Tax on total income (+ 4% cess)</span><span className="v">{money(sel.tax)}</span></div>
                <div className="kv" style={{ background: 'var(--red-tint)', margin: '6px -8px 0', padding: '9px 8px', borderRadius: 8, border: 0 }}><span className="k" style={{ fontWeight: 800, color: 'var(--red-ink)' }}>TDS deducted (u/s 192)</span><span className="v" style={{ fontSize: 16, fontWeight: 800, color: 'var(--red-ink)' }}>{money(sel.tds)}</span></div>
                <div className="qp-note" style={{ marginTop: 12 }}>Old-regime computation. Part A (quarterly TDS deposited) is downloaded from TRACES and merged into the final certificate.</div>
              </>
            ) : <div className="empty">Select an employee to see the tax computation.</div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
