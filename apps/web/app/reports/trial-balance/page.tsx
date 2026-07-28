'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, PrinterIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, ReportBanner, reconcile, money } from '../../../lib/components';
import { getTrialBalance, type TrialBalance } from '../../../lib/api';

const catPill: Record<string, string> = { bank: 'ok', cash: 'ok', customer: 'neut', supplier: 'warn', tax: 'warn', liability: 'warn', income: 'ok', expense: 'crit', asset: 'neut', equity: 'neut' };

export default function TrialBalancePage() {
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [fy, setFy] = useState('2026-27');
  const [q, setQ] = useState('');

  useEffect(() => { getTrialBalance().then(setTb).catch(() => {}); }, [fy]);

  const rows = useMemo(() => (tb?.rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())), [tb, q]);
  const empty = !!tb && tb.rows.length === 0;
  const rec = tb ? reconcile(tb.totalDebit, tb.totalCredit) : null;
  // A trial balance must foot: pad the short side with a suspense difference so both columns are equal.
  const grand = rec ? rec.grand : 0;
  const diffDebit = rec && rec.shortSide === 'debit' ? rec.diff : 0;
  const diffCredit = rec && rec.shortSide === 'credit' ? rec.diff : 0;

  return (
    <AppShell crumb="Reports / Trial Balance">
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports · as on 27 Jul 2026</div>
          <h1 className="display">Trial Balance</h1>
          <p>Net debit / credit closing balance for every ledger with movement. Balanced books show equal debit and credit totals.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><PrinterIcon size={15} color="currentColor" /> Print</button>
          <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Financial year</span>
          <Dropdown width={160} value={fy} onChange={setFy} options={[{ value: '2026-27', label: 'FY 2026–27' }, { value: '2025-26', label: 'FY 2025–26' }]} />
        </div>
        <div className="tb-field grow"><span>Search ledger</span>
          <div className="search" style={{ width: '100%' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ledger name…" style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} />
          </div>
        </div>
      </div>

      {tb && <ReportBanner debit={tb.totalDebit} credit={tb.totalCredit} empty={empty} />}

      <div className="card">
        <div className="card-head"><h3>Ledger balances</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length} ledgers</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Ledger</th><th>Group</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ledgerId}>
                  <td className="party">{r.name}</td>
                  <td>{r.category ? <span className={`pill ${catPill[r.category] ?? 'neut'}`}>{r.category}</span> : '—'}</td>
                  <td className="amt">{money(r.debit)}</td>
                  <td className="amt">{money(r.credit)}</td>
                </tr>
              ))}
              {rec && !rec.balanced && !empty && (
                <tr style={{ background: 'var(--red-tint)' }}>
                  <td className="party" style={{ color: 'var(--red-ink)' }}>Difference in balances (suspense)</td>
                  <td><span className="pill crit">unreconciled</span></td>
                  <td className="amt" style={{ color: 'var(--red-ink)' }}>{money(diffDebit)}</td>
                  <td className="amt" style={{ color: 'var(--red-ink)' }}>{money(diffCredit)}</td>
                </tr>
              )}
              {empty && <tr><td colSpan={4}><div className="empty">No ledger postings in this period yet.</div></td></tr>}
              {!empty && rows.length === 0 && <tr><td colSpan={4}><div className="empty">No ledgers match your filter.</div></td></tr>}
            </tbody>
            {tb && !empty && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                  <td style={{ paddingLeft: 18, fontWeight: 700 }}>Total</td>
                  <td />
                  <td className="amt" style={{ fontSize: 14 }}>{money(grand)}</td>
                  <td className="amt" style={{ fontSize: 14 }}>{money(grand)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AppShell>
  );
}
