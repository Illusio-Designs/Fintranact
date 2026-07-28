'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar03Icon, Download01Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { Dropdown, money } from '../../lib/components';
import { getCompliance, type ComplianceItem } from '../../lib/api';

const kindTag: Record<ComplianceItem['kind'], string> = { gst: 'GST', tds: 'TDS', tcs: 'TCS', pf: 'PF/ESI', roc: 'ROC' };

export default function CompliancePage() {
  const [rows, setRows] = useState<ComplianceItem[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => { getCompliance().then(setRows).catch(() => {}); }, []);
  const list = useMemo(() => [...rows].filter((r) => filter === 'all' || r.kind === filter).sort((a, b) => a.days - b.days), [rows, filter]);
  const dueSoon = rows.filter((r) => r.status === 'due' && r.days <= 7).length;

  return (
    <AppShell crumb="Compliance Calendar">
      <div className="page-head">
        <div>
          <div className="eyebrow">Compliance · statutory due dates</div>
          <h1 className="display">Compliance Calendar</h1>
          <p>Every GST, TDS/TCS, PF/ESI and ROC due date in one place, ranked by urgency. File on time to avoid interest &amp; late fees.</p>
        </div>
        <button className="btn btn-primary"><Download01Icon size={15} color="currentColor" /> Export ICS</button>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Head</span>
          <Dropdown width={160} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All heads' }, { value: 'gst', label: 'GST' }, { value: 'tds', label: 'TDS / TCS' }, { value: 'pf', label: 'PF / ESI' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Due this week</div><div className="value num">{dueSoon}</div><div className="delta down">Act now</div></div>
        <div className="tile"><div className="label">Upcoming (30 d)</div><div className="value num">{rows.filter((r) => r.status === 'due').length}</div></div>
        <div className="tile accent"><div className="label">Filed this cycle</div><div className="value num">{rows.filter((r) => r.status === 'filed').length}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Upcoming filings</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Form</th><th>Head</th><th>Period</th><th>Due date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td className="party"><Calendar03Icon size={13} color="var(--text-3)" style={{ verticalAlign: '-2px', marginRight: 6 }} />{r.form}</td>
                  <td><span className="pill neut">{kindTag[r.kind]}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.period}</td>
                  <td style={{ fontSize: 12.5 }}>{r.due}</td>
                  <td className="amt">{r.amount != null ? money(r.amount) : '—'}</td>
                  <td>{r.status === 'filed' ? <span className="pill ok">Filed</span> : <span className={`pill ${r.days <= 4 ? 'crit' : r.days <= 10 ? 'warn' : 'neut'}`}>{r.days} days</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
