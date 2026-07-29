'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Notification03Icon, Cancel01Icon, CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon, Tick02Icon, ArrowRight01Icon } from 'hugeicons-react';
import { type Notif } from './api';

const icon = (k: Notif['kind']) => k === 'crit' || k === 'warn' ? <Alert01Icon size={16} color="currentColor" /> : k === 'ok' ? <CheckmarkCircle02Icon size={16} color="currentColor" /> : <InformationCircleIcon size={16} color="currentColor" />;

/** Right-side notifications drawer, driven by shared state from AppShell. */
export function NotificationDrawer({ open, onClose, items, setItems }: {
  open: boolean; onClose: () => void; items: Notif[]; setItems: (n: Notif[]) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'all' | 'task' | 'alert'>('all');
  const filtered = useMemo(() => items.filter((n) => tab === 'all' || n.cat === tab), [items, tab]);
  const list = filtered.slice(0, 6); // drawer shows recent; full list lives on the page
  const unread = items.filter((n) => !n.read).length;
  const seeAll = () => { onClose(); router.push('/notifications'); };
  const counts = { all: items.length, task: items.filter((n) => n.cat === 'task').length, alert: items.filter((n) => n.cat === 'alert').length };

  const markRead = (id: number | string) => setItems(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems(items.map((n) => ({ ...n, read: true })));

  // group by day preserving order
  const grouped: { day: string; rows: Notif[] }[] = [];
  for (const n of list) {
    const last = grouped[grouped.length - 1];
    if (last && last.day === n.day) last.rows.push(n);
    else grouped.push({ day: n.day, rows: [n] });
  }

  return (
    <>
      <div className="nt-scrim" style={{ display: open ? 'block' : 'none' }} onClick={onClose} />
      <aside className="ntpanel" style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }} aria-label="Notifications" aria-hidden={!open}>
        <div className="nt-head">
          <div className="nt-ic"><Notification03Icon size={17} color="currentColor" /></div>
          <div>
            <h2>Notifications</h2>
            <div className="nt-sub">{unread ? <><b>{unread} unread</b></> : 'All caught up'}</div>
          </div>
          <button className="nt-close" onClick={onClose} aria-label="Close"><Cancel01Icon size={16} color="currentColor" /></button>
        </div>

        <div className="nt-tabs">
          {(['all', 'task', 'alert'] as const).map((t) => (
            <button key={t} className={`nt-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'all' ? 'All' : t === 'task' ? 'Tasks' : 'Alerts'} <span className="c">{counts[t]}</span>
            </button>
          ))}
        </div>

        <div className="nt-list">
          {grouped.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nothing here — you’re all caught up.</div>}
          {grouped.map((g) => (
            <div key={g.day}>
              <div className="nt-day">{g.day}</div>
              {g.rows.map((n) => (
                <div className={`nt-item ${n.read ? 'read' : ''}`} key={n.id} onClick={() => markRead(n.id)}>
                  <div className={`nic ${n.kind}`}>{icon(n.kind)}</div>
                  <div className="ntxt">
                    <b>{n.title}</b>
                    <span>{n.body}</span>
                    <div className="chips">{n.chips.map((c, i) => <span key={i} className={`nchip ${i === 0 ? 'do' : ''}`}>{c}</span>)}</div>
                  </div>
                  <div className="nmeta"><span className="ntime">{n.time}</span>{!n.read && <span className="unread" />}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="nt-foot">
          <button onClick={markAll}><Tick02Icon size={14} color="currentColor" /> Mark all read</button>
          <button onClick={seeAll}>See all{filtered.length > list.length ? ` (${filtered.length})` : ''} <ArrowRight01Icon size={14} color="currentColor" /></button>
        </div>
      </aside>
    </>
  );
}
