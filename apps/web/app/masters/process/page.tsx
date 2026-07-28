'use client';

import { useEffect, useState } from 'react';
import { Add01Icon, PencilEdit01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, RowMenu } from '../../../lib/components';
import { getProcessMasters, type ProcessMaster } from '../../../lib/api';

export default function ProcessMasterPage() {
  const [rows, setRows] = useState<ProcessMaster[]>([]);
  const [form, setForm] = useState({ code: '', name: '', sac: '9988', uom: 'Per kg' });
  useEffect(() => { getProcessMasters().then(setRows).catch(() => {}); }, []);

  const add = () => {
    if (!form.code || !form.name) return;
    setRows((r) => [...r, { ...form, turnaround: '—', active: true }]);
    setForm({ code: '', name: '', sac: '9988', uom: 'Per kg' });
  };

  return (
    <AppShell crumb="Masters / Process Master">
      <div className="page-head">
        <div>
          <div className="eyebrow">Masters · heat-treatment processes</div>
          <h1 className="display">Process Master</h1>
          <p>Processes drive inward challans, job cards and the Rate Master. This is a job-work house — no manufacturing BOM.</p>
        </div>
      </div>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>Add process</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid2">
              <div className="field"><label>Code</label><input className="ctl" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CARB" /></div>
              <div className="field"><label>SAC</label><input className="ctl" value={form.sac} onChange={(e) => setForm({ ...form, sac: e.target.value })} /></div>
            </div>
            <div className="field"><label>Process name</label><input className="ctl" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Carburising" /></div>
            <div className="field"><label>Charge basis (UoM)</label>
              <Dropdown width="100%" value={form.uom} onChange={(v) => setForm({ ...form, uom: v })} options={[{ value: 'Per kg', label: 'Per kg' }, { value: 'Per piece', label: 'Per piece' }, { value: 'Per lot', label: 'Per lot' }]} />
            </div>
            <div><button className="btn btn-primary" onClick={add} disabled={!form.code || !form.name}><Add01Icon size={15} color="currentColor" /> Add process</button></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Processes</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length}</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>SAC</th><th>UoM</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td className="vno">{r.code}</td>
                    <td className="party">{r.name}</td>
                    <td>{r.sac}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.uom}</td>
                    <td><span className={`pill ${r.active ? 'ok' : 'neut'}`}>{r.active ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="rowacts"><span className="tip"><button className="ib"><PencilEdit01Icon size={16} color="currentColor" /></button><span className="tip-txt">Edit</span></span><RowMenu items={[{ label: r.active ? 'Deactivate' : 'Activate' }, { label: 'Delete', danger: true }]} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
