'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, PrinterIcon, CheckmarkCircle02Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { getTrialBalance, type TrialBalance } from '../../../lib/api';

const inr = (n: number) => (n ? '₹' + n.toLocaleString('en-IN') : '—');
const catPill: Record<string, string> = { bank: 'ok', cash: 'ok', customer: 'neut', supplier: 'warn', tax: 'warn', liability: 'warn', income: 'ok', expense: 'crit', asset: 'neut', equity: 'neut' };

export default function TrialBalancePage() {
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [fy, setFy] = useState('2026-27');
  const [q, setQ] = useState('');

  useEffect(() => { getTrialBalance().then(setTb).catch(() => {}); }, [fy]);

  const rows = useMemo(() => (tb?.rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())), [tb, q]);

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

      {tb && (tb.balanced
        ? <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span>Trial balance is <b>balanced</b> — total debit equals total credit ({inr(tb.totalDebit)}).</span></div>
        : <div className="alert err"><Alert01Icon size={16} color="currentColor" /> <span>Out of balance by <b>{inr(Math.abs(tb.totalDebit - tb.totalCredit))}</b> — check unposted or draft vouchers.</span></div>
      )}

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
                  <td className="amt">{inr(r.debit)}</td>
                  <td className="amt">{inr(r.credit)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4}><div className="empty">No ledgers match your filter.</div></td></tr>}
            </tbody>
            {tb && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                  <td style={{ paddingLeft: 18, fontWeight: 700 }}>Total</td>
                  <td />
                  <td className="amt" style={{ fontSize: 14 }}>{inr(tb.totalDebit)}</td>
                  <td className="amt" style={{ fontSize: 14 }}>{inr(tb.totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AppShell>
  );
}
