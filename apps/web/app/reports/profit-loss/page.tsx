'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download01Icon, PrinterIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { getPnl, type Pnl, type PnlRow } from '../../../lib/api';

const inr = money;
const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : '—');

function Section({ title, rows, total, tone }: { title: string; rows: PnlRow[]; total: number; tone?: 'income' | 'exp' }) {
  return (
    <>
      <div className="kv" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        <span className="k" style={{ fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.05em' }}>{title}</span>
        <span className="v" style={{ fontWeight: 700 }}>{inr(total)}</span>
      </div>
      {rows.map((r) => (
        <div className="kv" key={r.name}>
          <span className="k">{r.name}</span>
          <span className="v" style={{ color: tone === 'income' ? 'var(--good)' : 'var(--text)' }}>{inr(r.amount)}</span>
        </div>
      ))}
    </>
  );
}
function ProfitRow({ label, value, whole, strong }: { label: ReactNode; value: number; whole: number; strong?: boolean }) {
  const good = value >= 0;
  return (
    <div className="kv" style={strong ? { borderTop: '2px solid var(--line)', paddingTop: 12, marginTop: 4 } : undefined}>
      <span className="k" style={{ fontWeight: strong ? 800 : 700, color: 'var(--text)', fontSize: strong ? 14 : 13 }}>{label}</span>
      <span className="v" style={{ fontSize: strong ? 17 : 15, fontWeight: 800, color: good ? 'var(--good)' : 'var(--red-ink)' }}>
        {inr(value)} <small style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>· {pct(value, whole)} margin</small>
      </span>
    </div>
  );
}

export default function ProfitLossPage() {
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [fy, setFy] = useState('2026-27');
  useEffect(() => { getPnl().then(setPnl).catch(() => {}); }, [fy]);

  return (
    <AppShell crumb="Reports / Profit & Loss">
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports · FY 2026–27 · as on 27 Jul 2026</div>
          <h1 className="display">Profit &amp; Loss</h1>
          <p>Income less cost of sales gives gross profit; less indirect expenses gives net profit.</p>
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

      {pnl && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 4 }}>
            <div className="tile"><div className="label">Revenue</div><div className="value num">{inr(pnl.totalIncome)}</div><div className="delta">Job work + recovery</div></div>
            <div className="tile"><div className="label">Gross Profit</div><div className="value num">{inr(pnl.grossProfit)}</div><div className="delta up">▲ {pct(pnl.grossProfit, pnl.totalIncome)} margin</div></div>
            <div className="tile accent"><div className="label">Net Profit</div><div className="value num">{inr(pnl.netProfit)}</div><div className="delta up">{pct(pnl.netProfit, pnl.totalIncome)} of revenue</div></div>
          </section>

          <div className="ui-grid">
            <div className="card">
              <div className="card-head"><h3>Income &amp; cost of sales</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Section title="Income" rows={pnl.income} total={pnl.totalIncome} tone="income" />
                <div style={{ height: 8 }} />
                <Section title="Direct expenses (cost of sales)" rows={pnl.directExpense} total={pnl.totalDirect} tone="exp" />
                <ProfitRow label="Gross Profit" value={pnl.grossProfit} whole={pnl.totalIncome} strong />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>Indirect expenses</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Section title="Indirect / operating expenses" rows={pnl.indirectExpense} total={pnl.totalIndirect} tone="exp" />
                <ProfitRow label="Net Profit (before tax)" value={pnl.netProfit} whole={pnl.totalIncome} strong />
                <div className="qp-note" style={{ marginTop: 12 }}>Gross profit {inr(pnl.grossProfit)} − indirect {inr(pnl.totalIndirect)} = net profit {inr(pnl.netProfit)}. Depreciation, interest and tax are part of indirect expenses.</div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
