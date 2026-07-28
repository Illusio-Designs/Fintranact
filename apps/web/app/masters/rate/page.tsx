'use client';

import { useEffect, useState } from 'react';
import { Add01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, RowMenu } from '../../../lib/components';
import { getRateMasters, type RateMaster } from '../../../lib/api';

const PROCESSES = ['Carburising', 'Hardening & Tempering', 'Annealing', 'Nitriding', 'Induction Hardening'];
const CUSTOMERS = ['All customers (standard)', 'Mahalaxmi Traders', 'Tata Motors Ltd', 'Shree Balaji Enterprises'];

export default function RateMasterPage() {
  const [rows, setRows] = useState<RateMaster[]>([]);
  const [form, setForm] = useState({ process: 'Carburising', customer: 'All customers (standard)', rate: '' });
  useEffect(() => { getRateMasters().then(setRows).catch(() => {}); }, []);

  const add = () => {
    const rate = parseFloat(form.rate);
    if (!rate) return;
    setRows((r) => [...r, { process: form.process, customer: form.customer, rate, effective: '01 Apr 2026' }]);
    setForm({ ...form, rate: '' });
  };

  return (
    <AppShell crumb="Masters / Rate Master">
      <div className="page-head">
        <div>
          <div className="eyebrow">Masters · process rate card (₹/kg)</div>
          <h1 className="display">Rate Master</h1>
          <p>Standard and customer-specific contract rates. A customer rate overrides the standard rate on inward challans and job cards.</p>
        </div>
      </div>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>Add rate</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>Process</label><Dropdown width="100%" value={form.process} onChange={(v) => setForm({ ...form, process: v })} options={PROCESSES.map((p) => ({ value: p, label: p }))} /></div>
            <div className="field"><label>Customer</label><Dropdown searchable width="100%" value={form.customer} onChange={(v) => setForm({ ...form, customer: v })} options={CUSTOMERS.map((c) => ({ value: c, label: c }))} /></div>
            <div className="field"><label>Rate ₹/kg</label><div className="input-prefix"><span className="pfx">₹</span><input value={form.rate} inputMode="decimal" onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="0.00" /></div></div>
            <div><button className="btn btn-primary" onClick={add} disabled={!parseFloat(form.rate)}><Add01Icon size={15} color="currentColor" /> Add rate</button></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Rate card</h3><span className="csub" style={{ marginLeft: 'auto' }}>{rows.length}</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Process</th><th>Customer</th><th style={{ textAlign: 'right' }}>Rate ₹/kg</th><th>Effective</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="party">{r.process}</td>
                    <td style={{ fontSize: 12.5 }}>{r.customer.includes('standard') ? <span className="pill neut">standard</span> : <span className="pill ok">contract</span>} {r.customer.replace(' (standard)', '')}</td>
                    <td className="amt">₹{r.rate.toFixed(2)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.effective}</td>
                    <td><div className="rowacts"><RowMenu items={[{ label: 'Edit rate' }, { label: 'End rate', danger: true }]} /></div></td>
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
