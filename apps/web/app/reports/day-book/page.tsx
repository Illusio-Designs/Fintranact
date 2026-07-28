'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, PrinterIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { DatePicker, Dropdown, ReportBanner, money } from '../../../lib/components';
import { getDayBook, type DayBook } from '../../../lib/api';

const inr = money;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const typePill: Record<string, string> = { sales: 'ok', receipt: 'ok', purchase: 'warn', payment: 'crit', journal: 'neut', contra: 'neut' };

export default function DayBookPage() {
  const [date, setDate] = useState<Date>(new Date(2026, 6, 27));
  const [type, setType] = useState('all');
  const [db, setDb] = useState<DayBook | null>(null);

  useEffect(() => { getDayBook(iso(date)).then(setDb).catch(() => {}); }, [date]);

  const entries = useMemo(() => (db?.entries ?? []).filter((e) => type === 'all' || e.type === type), [db, type]);

  return (
    <AppShell crumb="Reports / Day Book">
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports · chronological journal</div>
          <h1 className="display">Day Book</h1>
          <p>Every voucher posted on the selected day, in the order it was entered. The book's debit and credit totals always agree.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><PrinterIcon size={15} color="currentColor" /> Print</button>
          <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Date</span><DatePicker width={170} value={date} onChange={setDate} /></div>
        <div className="tb-field"><span>Voucher type</span>
          <Dropdown width={170} value={type} onChange={setType} options={[{ value: 'all', label: 'All types' }, { value: 'sales', label: 'Sales' }, { value: 'purchase', label: 'Purchase' }, { value: 'receipt', label: 'Receipt' }, { value: 'payment', label: 'Payment' }, { value: 'journal', label: 'Journal' }]} />
        </div>
      </div>

      {db && <ReportBanner debit={db.totalDebit} credit={db.totalCredit} empty={db.entries.length === 0} label="the day's debit equals its credit" />}

      <div className="card">
        <div className="card-head"><h3>Entries</h3><span className="csub" style={{ marginLeft: 'auto' }}>{entries.length} vouchers</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Voucher</th><th>Type</th><th>Particulars</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.voucherId}>
                  <td className="vno">{e.voucherNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{e.narration}</small></td>
                  <td><span className={`pill ${typePill[e.type] ?? 'neut'}`}>{e.type}</span></td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12.5, maxWidth: 340 }}>{e.particulars}</td>
                  <td className="amt">{inr(e.debit)}</td>
                  <td className="amt">{inr(e.credit)}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={5}><div className="empty">No vouchers posted on this day.</div></td></tr>}
            </tbody>
            {db && entries.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
                  <td style={{ paddingLeft: 18, fontWeight: 700 }} colSpan={3}>Total for {db.date}</td>
                  <td className="amt" style={{ fontSize: 14 }}>{inr(db.totalDebit)}</td>
                  <td className="amt" style={{ fontSize: 14 }}>{inr(db.totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AppShell>
  );
}
