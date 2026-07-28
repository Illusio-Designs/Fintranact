'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardSquare01Icon, Add01Icon, Tick02Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { getWidgets, getRoleList, type Widget } from '../../lib/api';

const GROUPS = ['All', 'Finance', 'Compliance', 'Job Work', 'Payroll', 'Audit'] as const;

export default function WidgetsPage() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    getWidgets().then((w) => { setWidgets(w); setAdded(new Set(w.filter((x) => x.defaultOn).map((x) => x.key))); }).catch(() => {});
    getRoleList().then((rs) => setRoleNames(Object.fromEntries(rs.map((r) => [r.key, r.name])))).catch(() => {});
  }, []);

  const list = useMemo(
    () =>
      widgets.filter((w) => (group === 'All' || w.group === group))
        .filter((w) => (q ? (w.name + w.desc).toLowerCase().includes(q.toLowerCase()) : true)),
    [q, group, widgets],
  );

  function toggle(key: string) {
    setAdded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <AppShell crumb="Widgets">
      <div className="page-head">
        <div>
          <div className="eyebrow">Dashboard · widget library</div>
          <h1 className="display">Widgets</h1>
          <p>{widgets.length} widgets · <b>{added.size}</b> on your dashboard. Add or remove to customise your role-based dashboard.</p>
        </div>
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
        <div className="search" style={{ width: 260 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search widgets…" style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} />
        </div>
        <div className="seg" role="tablist">
          {GROUPS.map((g) => (
            <button key={g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* gallery */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
        {list.map((w) => {
          const on = added.has(w.key);
          return (
            <div className="card" key={w.key} style={{ padding: 15 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', background: on ? 'var(--red)' : 'var(--paper)', color: on ? '#fff' : 'var(--text-2)', border: on ? 0 : '1px solid var(--line)' }}>
                  <DashboardSquare01Icon size={20} color="currentColor" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 14 }}>{w.name}</b>
                    <span className="pill neut" style={{ marginLeft: 'auto' }}>{w.size === 'L' ? 'wide' : w.size === 'M' ? 'half' : 'small'}</span>
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 3 }}>{w.desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {w.roles.slice(0, 3).map((r) => (
                  <span key={r} className="tag">{roleNames[r] ?? r}</span>
                ))}
                {w.roles.length > 3 && <span className="tag">+{w.roles.length - 3}</span>}
                <button
                  onClick={() => toggle(w.key)}
                  className={`btn ${on ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12.5 }}
                >
                  {on ? <><Tick02Icon size={15} color="currentColor" /> Added</> : <><Add01Icon size={15} color="currentColor" /> Add</>}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {list.length === 0 && (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>No widgets match “{q}”.</p>
      )}
    </AppShell>
  );
}
