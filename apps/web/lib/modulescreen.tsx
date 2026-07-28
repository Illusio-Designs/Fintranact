'use client';

import { useEffect, useMemo, useState } from 'react';
import { PencilEdit01Icon, Download01Icon, PrinterIcon, Delete02Icon, Add01Icon, Search01Icon, FilterIcon, Copy01Icon } from 'hugeicons-react';
import { AppShell } from './appshell';
import { Dropdown, DatePicker, fmtDate, RowMenu } from './components';
import { MOCK, listVouchers } from './api';

/** Generic module list screen assembled entirely from the shared UI library. */

type Rec = { id: string; ref: string; party: string; date: string; status: 'Posted' | 'Pending' | 'Draft'; amount: number };
const PARTIES = ['Mahalaxmi Traders', 'Gujarat Poly Pvt Ltd', 'Shakti Forgings', 'Rajkot Steel Co', 'Aarav Metals', 'Shree Balaji Enterprises', 'Tata Motors Ltd', 'Anand Fabrication'];
const STATUSES: Rec['status'][] = ['Posted', 'Pending', 'Draft', 'Posted', 'Posted', 'Pending', 'Draft', 'Posted'];
const statusPill: Record<Rec['status'], string> = { Posted: 'ok', Pending: 'warn', Draft: 'neut' };
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function rowsFor(prefix: string): Rec[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 1),
    ref: `${prefix}/26-27/${String(480 - i * 7).padStart(4, '0')}`,
    party: PARTIES[i % PARTIES.length]!,
    date: `${String(27 - i).padStart(2, '0')} Jul 2026`,
    status: STATUSES[i % STATUSES.length]!,
    amount: 512000 - i * 43120,
  }));
}
const prefixFor = (slug: string) => {
  if (slug.includes('sales')) return 'SI';
  if (slug.includes('purchase')) return 'PB';
  if (slug.includes('voucher')) return 'VCH';
  if (slug.includes('job')) return 'JW';
  if (slug.includes('payroll')) return 'PAY';
  if (slug.includes('tds')) return 'TDS';
  return 'DOC';
};

type SortKey = 'ref' | 'party' | 'date' | 'status' | 'amount';

