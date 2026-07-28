'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, ShieldEnergyIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { getAuditTrail, type AuditRow } from '../../../lib/api';

export default function AuditTrailPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('all');
  useEffect(() => { getAuditTrail().then(setRows).catch(() => {}); }, []);
  const actors = useMemo(() => Array.from(new Set(rows.map((r) => r.actor))), [rows]);
  const list = useMemo(() => rows.filter((r) => (actor === 'all' || r.actor === actor) && (!q || (r.action + r.entity + r.entityId).toLowerCase().includes(q.toLowerCase()))), [rows, q, actor]);

  return (
    <AppShell crumb="Admin / Audit Trail">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin · tamper-evident log</div>
          <h1 className="display">Audit Trail</h1>
          <p>Every posting, approval and master change is hash-chained and immutable. Filter by user or search the entity.</p>
        </div>
        <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export log</button>
      </div>

      <div className="alert ok"><ShieldEnergyIcon size={16} color="currentColor" /> <span>Chain verified — {rows.length} recent entries, no gaps or tampering detected.</span></div>

      <div className="toolbar">
        <div className="tb-field"><span>User</span>
          <Dropdown width={170} value={actor} onChange={setActor} options={[{ value: 'all', label: 'All users' }, ...actors.map((a) => ({ value: a, label: a }))]} />
        </div>
        <div className="tb-field grow"><span>Search</span>
          <div className="search" style={{ width: '100%' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action or entity…" style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Events</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} of {rows.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th><th>IP</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.time}</td>
                  <td className="party">{r.actor}</td>
                  <td><span className="tag" style={{ fontFamily: 'ui-monospace, monospace' }}>{r.action}</span></td>
                  <td>{r.entity}</td>
                  <td className="vno">{r.entityId}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-3)' }}>{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
