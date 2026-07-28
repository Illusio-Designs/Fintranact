'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon, QrCodeIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getEInvoices, type EInvoiceRow } from '../../../lib/api';

const statusPill: Record<EInvoiceRow['status'], { label: string; pill: string }> = {
  generated: { label: 'IRN generated', pill: 'ok' }, pending: { label: 'Pending', pill: 'crit' }, cancelled: { label: 'Cancelled', pill: 'neut' },
};

export default function EInvoicePage() {
  const [rows, setRows] = useState<EInvoiceRow[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => { getEInvoices().then(setRows).catch(() => {}); }, []);
  const list = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter]);
  const gen = rows.filter((r) => r.status === 'generated').length;
  const pend = rows.filter((r) => r.status === 'pending').length;

  return (
    <AppShell crumb="GST / e-Invoice">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST · e-Invoicing (IRP)</div>
          <h1 className="display">e-Invoice</h1>
          <p>IRN &amp; signed QR fetched from the Invoice Registration Portal for B2B tax invoices above the threshold.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary"><CheckmarkBadge01Icon size={15} color="currentColor" /> Generate pending IRNs</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={180} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All invoices' }, { value: 'generated', label: 'IRN generated' }, { value: 'pending', label: 'Pending' }, { value: 'cancelled', label: 'Cancelled' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">IRN generated</div><div className="value num">{gen}</div><div className="delta up">Signed &amp; QR ready</div></div>
        <div className="tile"><div className="label">Pending</div><div className="value num">{pend}</div><div className="delta down">Awaiting IRP</div></div>
        <div className="tile accent"><div className="label">Invoices</div><div className="value num">{rows.length}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Tax invoices</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Invoice</th><th>Party</th><th style={{ textAlign: 'right' }}>Value</th><th>IRN</th><th>Ack no.</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.invoiceNo}>
                  <td className="vno">{r.invoiceNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                  <td className="party">{r.party}</td>
                  <td className="amt">{money(r.value)}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.irn ?? '—'}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.ack ?? '—'}</td>
                  <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                  <td style={{ textAlign: 'right' }}>{r.irn ? <button className="mini"><QrCodeIcon size={13} color="currentColor" /> QR</button> : <button className="mini go">Generate</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
