'use client';

import { useEffect, useMemo, useState } from 'react';
import { CloudUploadIcon, File01Icon, Link01Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { Dropdown, RowMenu } from '../../lib/components';
import { getDocuments, type DocRow } from '../../lib/api';

const CATS = ['All', 'Purchase Order', 'Goods Receipt', 'e-Way Bill', 'Bank Statement', 'Legal'];

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState(false);
  useEffect(() => { getDocuments().then(setRows).catch(() => {}); }, []);

  const list = useMemo(() => rows.filter((r) => (cat === 'All' || r.category === cat) && (!q || r.name.toLowerCase().includes(q.toLowerCase()))), [rows, cat, q]);

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    setRows((r) => [...Array.from(fl).map((f) => ({ name: f.name, type: (f.name.split('.').pop() || 'FILE').toUpperCase(), category: 'Uncategorised', linkedTo: null, size: `${Math.max(1, Math.round(f.size / 1024))} KB`, uploadedBy: 'Rajesh J.', date: '28 Jul 2026' })), ...r]);
  };

  return (
    <AppShell crumb="Documents">
      <div className="page-head">
        <div>
          <div className="eyebrow">Document management · linked to vouchers</div>
          <h1 className="display">Documents</h1>
          <p>Central repository for POs, GRNs, challans, statements and legal papers — searchable and linked to the vouchers they support.</p>
        </div>
        <a className="btn btn-ghost" href="/import"><File01Icon size={15} color="currentColor" /> Import from Excel</a>
      </div>

      <label className={`dropzone ${drag ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
        <input type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
        <CloudUploadIcon size={26} color="var(--text-3)" />
        <div style={{ marginTop: 6 }}><b style={{ color: 'var(--text-2)' }}>Click to upload</b> or drag &amp; drop</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>PDF, images, XLSX — scanned &amp; virus-checked on upload</div>
      </label>

      <div className="toolbar">
        <div className="tb-field"><span>Category</span><Dropdown width={180} value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c, label: c }))} /></div>
        <div className="tb-field grow"><span>Search</span>
          <div className="search" style={{ width: '100%' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Files</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} of {rows.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Document</th><th>Category</th><th>Linked to</th><th>Size</th><th>Uploaded</th><th /></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}>
                  <td className="party"><span className="fi-ic" style={{ display: 'inline-grid', width: 26, height: 26, verticalAlign: '-8px', marginRight: 8 }}><File01Icon size={14} color="currentColor" /></span>{r.name}</td>
                  <td><span className="pill neut">{r.category}</span></td>
                  <td>{r.linkedTo ? <span className="tag"><Link01Icon size={12} color="currentColor" /> {r.linkedTo}</span> : <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>—</span>}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.size}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.uploadedBy}<small style={{ display: 'block', color: 'var(--text-3)' }}>{r.date}</small></td>
                  <td><div className="rowacts"><RowMenu items={[{ label: 'Preview' }, { label: 'Download' }, { label: 'Link to voucher' }, { label: 'Delete', danger: true }]} /></div></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6}><div className="empty">No documents match your filter.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
