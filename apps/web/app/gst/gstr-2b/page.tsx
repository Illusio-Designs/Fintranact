'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, RefreshIcon, CheckmarkCircle02Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getGstr2b, type Gstr2b, type Recon2bStatus } from '../../../lib/api';

const STATUS: Record<Recon2bStatus, { label: string; pill: string }> = {
  matched: { label: 'Matched', pill: 'ok' },
  mismatch: { label: 'Mismatch', pill: 'warn' },
  only_books: { label: 'Only in books', pill: 'crit' },
  only_2b: { label: 'Only in 2B', pill: 'neut' },
};

export default function Gstr2bPage() {
  const [g, setG] = useState<Gstr2b | null>(null);
  const [period, setPeriod] = useState('2026-06');
  const [filter, setFilter] = useState('all');
  useEffect(() => { getGstr2b().then(setG).catch(() => {}); }, [period]);

  const rows = useMemo(() => (g?.rows ?? []).filter((r) => filter === 'all' || r.status === filter), [g, filter]);
  const diff = g ? g.booksTotal - g.portalTotal : 0;

  return (
    <AppShell crumb="GST / GSTR-2B Reconciliation">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST returns · ITC reconciliation</div>
          <h1 className="display">GSTR-2B Reconciliation</h1>
          <p>Match the input tax credit claimed in your books against the portal's auto-drafted GSTR-2B, invoice by invoice.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><RefreshIcon size={15} color="currentColor" /> Fetch 2B</button>
          <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export mismatches</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Return period</span>
          <Dropdown width={160} value={period} onChange={setPeriod} options={[{ value: '2026-06', label: 'June 2026' }, { value: '2026-05', label: 'May 2026' }]} />
        </div>
        <div className="tb-field"><span>Status</span>
          <Dropdown width={170} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All statuses' }, { value: 'matched', label: 'Matched' }, { value: 'mismatch', label: 'Mismatch' }, { value: 'only_books', label: 'Only in books' }, { value: 'only_2b', label: 'Only in 2B' }]} />
        </div>
      </div>

      {g && (
        <>
          {diff !== 0
            ? <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span>Books ITC ({money(g.booksTotal)}) differs from GSTR-2B ({money(g.portalTotal)}) by <b>{money(Math.abs(diff))}</b> — reconcile before claiming ITC in 3B.</span></div>
            : <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span>Books ITC matches GSTR-2B ({money(g.booksTotal)}).</span></div>}

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div className="tile"><div className="label">Matched</div><div className="value num">{g.matched}</div><div className="delta up">ITC safe to claim</div></div>
            <div className="tile"><div className="label">Mismatch</div><div className="value num">{g.mismatch}</div><div className="delta down">Amount differs</div></div>
            <div className="tile"><div className="label">Only in books</div><div className="value num">{g.onlyBooks}</div><div className="delta down">Not yet in 2B</div></div>
            <div className="tile"><div className="label">Only in 2B</div><div className="value num">{g.only2b}</div><div className="delta">Not booked</div></div>
          </section>

          <div className="card">
            <div className="card-head"><h3>Invoice matching</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length} invoices</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Supplier</th><th>Invoice</th><th style={{ textAlign: 'right' }}>ITC in books</th><th style={{ textAlign: 'right' }}>ITC in 2B</th><th style={{ textAlign: 'right' }}>Difference</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const d = r.booksItc - r.portalItc;
                    return (
                      <tr key={i}>
                        <td className="party">{r.supplier}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.gstin}</small></td>
                        <td className="vno">{r.invoiceNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                        <td className="amt">{money(r.booksItc)}</td>
                        <td className="amt">{money(r.portalItc)}</td>
                        <td className="amt" style={{ color: d === 0 ? 'var(--text-3)' : 'var(--red-ink)' }}>{d === 0 ? '—' : money(Math.abs(d))}</td>
                        <td><span className={`pill ${STATUS[r.status].pill}`}>{STATUS[r.status].label}</span></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={6}><div className="empty">No invoices in this status.</div></td></tr>}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2}>Total ITC</td><td className="amt">{money(g.booksTotal)}</td><td className="amt">{money(g.portalTotal)}</td><td className="amt">{money(Math.abs(diff))}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
