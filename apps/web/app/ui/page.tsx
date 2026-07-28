'use client';

import { useState, type ReactNode } from 'react';
import {
  Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon,
  Settings01Icon, MoreVerticalIcon, Download01Icon, PencilEdit01Icon, Delete02Icon,
  Copy01Icon, CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon,
} from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';

/** @fintranact/ui — shared component library / design system reference. */

function Card({ title, sub, children, span }: { title: string; sub?: string; children: ReactNode; span?: boolean }) {
  return (
    <div className="card" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div className="card-head"><div><h3>{title}</h3>{sub && <div className="csub">{sub}</div>}</div></div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color: 'var(--text-3)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

const swatches: [string, string][] = [
  ['Ink', 'var(--ink)'], ['Red', 'var(--red)'], ['Red press', 'var(--red-press)'],
  ['Paper', 'var(--paper)'], ['Surface', 'var(--paper-2)'], ['Line', 'var(--line)'],
  ['Good', 'var(--good)'], ['Warn', 'var(--warn)'], ['Red tint', 'var(--red-tint)'],
];

type TableRow = { vno: string; party: string; type: string; status: 'Filed' | 'Pending' | 'Draft'; amount: string };
const TABLE: TableRow[] = [
  { vno: 'SI/26-27/0482', party: 'Mahalaxmi Traders', type: 'Sales', status: 'Filed', amount: '₹2,48,600' },
  { vno: 'PB/26-27/0311', party: 'Gujarat Poly Pvt Ltd', type: 'Purchase', status: 'Pending', amount: '₹1,12,000' },
  { vno: 'JW/26-27/0128', party: 'Shakti Forgings', type: 'Job Work', status: 'Draft', amount: '₹86,400' },
  { vno: 'SI/26-27/0483', party: 'Rajkot Steel Co', type: 'Sales', status: 'Filed', amount: '₹5,04,200' },
];
const statusPill: Record<TableRow['status'], string> = { Filed: 'ok', Pending: 'warn', Draft: 'neut' };

export default function UILibrary() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [sw1, setSw1] = useState(true);
  const [sw2, setSw2] = useState(false);
  const [seg, setSeg] = useState('All');
  const [page, setPage] = useState(2);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <AppShell crumb="UI Library">
      <div className="page-head">
        <div>
          <div className="eyebrow">Design system · @fintranact/ui</div>
          <h1 className="display">UI Library</h1>
          <p>The shared component kit powering web + Windows desktop + admin. One source of truth for the inputs, dropdowns, files, tables and feedback a SaaS needs.</p>
        </div>
      </div>

      {/* Tokens + typography span full width */}
      <Card title="Design tokens" sub="Colours are CSS variables, theme-aware (light / dark)." span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {swatches.map(([name, v]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 46, borderRadius: 10, background: v, border: '1px solid var(--line)' }} />
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5 }}>{name}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="ui-grid">
        <Card title="Typography">
          <Row label="Display"><h1 className="display" style={{ margin: 0, fontSize: 26 }}>Good evening, Rajesh</h1></Row>
          <Row label="Body"><p style={{ margin: 0, color: 'var(--text-2)' }}>Regular body text — 65ch measure for readable paragraphs.</p></Row>
          <Row label="Eyebrow"><span className="eyebrow">FY 2026–27 · Q2</span></Row>
          <Row label="Tabular nums"><span className="num" style={{ fontSize: 18 }}>₹1,42,00,000.00</span></Row>
        </Card>

        <Card title="Buttons">
          <Row label="Primary / ghost"><button className="btn btn-primary">Quick Entry</button><button className="btn btn-ghost">Export</button></Row>
          <Row label="Icon"><button className="icon-btn"><Download01Icon size={17} color="currentColor" /></button><button className="icon-btn"><Settings01Icon size={17} color="currentColor" /></button></Row>
          <Row label="Mini (row actions)"><button className="mini">Reject</button><button className="mini go">Approve</button></Row>
          <Row label="Disabled"><button className="btn btn-primary" disabled style={{ opacity: .5, cursor: 'not-allowed' }}>Posting…</button></Row>
        </Card>

        <Card title="Text inputs" sub="Labelled fields, hints, validation & prefixes.">
          <div className="field">
            <label>Party name</label>
            <input className="ctl" placeholder="e.g. Mahalaxmi Traders" />
            <span className="hint2">Start typing to search the ledger.</span>
          </div>
          <div className="field">
            <label>GSTIN</label>
            <input className="ctl err" defaultValue="24ABCDE" />
            <span className="field-err">Invalid GSTIN — 15 characters required.</span>
          </div>
          <div className="field">
            <label>Amount</label>
            <div className="input-prefix"><span className="pfx">₹</span><input placeholder="0.00" inputMode="decimal" /></div>
          </div>
          <div className="field">
            <label>Narration</label>
            <textarea className="ctl" placeholder="Being job-work charges for heat treatment…" />
          </div>
        </Card>

        <Card title="Selects & dropdowns" sub="Native selects plus a custom action menu.">
          <div className="field">
            <label>Voucher type</label>
            <select className="ctl"><option>Sales</option><option>Purchase</option><option>Payment</option><option>Receipt</option><option>Journal</option></select>
          </div>
          <Row label="Search box"><div className="search" style={{ width: 220 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg> Search… <kbd>⌘K</kbd></div></Row>
          <Row label="Action menu">
            <div className="dropdown">
              <button className="btn btn-ghost" onClick={() => setMenuOpen((v) => !v)}>Actions <MoreVerticalIcon size={15} color="currentColor" /></button>
              {menuOpen && (
                <div className="dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <button><PencilEdit01Icon size={15} color="currentColor" /> Edit</button>
                  <button><Copy01Icon size={15} color="currentColor" /> Duplicate</button>
                  <button><Download01Icon size={15} color="currentColor" /> Export PDF</button>
                  <button style={{ color: 'var(--red-ink)' }}><Delete02Icon size={15} color="currentColor" /> Delete</button>
                </div>
              )}
            </div>
          </Row>
        </Card>

        <Card title="Toggles, checks & radios">
          <Row label="Switch">
            <label className="switch"><input type="checkbox" checked={sw1} onChange={(e) => setSw1(e.target.checked)} /><span className="track" /></label>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Auto-generate E-Invoice IRN</span>
          </Row>
          <Row label="Switch (off)">
            <label className="switch"><input type="checkbox" checked={sw2} onChange={(e) => setSw2(e.target.checked)} /><span className="track" /></label>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Reverse charge</span>
          </Row>
          <Row label="Checkboxes">
            <label className="check"><input type="checkbox" defaultChecked /> CGST</label>
            <label className="check"><input type="checkbox" defaultChecked /> SGST</label>
            <label className="check"><input type="checkbox" /> IGST</label>
          </Row>
          <Row label="Radios">
            <label className="check"><input type="radio" name="gt" defaultChecked /> Intra-state</label>
            <label className="check"><input type="radio" name="gt" /> Inter-state</label>
          </Row>
        </Card>

        <Card title="Segmented, tabs & toggle">
          <Row label="Segmented">
            <div className="seg">{['All', 'Sales', 'Purchase'].map((s) => <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s}</button>)}</div>
          </Row>
          <Row label="Tabs">
            <div className="seg">{['Overview', 'Ledger', 'GST', 'Docs'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
          </Row>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Active tab: <b style={{ color: 'var(--text-2)' }}>{tab}</b></div>
          <Row label="Two-state"><div className="toggle2"><button className="on">Debit</button><button>Cash</button></div></Row>
        </Card>

        <Card title="File upload" sub="Dropzone + selected-file state.">
          <label className="dropzone">
            <input type="file" style={{ display: 'none' }} onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
            <Download01Icon size={22} color="var(--text-3)" style={{ transform: 'rotate(180deg)' }} />
            <div style={{ marginTop: 6 }}><b style={{ color: 'var(--text-2)' }}>Click to upload</b> or drag & drop</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>XLSX, CSV, PDF up to 10 MB</div>
          </label>
          {fileName && (
            <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span><b>{fileName}</b> ready to import.</span></div>
          )}
          <Row label="Progress">
            <div style={{ flex: 1, minWidth: 160 }}><div className="progress"><i style={{ width: '68%' }} /></div></div>
            <span className="num" style={{ fontSize: 12 }}>68%</span>
          </Row>
        </Card>

        <Card title="Alerts & feedback">
          <div className="alert info"><InformationCircleIcon size={16} color="currentColor" /> <span>GSTR-2B for June is available for reconciliation.</span></div>
          <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span>Voucher SI/26-27/0482 posted — books balanced.</span></div>
          <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span>TDS challan ITNS-281 due in 4 days.</span></div>
          <div className="alert err"><Alert01Icon size={16} color="currentColor" /> <span>Debit ≠ Credit. Journal cannot be saved.</span></div>
        </Card>

        <Card title="Pills, tags & badges">
          <Row label="Status pills"><span className="pill crit">4 days</span><span className="pill warn">11 days</span><span className="pill ok">Ready</span><span className="pill neut">Draft</span></Row>
          <Row label="Tags"><span className="tag">Sales · IRN ✓</span><span className="tag">TDS 194C</span><span className="tag">Job Work</span></Row>
          <Row label="Count badge"><span className="count alert">3</span><span className="dot-alert num">6</span></Row>
        </Card>

        <Card title="Round icons (Hugeicons)">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon, Settings01Icon].map((Ic, i) => (
              <span key={i} className="g-round" style={{ position: 'static' }}><Ic size={22} color="currentColor" strokeWidth={1.8} /></span>
            ))}
          </div>
        </Card>

        <Card title="KPI tiles">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="tile"><div className="label">Cash &amp; Bank</div><div className="value num">₹84.62 L</div><div className="delta up">▲ 6.4% vs last month</div></div>
            <div className="tile accent"><div className="label">GST Liability · Jun</div><div className="value num">₹9.18 L</div><div className="delta down">Net payable ₹6.4L</div></div>
          </div>
          <div className="kv"><span className="k">Process charges</span><span className="v">₹38,60,000</span></div>
          <div className="kv"><span className="k">GST @ 18%</span><span className="v">₹6,94,800</span></div>
          <div className="kv"><span className="k" style={{ fontWeight: 700 }}>Total</span><span className="v" style={{ fontSize: 15 }}>₹45,54,800</span></div>
        </Card>

        <Card title="Dialog / modal">
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>Confirmations, quick-add and destructive actions use a centred modal.</p>
          <div><button className="btn btn-primary" onClick={() => setModal(true)}>Open dialog</button></div>
        </Card>
      </div>

      {/* Full-width data table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Data table</h3><span className="csub" style={{ marginLeft: 'auto' }}>Sortable · status pills · row actions · pagination</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th><label className="check" style={{ gap: 0 }}><input type="checkbox" /></label></th>
                <th>Voucher</th><th>Party</th><th>Type</th><th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r) => (
                <tr key={r.vno}>
                  <td><label className="check" style={{ gap: 0 }}><input type="checkbox" /></label></td>
                  <td className="vno">{r.vno}</td>
                  <td className="party">{r.party}</td>
                  <td>{r.type}</td>
                  <td><span className={`pill ${statusPill[r.status]}`}>{r.status}</span></td>
                  <td className="amt">{r.amount}</td>
                  <td style={{ position: 'relative', textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => setRowMenu((v) => (v === r.vno ? null : r.vno))}><MoreVerticalIcon size={16} color="currentColor" /></button>
                    {rowMenu === r.vno && (
                      <div className="dropdown-menu" style={{ right: 8, left: 'auto' }} onMouseLeave={() => setRowMenu(null)}>
                        <button><PencilEdit01Icon size={15} color="currentColor" /> Edit</button>
                        <button><Download01Icon size={15} color="currentColor" /> Download</button>
                        <button style={{ color: 'var(--red-ink)' }}><Delete02Icon size={15} color="currentColor" /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tfoot">
          <span>Showing 1–4 of 128 vouchers</span>
          <div className="pager">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            {[1, 2, 3, 4].map((n) => <button key={n} className={page === n ? 'on' : ''} onClick={() => setPage(n)}>{n}</button>)}
            <button onClick={() => setPage((p) => Math.min(4, p + 1))}>›</button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="ui-modal-scrim" onClick={() => setModal(false)}>
          <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px' }}>Delete voucher?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 13 }}>SI/26-27/0482 will be reversed and removed from the day book. This action is written to the audit trail.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setModal(false)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
