'use client';

import { useEffect, useState } from 'react';
import { Download01Icon, TruckIcon, Add01Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { showSuccess, showError } from '../../../lib/success';
import { getEWayBills, generateEway, getIntegrationsStatus, type EWayRow } from '../../../lib/api';

const statusPill: Record<EWayRow['status'], { label: string; pill: string }> = {
  active: { label: 'Active', pill: 'ok' }, pending: { label: 'Pending', pill: 'crit' }, expired: { label: 'Expired', pill: 'warn' },
};

export default function EWayPage() {
  const [rows, setRows] = useState<EWayRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('sandbox');
  const [open, setOpen] = useState(false);
  const load = () => getEWayBills().then(setRows).catch(() => {});
  useEffect(() => { load(); getIntegrationsStatus().then((s) => setMode(s.eway)).catch(() => {}); }, []);
  const list = rows.filter((r) => filter === 'all' || r.status === filter);
  const active = rows.filter((r) => r.status === 'active').length;

  return (
    <AppShell crumb="GST / E-Way Bills">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST · e-Way Bill (EWB) · <span className="pill neut">{mode}</span></div>
          <h1 className="display">E-Way Bills</h1>
          <p>Transport documents for consignments above ₹50,000 — generated from the invoice, valid by distance slab.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><Add01Icon size={15} color="currentColor" /> New e-Way bill</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={170} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'expired', label: 'Expired' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Active bills</div><div className="value num">{active}</div><div className="delta up">In transit</div></div>
        <div className="tile"><div className="label">Total EWBs</div><div className="value num">{rows.length}</div></div>
        <div className="tile accent"><div className="label">Consignment value</div><div className="value num">{money(rows.reduce((s, r) => s + r.value, 0))}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Consignments</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>EWB no.</th><th>Invoice</th><th>Party</th><th>Route</th><th style={{ textAlign: 'right' }}>Dist.</th><th style={{ textAlign: 'right' }}>Value</th><th>Valid till</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td className="vno">{r.ewbNo ?? '—'}</td>
                  <td className="party" style={{ fontWeight: 600 }}>{r.invoiceNo}</td>
                  <td>{r.party}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}><TruckIcon size={13} color="var(--text-3)" style={{ verticalAlign: '-2px', marginRight: 4 }} />{r.from} → {r.to}</td>
                  <td className="amt">{r.distance} km</td>
                  <td className="amt">{money(r.value)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.validTill ?? '—'}</td>
                  <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No e-Way bills yet — generate one for a consignment above ₹50,000.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && <EwayModal mode={mode} onClose={() => setOpen(false)} onDone={load} />}
    </AppShell>
  );
}

function EwayModal({ mode, onClose, onDone }: { mode: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ invoiceNo: '', party: '', from: 'Rajkot', to: '', distance: '', value: '', vehicleNo: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function gen() {
    setBusy(true);
    try {
      const r = await generateEway({ invoiceNo: f.invoiceNo, party: f.party, from: f.from, to: f.to, distance: Number(f.distance) || 0, value: Number(f.value) || 0, vehicleNo: f.vehicleNo || undefined });
      onClose(); onDone();
      showSuccess({ title: 'e-Way Bill generated', rows: [['EWB no.', r.ewbNo ?? '—'], ['Route', `${r.from} → ${r.to}`], ['Valid till', r.validTill ?? '—'], ['Mode', mode]] });
    } catch (e) { showError('Could not generate e-Way bill', [['Reason', (e as Error).message]]); }
    finally { setBusy(false); }
  }
  const ok = f.invoiceNo && f.party && f.to && Number(f.value) >= 50000;
  return (
    <div className="ok-scrim" onClick={onClose}>
      <div className="ok-card" style={{ width: 440, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--red)', display: 'grid', placeItems: 'center', flex: 'none' }}><TruckIcon size={19} color="#fff" /></span>
          <b style={{ fontSize: 15 }}>New e-Way Bill</b>
        </div>
        <div className="grid2" style={{ gap: 10 }}>
          <div className="field"><label>Invoice no.</label><input className="ctl" value={f.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="SI/26-27/0001" /></div>
          <div className="field"><label>Party</label><input className="ctl" value={f.party} onChange={(e) => set('party', e.target.value)} placeholder="Customer name" /></div>
          <div className="field"><label>From</label><input className="ctl" value={f.from} onChange={(e) => set('from', e.target.value)} /></div>
          <div className="field"><label>To</label><input className="ctl" value={f.to} onChange={(e) => set('to', e.target.value)} placeholder="Destination" /></div>
          <div className="field"><label>Distance (km)</label><input className="ctl" type="number" value={f.distance} onChange={(e) => set('distance', e.target.value)} /></div>
          <div className="field"><label>Consignment value ₹</label><input className="ctl" type="number" value={f.value} onChange={(e) => set('value', e.target.value)} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Vehicle no.</label><input className="ctl" value={f.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value.toUpperCase())} placeholder="GJ01AB1234" /></div>
        </div>
        {f.value !== '' && Number(f.value) < 50000 && <div style={{ color: 'var(--warn)', fontSize: 12, marginTop: 8 }}>e-Way Bill is required only above ₹50,000.</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !ok} onClick={gen}>{busy ? 'Generating…' : 'Generate EWB'}</button>
        </div>
      </div>
    </div>
  );
}
