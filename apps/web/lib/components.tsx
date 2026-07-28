'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon } from 'hugeicons-react';

/** Shared design-system components: custom Dropdown + Calendar / DatePicker + report primitives. */

/** Money formatter used across every report (whole rupees, Indian grouping). */
export const money = (n: number): string => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : '—');

/** Reconcile a debit/credit pair: is it balanced, and by how much is it short and on which side. */
export function reconcile(debit: number, credit: number): { balanced: boolean; diff: number; shortSide: 'debit' | 'credit' | null; grand: number } {
  const d = Math.round(debit * 100), c = Math.round(credit * 100);
  const balanced = d === c;
  const diff = Math.abs(debit - credit);
  const shortSide = balanced ? null : d > c ? 'credit' : 'debit';
  return { balanced, diff, shortSide, grand: Math.max(debit, credit) };
}

/**
 * Standard balance banner for reports. Shows an info state when there is no data,
 * a success state when debit === credit, and an error state (with the difference)
 * when the two sides don't tally — so a mismatch is never shown silently.
 */
export function ReportBanner({ debit, credit, empty, label = 'total debit equals total credit' }: { debit: number; credit: number; empty?: boolean; label?: string }) {
  if (empty) {
    return <div className="alert info"><InformationCircleIcon size={16} color="currentColor" /> <span>No postings in this period yet — nothing to report.</span></div>;
  }
  const { balanced, diff } = reconcile(debit, credit);
  return balanced
    ? <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span>Balanced — {label} ({money(debit)}).</span></div>
    : <div className="alert err"><Alert01Icon size={16} color="currentColor" /> <span><b>Out of balance by {money(diff)}.</b> A difference (suspense) line is shown below so the columns foot — investigate unposted, draft or mis-posted vouchers before filing.</span></div>;
}

const Caret = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M6 9l6 6 6-6" /></svg>
);
const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ marginLeft: 'auto', color: 'var(--red)' }}><path d="M5 12l4 4L19 6" /></svg>
);

export type Opt = { value: string; label: string; hint?: string };

/** Custom dropdown — styled trigger + menu, outside-click close, optional search. */
export function Dropdown({
  value, onChange, options, placeholder = 'Select…', width, searchable, icon,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
  width?: number | string;
  searchable?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const sel = options.find((o) => o.value === value);
  const auto = searchable ?? options.length > 8;
  const list = auto && q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="dd" ref={ref} style={{ width }}>
      <button type="button" className="dd-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {icon}
        <span className={sel ? '' : 'dd-ph'}>{sel ? sel.label : placeholder}</span>
        <Caret />
      </button>
      {open && (
        <div className="dropdown-menu dd-menu" role="listbox">
          {auto && (
            <input className="dd-search" autoFocus value={q} placeholder="Search…" onChange={(e) => setQ(e.target.value)} />
          )}
          {list.map((o) => (
            <button key={o.value} className={o.value === value ? 'on' : ''} role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {o.label}
                {o.hint && <small style={{ color: 'var(--text-3)', fontSize: 11 }}>{o.hint}</small>}
              </span>
              {o.value === value && <Tick />}
            </button>
          ))}
          {list.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: 12.5 }}>No matches</div>}
        </div>
      )}
    </div>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()}`;

/** Month-grid calendar. Controlled by `selected`; manages its own view month. */
export function Calendar({ selected, onSelect }: { selected?: Date; onSelect: (d: Date) => void }) {
  const [view, setView] = useState(() => {
    const b = selected ?? new Date(2026, 6, 28);
    return { y: b.getFullYear(), m: b.getMonth() };
  });
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => { setToday(iso(new Date())); }, []);

  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const selIso = selected ? iso(selected) : '';
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const move = (delta: number) => setView((s) => { const d = new Date(s.y, s.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => move(-1)} aria-label="Previous month"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 6l-6 6 6 6" /></svg></button>
        <b>{MONTHS[view.m]} {view.y}</b>
        <button className="cal-nav" onClick={() => move(1)} aria-label="Next month"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <div className="cal-grid">
        {WD.map((w, i) => <div className="wd" key={i}>{w}</div>)}
        {cells.map((d, i) => d === null
          ? <span key={i} />
          : (() => {
            const cur = new Date(view.y, view.m, d);
            const ci = iso(cur);
            return <button key={i} className={`cal-day ${ci === selIso ? 'sel' : ''} ${ci === today ? 'today' : ''}`} onClick={() => onSelect(cur)}>{d}</button>;
          })())}
      </div>
    </div>
  );
}

/** Date input with a calendar popover. */
export function DatePicker({ value, onChange, width }: { value?: Date; onChange: (d: Date) => void; width?: number | string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="dp" ref={ref} style={{ width }}>
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} style={{ color: 'var(--text-3)' }}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
        <span className={value ? '' : 'dd-ph'}>{value ? fmtDate(value) : 'Pick a date'}</span>
      </button>
      {open && (
        <div className="dp-pop">
          <Calendar selected={value} onSelect={(d) => { onChange(d); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
