'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon, Tick02Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { getNotifications, type Notif } from '../../lib/api';

const icon = (k: Notif['kind']) => k === 'crit' || k === 'warn'
  ? <Alert01Icon size={16} color="currentColor" />
  : k === 'ok' ? <CheckmarkCircle02Icon size={16} color="currentColor" />
  : <InformationCircleIcon size={16} color="currentColor" />;

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [tab, setTab] = useState<'all' | 'task' | 'alert'>('all');
  useEffect(() => { getNotifications().then(setItems).catch(() => {}); }, []);

  const list = useMemo(() => items.filter((n) => tab === 'all' || n.cat === tab), [items, tab]);
  const unread = items.filter((n) => !n.read).length;
  const counts = { all: items.length, task: items.filter((n) => n.cat === 'task').length, alert: items.filter((n) => n.cat === 'alert').length };
  const markRead = (id: number | string) => setItems(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems(items.map((n) => ({ ...n, read: true })));

  const grouped: { day: string; rows: Notif[] }[] = [];
  for (const n of list) {
    const last = grouped[grouped.length - 1];
    if (last && last.day === n.day) last.rows.push(n); else grouped.push({ day: n.day, rows: [n] });
  }

  return (
    <AppShell crumb="Notifications">
      <div className="page-head">
        <div>
          <div className="eyebrow">Overview · notifications</div>
          <h1 className="display">Notifications</h1>
          <p>{unread ? `${unread} unread` : 'All caught up'} · tasks, compliance alerts and system events.</p>
        </div>
        <button className="btn btn-ghost" onClick={markAll}><Tick02Icon size={15} color="currentColor" /> Mark all read</button>
      </div>

      <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
        {(['all', 'task', 'alert'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'task' ? 'Tasks' : 'Alerts'} <span className="c">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="nt-list" style={{ position: 'static' }}>
          {grouped.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nothing here — you’re all caught up.</div>}
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
      </div>
    </AppShell>
  );
}
