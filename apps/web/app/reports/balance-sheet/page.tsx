'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download01Icon, PrinterIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, ReportBanner, reconcile, money } from '../../../lib/components';
import { getBalanceSheet, type BalanceSheet, type BsRow } from '../../../lib/api';

function Side({ title, groups, grand, suspense }: { title: string; groups: { label?: string; rows: BsRow[] }[]; grand: number; suspense: number }) {
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3></div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <tbody>
            {groups.map((g, gi) => (
              <ReactFragmentGroup key={gi} label={g.label} rows={g.rows} />
            ))}
            {suspense > 0 && (
              <tr style={{ background: 'var(--red-tint)' }}>
                <td className="party" style={{ color: 'var(--red-ink)' }}>Difference (suspense)</td>
                <td className="amt" style={{ color: 'var(--red-ink)' }}>{money(suspense)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr><td>Total {title}</td><td className="amt">{money(grand)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ReactFragmentGroup({ label, rows }: { label?: string; rows: BsRow[] }): ReactNode {
  return (
    <>
      {label && (
        <tr><td colSpan={2} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '.05em', color: 'var(--text-3)', paddingTop: 14 }}>{label}</td></tr>
      )}
      {rows.map((r) => (
        <tr key={r.name}>
          <td className="party">{r.name}</td>
          <td className="amt">{money(r.amount)}</td>
        </tr>
      ))}
    </>
  );
}

export default function BalanceSheetPage() {
  const [bs, setBs] = useState<BalanceSheet | null>(null);
  const [fy, setFy] = useState('2026-27');
  useEffect(() => { getBalanceSheet().then(setBs).catch(() => {}); }, [fy]);

  const rec = bs ? reconcile(bs.totalAssets, bs.totalLiabEquity) : null;
  const grand = rec ? rec.grand : 0;
  const assetsSuspense = bs && rec && !rec.balanced && bs.totalAssets < grand ? grand - bs.totalAssets : 0;
  const liabSuspense = bs && rec && !rec.balanced && bs.totalLiabEquity < grand ? grand - bs.totalLiabEquity : 0;
  const empty = !!bs && bs.assets.length === 0 && bs.liabilities.length === 0 && bs.equity.length === 0;

  return (
    <AppShell crumb="Reports / Balance Sheet">
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports · as on 27 Jul 2026</div>
          <h1 className="display">Balance Sheet</h1>
          <p>What the business owns (assets) against what it owes and the owners' funds (liabilities &amp; equity). The two sides must be equal.</p>
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
      </div>

      {bs && <ReportBanner debit={bs.totalAssets} credit={bs.totalLiabEquity} empty={empty} label="total assets equals liabilities plus equity" />}

      {bs && !empty && (
        <div className="ui-grid">
          <Side title="Assets" grand={grand} suspense={assetsSuspense} groups={[{ rows: bs.assets }]} />
          <Side title="Liabilities & Equity" grand={grand} suspense={liabSuspense} groups={[{ label: 'Liabilities', rows: bs.liabilities }, { label: 'Equity', rows: bs.equity }]} />
        </div>
      )}
    </AppShell>
  );
}
