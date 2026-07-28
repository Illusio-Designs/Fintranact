'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getGstr1, type Gstr1, type Gstr1Rate } from '../../../lib/api';

function RateTable({ title, rows }: { title: string; rows: Gstr1Rate[] }) {
  const t = rows.reduce((a, r) => ({ taxable: a.taxable + r.taxable, igst: a.igst + r.igst, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst }), { taxable: 0, igst: 0, cgst: 0, sgst: 0 });
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length} rate slabs</span></div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Rate</th><th style={{ textAlign: 'right' }}>Taxable</th><th style={{ textAlign: 'right' }}>IGST</th><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rate}><td><span className="pill neut">{r.rate}%</span></td><td className="amt">{money(r.taxable)}</td><td className="amt">{money(r.igst)}</td><td className="amt">{money(r.cgst)}</td><td className="amt">{money(r.sgst)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td className="amt">{money(t.taxable)}</td><td className="amt">{money(t.igst)}</td><td className="amt">{money(t.cgst)}</td><td className="amt">{money(t.sgst)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

export default function Gstr1Page() {
  const [g, setG] = useState<Gstr1 | null>(null);
  const [period, setPeriod] = useState('2026-06');
  useEffect(() => { getGstr1().then(setG).catch(() => {}); }, [period]);

  return (
    <AppShell crumb="GST / GSTR-1">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST returns · outward supplies</div>
          <h1 className="display">GSTR-1</h1>
          <p>Rate-wise summary of outward supplies (B2B &amp; B2C) filed to the GST portal.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Generate JSON</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> File GSTR-1</button>
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
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Invoices</div><div className="value num">{g.invoices}</div><div className="delta">B2B + B2C + notes</div></div>
            <div className="tile"><div className="label">Taxable value</div><div className="value num">{money(g.outward.taxable)}</div></div>
            <div className="tile"><div className="label">Total tax</div><div className="value num">{money(g.totalTax)}</div><div className="delta">IGST + CGST + SGST</div></div>
            <div className="tile accent"><div className="label">Invoice value</div><div className="value num">{money(g.totalValue)}</div></div>
          </section>

          <div className="ui-grid">
            <RateTable title="B2B — registered (Table 4)" rows={g.b2b} />
            <RateTable title="B2C — unregistered (Table 7)" rows={g.b2c} />
          </div>
        </>
      )}
    </AppShell>
  );
}
