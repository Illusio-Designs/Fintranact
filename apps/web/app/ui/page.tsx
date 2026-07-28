'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon, Settings01Icon,
  MoreVerticalIcon, Download01Icon, PencilEdit01Icon, Delete02Icon, Copy01Icon,
  CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon, Mail01Icon, ViewIcon,
  ViewOffSlashIcon, Calendar03Icon, Clock01Icon, Search01Icon, Cancel01Icon, PrinterIcon,
  StarIcon, File01Icon, CloudUploadIcon, Tick02Icon, Add01Icon, InboxIcon,
  MinusSignIcon, PlusSignIcon,
} from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';

/** @fintranact/ui — shared component library / design system reference. */

function Card({ title, sub, children, span, foot }: { title: string; sub?: string; children: ReactNode; span?: boolean; foot?: ReactNode }) {
  return (
    <div className="card" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div className="card-head"><div><h3>{title}</h3>{sub && <div className="csub">{sub}</div>}</div></div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      {foot}
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

const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

type Row0 = { id: string; vno: string; party: string; type: string; status: 'Filed' | 'Pending' | 'Draft'; amount: number };
const DATA: Row0[] = [
  { id: '1', vno: 'SI/26-27/0482', party: 'Mahalaxmi Traders', type: 'Sales', status: 'Filed', amount: 248600 },
  { id: '2', vno: 'PB/26-27/0311', party: 'Gujarat Poly Pvt Ltd', type: 'Purchase', status: 'Pending', amount: 112000 },
  { id: '3', vno: 'JW/26-27/0128', party: 'Shakti Forgings', type: 'Job Work', status: 'Draft', amount: 86400 },
  { id: '4', vno: 'SI/26-27/0483', party: 'Rajkot Steel Co', type: 'Sales', status: 'Filed', amount: 504200 },
  { id: '5', vno: 'PB/26-27/0312', party: 'Aarav Metals', type: 'Purchase', status: 'Pending', amount: 61750 },
];
const statusPill: Record<Row0['status'], string> = { Filed: 'ok', Pending: 'warn', Draft: 'neut' };
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

type SortKey = 'vno' | 'party' | 'type' | 'status' | 'amount';

export default function UILibrary() {
  // form state
  const [pw, setPw] = useState('metallurgy');
  const [showPw, setShowPw] = useState(false);
  const [qty, setQty] = useState(12);
  const [rng, setRng] = useState(65);
  const [rate, setRate] = useState(4);
  const [otp, setOtp] = useState(['2', '4', '', '', '', '']);
  const [chips, setChips] = useState(['Heat treatment', 'Hardening']);
  const [chipDraft, setChipDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // file upload state
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list).map((x) => ({ name: x.name, size: x.size }))]);
  };

  // table state
  const [sortKey, setSortKey] = useState<SortKey>('vno');
  const [asc, setAsc] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(false);

  const rows = useMemo(() => {
    const s = [...DATA].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return asc ? cmp : -cmp;
    });
    return s;
  }, [sortKey, asc]);
  const sort = (k: SortKey) => { if (k === sortKey) setAsc((v) => !v); else { setSortKey(k); setAsc(true); } };
  const allOn = sel.size === DATA.length;
  const toggleAll = () => setSel(allOn ? new Set() : new Set(DATA.map((r) => r.id)));
  const toggleRow = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const Th = ({ k, children, right }: { k: SortKey; children: ReactNode; right?: boolean }) => (
    <th style={right ? { textAlign: 'right' } : undefined}>
      <button className={`th-sort ${sortKey === k ? 'act' : ''}`} onClick={() => sort(k)}>
        {children}<span className="arw">{sortKey === k ? (asc ? '▲' : '▼') : '▲'}</span>
      </button>
    </th>
  );

  const fireToast = () => { setToast(true); setTimeout(() => setToast(false), 2600); };

  return (
    <AppShell crumb="UI Library">
      <div className="page-head">
        <div>
          <div className="eyebrow">Design system · @fintranact/ui</div>
          <h1 className="display">UI Library</h1>
          <p>Every control a finance SaaS needs — inputs of all kinds, dropdowns, working file upload, a sortable data table with inline actions, plus feedback, navigation and layout primitives. One source of truth for web + Windows desktop + admin.</p>
          <div className="bc" style={{ marginTop: 10 }}><a>Home</a> / <a>Design system</a> / <b>UI Library</b></div>
        </div>
      </div>

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
        {/* ---- Inputs (all kinds) ---- */}
        <Card title="Text & number inputs" sub="Labels, hints, validation, prefix / suffix.">
          <div className="field"><label>Party name</label><input className="ctl" placeholder="e.g. Mahalaxmi Traders" /><span className="hint2">Start typing to search the ledger.</span></div>
          <div className="field"><label>GSTIN</label><input className="ctl err" defaultValue="24ABCDE" /><span className="field-err">Invalid GSTIN — 15 characters required.</span></div>
          <div className="field"><label>Amount</label><div className="input-prefix"><span className="pfx">₹</span><input placeholder="0.00" inputMode="decimal" /></div></div>
          <div className="field"><label>Discount</label><div className="input-prefix"><input placeholder="0" inputMode="decimal" /><span className="sfx">%</span></div></div>
          <div className="field"><label>Narration</label><textarea className="ctl" placeholder="Being job-work charges for heat treatment…" /></div>
        </Card>

        <Card title="Email, phone & password" sub="Contact & credential fields.">
          <div className="field"><label>Email</label><div className="input-prefix"><span className="pfx" style={{ padding: '0 9px' }}><Mail01Icon size={16} color="currentColor" /></span><input type="email" placeholder="accounts@company.in" /></div></div>
          <div className="field"><label>Phone</label>
            <div className="input-prefix">
              <select defaultValue="+91"><option>+91</option><option>+1</option><option>+44</option><option>+971</option></select>
              <input type="tel" placeholder="98250 12345" inputMode="tel" />
            </div>
          </div>
          <div className="field"><label>Password</label>
            <div className="pw-wrap">
              <input className="ctl" type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">{showPw ? <ViewOffSlashIcon size={17} color="currentColor" /> : <ViewIcon size={17} color="currentColor" />}</button>
            </div>
          </div>
          <div className="field"><label>Verification code</label>
            <div className="otp">{otp.map((d, i) => (
              <input key={i} maxLength={1} value={d} inputMode="numeric" onChange={(e) => setOtp((o) => o.map((v, j) => (j === i ? e.target.value.replace(/\D/g, '').slice(-1) : v)))} />
            ))}</div>
          </div>
        </Card>

        <Card title="Date, time, select & search">
          <div className="field"><label>Voucher date</label><div className="input-prefix"><span className="pfx" style={{ padding: '0 9px' }}><Calendar03Icon size={16} color="currentColor" /></span><input type="date" defaultValue="2026-07-28" /></div></div>
          <div className="field"><label>Cut-off time</label><div className="input-prefix"><span className="pfx" style={{ padding: '0 9px' }}><Clock01Icon size={16} color="currentColor" /></span><input type="time" defaultValue="18:30" /></div></div>
          <div className="field"><label>Voucher type</label><select className="ctl"><option>Sales</option><option>Purchase</option><option>Payment</option><option>Receipt</option><option>Journal</option></select></div>
          <div className="field"><label>Search</label><div className="search" style={{ width: '100%' }}><Search01Icon size={15} color="currentColor" /> Search vouchers… <kbd>⌘K</kbd></div></div>
        </Card>

        <Card title="Stepper, range, tags & rating">
          <Row label="Quantity stepper">
            <div className="stepper">
              <button onClick={() => setQty((q) => Math.max(0, q - 1))}><MinusSignIcon size={15} color="currentColor" /></button>
              <input value={qty} onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || 0)} />
              <button onClick={() => setQty((q) => q + 1)}><PlusSignIcon size={15} color="currentColor" /></button>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>kg</span>
          </Row>
          <div className="field"><label>Tolerance — {rng}%</label><input className="range" type="range" min={0} max={100} value={rng} onChange={(e) => setRng(Number(e.target.value))} /></div>
          <div className="field"><label>Processes</label>
            <div className="chips">
              {chips.map((c, i) => (<span className="chip" key={i}>{c}<button onClick={() => setChips((cs) => cs.filter((_, j) => j !== i))}><Cancel01Icon size={13} color="currentColor" /></button></span>))}
              <input value={chipDraft} placeholder="Add…" onChange={(e) => setChipDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && chipDraft.trim()) { setChips((c) => [...c, chipDraft.trim()]); setChipDraft(''); } }} />
            </div>
          </div>
          <Row label="Rating">
            <div className="rating">{[1, 2, 3, 4, 5].map((n) => (<button key={n} className={n <= rate ? 'on' : ''} onClick={() => setRate(n)}><StarIcon size={20} color="currentColor" fill={n <= rate ? 'currentColor' : 'none'} /></button>))}</div>
          </Row>
        </Card>

        <Card title="Toggles, checks & radios">
          <Row label="Switches">
            <label className="switch"><input type="checkbox" defaultChecked /><span className="track" /></label><span style={{ fontSize: 13, color: 'var(--text-2)' }}>Auto IRN</span>
            <label className="switch"><input type="checkbox" /><span className="track" /></label><span style={{ fontSize: 13, color: 'var(--text-2)' }}>Reverse charge</span>
          </Row>
          <Row label="Checkboxes"><label className="check"><input type="checkbox" defaultChecked /> CGST</label><label className="check"><input type="checkbox" defaultChecked /> SGST</label><label className="check"><input type="checkbox" /> IGST</label></Row>
          <Row label="Radios"><label className="check"><input type="radio" name="gt" defaultChecked /> Intra-state</label><label className="check"><input type="radio" name="gt" /> Inter-state</label></Row>
          <Row label="Segmented / tabs / two-state">
            <div className="seg"><button className="on">All</button><button>Sales</button><button>Purchase</button></div>
            <div className="toggle2"><button className="on">Debit</button><button>Cash</button></div>
          </Row>
        </Card>

        <Card title="Buttons & menus">
          <Row label="Primary / ghost"><button className="btn btn-primary">Quick Entry</button><button className="btn btn-ghost">Export</button></Row>
          <Row label="Icon / mini"><button className="icon-btn"><Download01Icon size={17} color="currentColor" /></button><button className="mini">Reject</button><button className="mini go">Approve</button><button className="btn btn-primary" disabled style={{ opacity: .5 }}>Posting…</button></Row>
          <Row label="Action menu (dropdown)">
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
          <Row label="Tooltip">
            <span className="tip"><button className="icon-btn"><InformationCircleIcon size={17} color="currentColor" /></button><span className="tip-txt">Books must balance before posting</span></span>
          </Row>
        </Card>

        {/* ---- File upload (working) ---- */}
        <Card title="File upload" sub="Drag & drop or browse — multi-file with remove.">
          <label
            className={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          >
            <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
            <CloudUploadIcon size={26} color="var(--text-3)" />
            <div style={{ marginTop: 6 }}><b style={{ color: 'var(--text-2)' }}>Click to upload</b> or drag &amp; drop</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>XLSX, CSV, PDF up to 10 MB</div>
          </label>
          {files.length > 0 && (
            <div className="filelist">
              {files.map((f, i) => (
                <div className="fileitem" key={i}>
                  <span className="fi-ic"><File01Icon size={17} color="currentColor" /></span>
                  <div className="fi-main">
                    <div className="fi-name">{f.name}</div>
                    <div className="fi-meta">{bytes(f.size)} · uploaded</div>
                    <div className="progress" style={{ marginTop: 6 }}><i style={{ width: '100%' }} /></div>
                  </div>
                  <button className="fi-x" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><Cancel01Icon size={16} color="currentColor" /></button>
                </div>
              ))}
            </div>
          )}
          {files.length === 0 && (
            <div className="empty" style={{ padding: 14 }}><div className="em-ic"><InboxIcon size={22} color="currentColor" /></div>No files yet — add one above.</div>
          )}
        </Card>

        <Card title="Alerts & feedback">
          <div className="alert info"><InformationCircleIcon size={16} color="currentColor" /> <span>GSTR-2B for June is available for reconciliation.</span></div>
          <div className="alert ok"><CheckmarkCircle02Icon size={16} color="currentColor" /> <span>Voucher SI/26-27/0482 posted — books balanced.</span></div>
          <div className="alert warn"><Alert01Icon size={16} color="currentColor" /> <span>TDS challan ITNS-281 due in 4 days.</span></div>
          <div className="alert err"><Alert01Icon size={16} color="currentColor" /> <span>Debit ≠ Credit. Journal cannot be saved.</span></div>
          <Row label="Toast"><button className="btn btn-ghost" onClick={fireToast}>Show toast</button></Row>
        </Card>

        <Card title="Pills, tags, avatars & progress">
          <Row label="Status pills"><span className="pill crit">4 days</span><span className="pill warn">11 days</span><span className="pill ok">Ready</span><span className="pill neut">Draft</span></Row>
          <Row label="Tags & badges"><span className="tag">Sales · IRN ✓</span><span className="tag">TDS 194C</span><span className="count alert">3</span></Row>
          <Row label="Avatar group"><div className="avatars"><span className="av">RJ</span><span className="av" style={{ background: 'var(--good)' }}>PK</span><span className="av" style={{ background: 'var(--warn)' }}>SM</span><span className="av more">+4</span></div></Row>
          <Row label="Progress"><div style={{ flex: 1, minWidth: 150 }}><div className="progress"><i style={{ width: '68%' }} /></div></div><span className="num" style={{ fontSize: 12 }}>68%</span></Row>
        </Card>

        <Card title="Steps, accordion & round icons">
          <Row label="Wizard steps">
            <div className="steps">
              <span className="st done"><span className="no"><Tick02Icon size={14} color="currentColor" /></span>Party</span><span className="bar" />
              <span className="st now"><span className="no">2</span>GST</span><span className="bar" />
              <span className="st"><span className="no">3</span>Review</span>
            </div>
          </Row>
          <div className="acc">
            <details open><summary>What is job-work ITC-04?<Add01Icon className="plus" size={16} color="currentColor" /></summary><div className="acc-body">A quarterly return of goods sent to / received from a job worker under GST.</div></details>
            <details><summary>How is net profit computed?<Add01Icon className="plus" size={16} color="currentColor" /></summary><div className="acc-body">Gross profit less indirect expenses, depreciation, interest and tax.</div></details>
          </div>
          <Row label="Round icons (Hugeicons)">
            {[Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon, Settings01Icon].map((Ic, i) => (
              <span key={i} className="g-round" style={{ position: 'static' }}><Ic size={22} color="currentColor" strokeWidth={1.8} /></span>
            ))}
          </Row>
        </Card>

        <Card title="KPI tiles & skeleton">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="tile"><div className="label">Cash &amp; Bank</div><div className="value num">₹84.62 L</div><div className="delta up">▲ 6.4% vs last month</div></div>
            <div className="tile accent"><div className="label">GST Liability · Jun</div><div className="value num">₹9.18 L</div><div className="delta down">Net payable ₹6.4L</div></div>
          </div>
          <Row label="Loading skeleton"><div style={{ flex: 1 }}><div className="skel" style={{ height: 12, width: '80%' }} /><div className="skel" style={{ height: 12, width: '55%', marginTop: 8 }} /><div className="skel" style={{ height: 12, width: '68%', marginTop: 8 }} /></div></Row>
        </Card>

        <Card title="Dialog / modal">
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>Confirmations, quick-add and destructive actions use a centred modal.</p>
          <div><button className="btn btn-primary" onClick={() => setModal(true)}>Open dialog</button></div>
        </Card>
      </div>

      {/* ---- Full-width data table: sortable + bulk + inline actions + dropdown + pagination ---- */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Data table</h3>
          <div className="sortby" style={{ marginLeft: 'auto' }}>
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
            <span style={{ color: 'var(--line)' }}>|</span>
            Sort by
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="vno">Voucher no.</option><option value="party">Party</option><option value="type">Type</option><option value="status">Status</option><option value="amount">Amount</option>
            </select>
            <button className="mini" onClick={() => setAsc((v) => !v)}>{asc ? 'Asc ▲' : 'Desc ▼'}</button>
          </div>
        </div>

        {sel.size > 0 && (
          <div style={{ padding: '10px 18px 0' }}>
            <div className="bulkbar">
              <b>{sel.size} selected</b>
              <span className="sp" />
              <button><Download01Icon size={14} color="currentColor" /> Export</button>
              <button><PrinterIcon size={14} color="currentColor" /> Print</button>
              <button className="solid" onClick={() => { setModal(true); }}><Delete02Icon size={14} color="currentColor" /> Delete</button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 34 }}><label className="check" style={{ gap: 0 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /></label></th>
                <Th k="vno">Voucher</Th>
                <Th k="party">Party</Th>
                <Th k="type">Type</Th>
                <Th k="status">Status</Th>
                <Th k="amount" right>Amount</Th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={sel.has(r.id) ? { background: 'var(--red-tint)' } : undefined}>
                  <td><label className="check" style={{ gap: 0 }}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleRow(r.id)} /></label></td>
                  <td className="vno">{r.vno}</td>
                  <td className="party">{r.party}</td>
                  <td>{r.type}</td>
                  <td><span className={`pill ${statusPill[r.status]}`}>{r.status}</span></td>
                  <td className="amt">{inr(r.amount)}</td>
                  <td style={{ position: 'relative' }}>
                    <div className="rowacts">
                      <span className="tip"><button className="ib" onClick={() => setModal(true)}><PencilEdit01Icon size={16} color="currentColor" /></button><span className="tip-txt">Edit</span></span>
                      <span className="tip"><button className="ib"><Download01Icon size={16} color="currentColor" /></button><span className="tip-txt">Download</span></span>
                      <span className="tip"><button className="ib"><PrinterIcon size={16} color="currentColor" /></button><span className="tip-txt">Print</span></span>
                      <button className="ib" onClick={() => setRowMenu((v) => (v === r.id ? null : r.id))}><MoreVerticalIcon size={16} color="currentColor" /></button>
                    </div>
                    {rowMenu === r.id && (
                      <div className="dropdown-menu" style={{ right: 8, left: 'auto' }} onMouseLeave={() => setRowMenu(null)}>
                        <button><Copy01Icon size={15} color="currentColor" /> Duplicate</button>
                        <button><CheckmarkCircle02Icon size={15} color="currentColor" /> Mark filed</button>
                        <button style={{ color: 'var(--red-ink)' }} onClick={() => { setRowMenu(null); setModal(true); }}><Delete02Icon size={15} color="currentColor" /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tfoot">
          <span>Showing 1–{rows.length} of 128 vouchers · {pageSize} per page</span>
          <div className="pager">
            <button>‹</button>
            {[1, 2, 3, 4].map((n) => <button key={n} className={n === 1 ? 'on' : ''}>{n}</button>)}
            <button>›</button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="ui-modal-scrim" onClick={() => setModal(false)}>
          <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px' }}>Delete voucher?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 13 }}>This will be reversed and removed from the day book. The action is written to the audit trail.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setModal(false); fireToast(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast"><CheckmarkCircle02Icon size={17} color="var(--good)" /> Done — change saved.</div>
      )}
    </AppShell>
  );
}
