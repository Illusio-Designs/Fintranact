'use client';

import { useEffect, useState } from 'react';
import { Add01Icon, Tick02Icon, Cancel01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { showSuccess, showError } from '../../../lib/success';
import { getLeave, applyLeave, decideLeave, type LeaveRequest } from '../../../lib/api';

const TYPES = [
  { value: 'casual', label: 'Casual leave' }, { value: 'sick', label: 'Sick leave' },
  { value: 'earned', label: 'Earned leave' }, { value: 'unpaid', label: 'Unpaid leave' },
];
const pill: Record<LeaveRequest['status'], string> = { pending: 'warn', approved: 'ok', rejected: 'crit' };
const fmt = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function LeavePage() {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [f, setF] = useState({ employeeName: '', type: 'casual', fromDate: '', toDate: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const load = () => getLeave().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const pending = rows.filter((r) => r.status === 'pending').length;

  async function apply() {
    if (!f.employeeName || !f.fromDate || !f.toDate) return;
    setBusy(true);
    try {
      await applyLeave(f);
      setF({ employeeName: '', type: 'casual', fromDate: '', toDate: '', reason: '' });
      await load();
      showSuccess({ title: 'Leave applied', rows: [['Employee', f.employeeName], ['Type', f.type], ['Status', 'Pending approval']] });
    } catch (e) { showError('Could not apply leave', [['Reason', (e as Error).message]]); }
    finally { setBusy(false); }
  }

  async function decide(r: LeaveRequest, decision: 'approved' | 'rejected') {
    try {
      await decideLeave(r.id, decision, 'Rajesh J.');
      await load();
      showSuccess({ title: `Leave ${decision}`, rows: [['Employee', r.employeeName], ['Days', String(r.days)]] });
    } catch (e) { showError('Could not update', [['Reason', (e as Error).message]]); }
  }

  return (
    <AppShell crumb="Payroll & HR / Attendance & Leave">
      <div className="page-head">
        <div>
          <div className="eyebrow">Payroll & HR · leave</div>
          <h1 className="display">Attendance &amp; Leave</h1>
          <p>Employees apply for leave; the payroll manager approves or rejects. Approved leave feeds the payroll run (LOP / paid).</p>
        </div>
      </div>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>Apply for leave</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Employee</label><input className="ctl" value={f.employeeName} onChange={(e) => setF({ ...f, employeeName: e.target.value })} placeholder="Employee name" /></div>
            <div className="field"><label>Leave type</label><Dropdown width="100%" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={TYPES} /></div>
            <div className="grid2">
              <div className="field"><label>From</label><input className="ctl" type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></div>
              <div className="field"><label>To</label><input className="ctl" type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></div>
            </div>
            <div className="field"><label>Reason</label><textarea className="ctl" rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Optional" /></div>
            <div><button className="btn btn-primary" disabled={busy || !f.employeeName || !f.fromDate || !f.toDate} onClick={apply}><Add01Icon size={15} color="currentColor" /> {busy ? 'Applying…' : 'Apply for leave'}</button></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Leave applications</h3><span className="pill warn" style={{ marginLeft: 'auto' }}>{pending} pending</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th style={{ textAlign: 'right' }}>Days</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="party">{r.employeeName}{r.reason && <small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.reason}</small>}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{fmt(r.fromDate)} → {fmt(r.toDate)}</td>
                    <td className="amt">{r.days}</td>
                    <td><span className={`pill ${pill[r.status]}`}>{r.status}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.status === 'pending' ? (
                        <>
                          <button className="mini go" onClick={() => decide(r, 'approved')}><Tick02Icon size={13} color="currentColor" /> Approve</button>
                          <button className="mini" style={{ marginLeft: 6 }} onClick={() => decide(r, 'rejected')}><Cancel01Icon size={13} color="currentColor" /> Reject</button>
                        </>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.approver ?? ''}</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No leave applications yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