export function ModuleScreen({ title, slug, readyNote }: { title: string; slug: string; readyNote?: string }) {
  const mockBase = useMemo(() => rowsFor(prefixFor(slug)), [slug]);
  const [live, setLive] = useState<Rec[] | null>(null);
  useEffect(() => {
    if (MOCK) return;
    if (!/(voucher|sales|purchase|invoice|bill|note|day-book|ledger)/.test(slug)) return;
    listVouchers()
      .then((vs) => setLive(vs.map((v, i) => ({
        id: v.id || String(i + 1),
        ref: v.voucherNo,
        party: v.party || '—',
        date: v.date || '—',
        status: (v.status === 'Posted' ? 'Posted' : v.status === 'Pending' ? 'Pending' : 'Draft') as Rec['status'],
        amount: typeof v.amount === 'number' ? v.amount : Number(String(v.amount ?? '').replace(/[^0-9.]/g, '')) || 0,
      }))))
      .catch(() => {});
  }, [slug]);
  const base = live ?? mockBase;
  const [status, setStatus] = useState('all');
  const [party, setParty] = useState('all');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ref');
  const [asc, setAsc] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    let r = base.filter((x) =>
      (status === 'all' || x.status.toLowerCase() === status) &&
      (party === 'all' || x.party === party) &&
      (!q || (x.ref + x.party).toLowerCase().includes(q.toLowerCase())));
    r = [...r].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return asc ? cmp : -cmp;
    });
    return r;
  }, [base, status, party, q, sortKey, asc]);
  const sort = (k: SortKey) => { if (k === sortKey) setAsc((v) => !v); else { setSortKey(k); setAsc(true); } };
  const allOn = sel.size === rows.length && rows.length > 0;
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleRow = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th style={right ? { textAlign: 'right' } : undefined}>
      <button className={`th-sort ${sortKey === k ? 'act' : ''}`} onClick={() => sort(k)}>{children}<span className="arw">{sortKey === k ? (asc ? '▲' : '▼') : '▲'}</span></button>
    </th>
  );

  return (
    <AppShell crumb={title}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Module</div>
          <h1 className="display">{title}</h1>
          <p>{readyNote ?? 'Browse, filter and act on records. Built from the shared @fintranact/ui component library.'}</p>
        </div>
        <button className="btn btn-primary"><Add01Icon size={15} color="currentColor" /> New {title.replace(/s$/, '')}</button>
      </div>

      {/* Toolbar — dropdowns + calendars + search, all from the UI library */}
      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={150} value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, { value: 'posted', label: 'Posted' }, { value: 'pending', label: 'Pending' }, { value: 'draft', label: 'Draft' }]} icon={<FilterIcon size={15} color="var(--text-3)" />} />
        </div>
        <div className="tb-field"><span>Party</span>
          <Dropdown width={200} value={party} onChange={setParty} searchable options={[{ value: 'all', label: 'All parties' }, ...PARTIES.map((p) => ({ value: p, label: p }))]} />
        </div>
        <div className="tb-field"><span>From</span><DatePicker width={150} value={from} onChange={setFrom} /></div>
        <div className="tb-field"><span>To</span><DatePicker width={150} value={to} onChange={setTo} /></div>
        <div className="tb-field grow"><span>Search</span>
          <div className="search" style={{ width: '100%' }}>
            <Search01Icon size={15} color="currentColor" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{title}</h3>
          <div className="sortby" style={{ marginLeft: 'auto' }}>
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
            <span style={{ color: 'var(--line)' }}>|</span>
            Sort by
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}><option value="ref">Reference</option><option value="party">Party</option><option value="date">Date</option><option value="status">Status</option><option value="amount">Amount</option></select>
            <button className="mini" onClick={() => setAsc((v) => !v)}>{asc ? 'Asc ▲' : 'Desc ▼'}</button>
          </div>
        </div>

        {(from || to) && (
          <div style={{ padding: '10px 18px 0' }}>
            <span className="tag">Range: {from ? fmtDate(from) : '…'} → {to ? fmtDate(to) : '…'} <button onClick={() => { setFrom(undefined); setTo(undefined); }} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' }}>×</button></span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 34 }}><label className="check" style={{ gap: 0 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /></label></th>
                <Th k="ref">Reference</Th><Th k="party">Party</Th><Th k="date">Date</Th><Th k="status">Status</Th><Th k="amount" right>Amount</Th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={sel.has(r.id) ? { background: 'var(--red-tint)' } : undefined}>
                  <td><label className="check" style={{ gap: 0 }}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleRow(r.id)} /></label></td>
                  <td className="vno">{r.ref}</td>
                  <td className="party">{r.party}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{r.date}</td>
                  <td><span className={`pill ${statusPill[r.status]}`}>{r.status}</span></td>
                  <td className="amt">{inr(r.amount)}</td>
                  <td>
                    <div className="rowacts">
                      <span className="tip"><button className="ib"><PencilEdit01Icon size={16} color="currentColor" /></button><span className="tip-txt">Edit</span></span>
                      <span className="tip"><button className="ib"><Download01Icon size={16} color="currentColor" /></button><span className="tip-txt">Download</span></span>
                      <span className="tip"><button className="ib"><PrinterIcon size={16} color="currentColor" /></button><span className="tip-txt">Print</span></span>
                      <RowMenu items={[
                        { label: 'Duplicate', icon: <Copy01Icon size={15} color="currentColor" /> },
                        { label: 'Export', icon: <Download01Icon size={15} color="currentColor" /> },
                        { label: 'Delete', icon: <Delete02Icon size={15} color="currentColor" />, danger: true },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7}><div className="empty"><div className="em-ic"><Search01Icon size={22} color="currentColor" /></div>No records match your filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="tfoot">
          <span>{sel.size > 0 ? `${sel.size} selected · ` : ''}Showing 1–{rows.length} of {base.length} · {pageSize} per page</span>
          <div className="pager"><button>‹</button><button className="on">1</button><button>2</button><button>3</button><button>›</button></div>
        </div>
      </div>
    </AppShell>
  );
}
