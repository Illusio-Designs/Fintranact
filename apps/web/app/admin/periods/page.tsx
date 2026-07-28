'use client';

import { useEffect, useMemo, useState } from 'react';
import { LockedIcon, SquareUnlock02Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { listPeriodLocks, lockPeriod, unlockPeriod, type PeriodLock } from '../../../lib/api';

const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const label = (p: string) => new Date(p + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export default function PeriodsPage() {
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [period, setPeriod] = useState('2026-06');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => listPeriodLocks().then(setLocks).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const lockedSet = useMemo(() => new Set(locks.map((l) => l.period)), [locks]);

  async function onLock() {
    setBusy(true);
    await lockPeriod(period, note || 'Closed after review');
    setNote(''); await refresh(); setBusy(false);
  }
  async function onUnlock(p: string) {
    setBusy(true);
    await unlockPeriod(p); await refresh(); setBusy(false);
  }

  return (
    <AppShell crumb="Masters / Financial Year">
      <div className="page-head">
        <div>
          <div className="eyebrow">Controls · period close</div>
          <h1 className="display">Financial Year &amp; Period Locks</h1>
          <p>Close an accounting month so no voucher can be posted, edited or deleted in it. Reopening a closed month is privileged and fully audited.</p>
        </div>
      </div>

      <div className="alert info"><Alert01Icon size={16} color="currentColor" /> <span>Posting a voucher dated in a locked month is rejected by the server (<code>Period YYYY-MM is locked</code>). Lock a month only after its GST &amp; TDS returns are filed.</span></div>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>Close a month</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>Period</label>
              <Dropdown width="100%" value={period} onChange={setPeriod} options={MONTHS.map((m) => ({ value: m, label: label(m), hint: lockedSet.has(m) ? 'already locked' : undefined }))} />
            </div>
            <div className="field"><label>Note (reason)</label><input className="ctl" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. GSTR-3B & 26Q filed" /></div>
            <div>
              <button className="btn btn-primary" disabled={busy || lockedSet.has(period)} onClick={onLock}>
                <LockedIcon size={15} color="currentColor" /> {lockedSet.has(period) ? 'Already locked' : 'Lock period'}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Locked periods</h3><span className="csub" style={{ marginLeft: 'auto' }}>{locks.length} closed</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Period</th><th>Note</th><th>Locked by</th><th>On</th><th /></tr></thead>
              <tbody>
                {locks.map((l) => (
                  <tr key={l.period}>
                    <td className="vno"><LockedIcon size={13} color="var(--red)" style={{ verticalAlign: '-2px', marginRight: 6 }} />{label(l.period)}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{l.note ?? '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{l.lockedBy ?? '—'}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{l.lockedAt.slice(0, 10)}</td>
                    <td style={{ textAlign: 'right' }}><button className="mini" disabled={busy} onClick={() => onUnlock(l.period)}><SquareUnlock02Icon size={13} color="currentColor" /> Unlock</button></td>
                  </tr>
                ))}
                {locks.length === 0 && <tr><td colSpan={5}><div className="empty">No periods are locked yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
