'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getGstr3b, type Gstr3b } from '../../../lib/api';

export default function Gstr3bPage() {
  const [g, setG] = useState<Gstr3b | null>(null);
  const [period, setPeriod] = useState('2026-06');
  useEffect(() => { getGstr3b().then(setG).catch(() => {}); }, [period]);

  const outTotal = g ? g.outward.igst + g.outward.cgst + g.outward.sgst : 0;
  const itcTotal = g ? g.itc.igst + g.itc.cgst + g.itc.sgst : 0;

  return (
    <AppShell crumb="GST / GSTR-3B">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST returns · monthly summary</div>
          <h1 className="display">GSTR-3B</h1>
          <p>Summary of output tax against eligible input tax credit, and the net GST payable in cash.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Download JSON</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> File GSTR-3B</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Return period</span>
          <Dropdown width={170} value={period} onChange={setPeriod} options={[{ value: '2026-06', label: 'June 2026' }, { value: '2026-05', label: 'May 2026' }, { value: '2026-04', label: 'April 2026' }]} />
        </div>
        <div className="tb-field"><span>GSTIN</span><div className="dp-trigger" style={{ cursor: 'default' }}>24AABCS1429P1Z5</div></div>
      </div>

      {g && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Output tax (3.1)</div><div className="value num">{money(outTotal)}</div><div className="delta">On {money(g.outward.taxable)} taxable</div></div>
            <div className="tile"><div className="label">Input tax credit (4)</div><div className="value num">{money(itcTotal)}</div><div className="delta up">Eligible ITC</div></div>
            <div className="tile accent"><div className="label">Net payable in cash (5.1)</div><div className="value num">{money(g.netPayable.total)}</div><div className="delta down">Due 20 Jul 2026</div></div>
          </section>

          <div className="ui-grid">
            <div className="card">
              <div className="card-head"><h3>3.1 · Outward taxable supplies</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Nature</th><th style={{ textAlign: 'right' }}>Taxable</th><th style={{ textAlign: 'right' }}>IGST</th><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></tr></thead>
                  <tbody>
                    <tr><td className="party">(a) Outward taxable (other than zero/nil)</td><td className="amt">{money(g.outward.taxable)}</td><td className="amt">{money(g.outward.igst)}</td><td className="amt">{money(g.outward.cgst)}</td><td className="amt">{money(g.outward.sgst)}</td></tr>
                  </tbody>
                  <tfoot><tr><td>Total output tax</td><td className="amt">{money(g.outward.taxable)}</td><td className="amt">{money(g.outward.igst)}</td><td className="amt">{money(g.outward.cgst)}</td><td className="amt">{money(g.outward.sgst)}</td></tr></tfoot>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>4 · Eligible ITC</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Head</th><th style={{ textAlign: 'right' }}>IGST</th><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></tr></thead>
                  <tbody>
                    <tr><td className="party">(A) ITC available — inward supplies</td><td className="amt">{money(g.itc.igst)}</td><td className="amt">{money(g.itc.cgst)}</td><td className="amt">{money(g.itc.sgst)}</td></tr>
                  </tbody>
                  <tfoot><tr><td>Net ITC available</td><td className="amt">{money(g.itc.igst)}</td><td className="amt">{money(g.itc.cgst)}</td><td className="amt">{money(g.itc.sgst)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>5.1 · Tax payable &amp; paid in cash</h3><span className="pill crit" style={{ marginLeft: 'auto' }}>Net {money(g.netPayable.total)}</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Head</th><th style={{ textAlign: 'right' }}>Output</th><th style={{ textAlign: 'right' }}>ITC set-off</th><th style={{ textAlign: 'right' }}>Payable in cash</th></tr></thead>
                <tbody>
                  <tr><td className="party">IGST</td><td className="amt">{money(g.outward.igst)}</td><td className="amt">{money(g.itc.igst)}</td><td className="amt">{money(g.netPayable.igst)}</td></tr>
                  <tr><td className="party">CGST</td><td className="amt">{money(g.outward.cgst)}</td><td className="amt">{money(g.itc.cgst)}</td><td className="amt">{money(g.netPayable.cgst)}</td></tr>
                  <tr><td className="party">SGST</td><td className="amt">{money(g.outward.sgst)}</td><td className="amt">{money(g.itc.sgst)}</td><td className="amt">{money(g.netPayable.sgst)}</td></tr>
                </tbody>
                <tfoot><tr><td>Net payable in cash</td><td className="amt">{money(outTotal)}</td><td className="amt">{money(itcTotal)}</td><td className="amt">{money(g.netPayable.total)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
