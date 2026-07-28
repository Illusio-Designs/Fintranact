'use client';

import { useEffect, useState } from 'react';
import { CloudUploadIcon, File01Icon, Cancel01Icon, CheckmarkCircle02Icon, Alert01Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { Dropdown } from '../../lib/components';
import { commitImport, listImportEntities, validateImport, type ImportValidation } from '../../lib/api';

type Summary = ImportValidation;

export default function ImportPage() {
  const [entities, setEntities] = useState<{ key: string; label: string }[]>([]);
  const [entity, setEntity] = useState('ledgers');
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [fy, setFy] = useState('2025-26');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listImportEntities().then(setEntities).catch(() => setMsg({ tone: 'info', text: 'Sign in first to load entities.' }));
  }, []);

  async function onValidate() {
    if (!file) return setMsg({ tone: 'err', text: 'Choose an .xlsx file first.' });
    setBusy(true); setMsg(null);
    try {
      const s = await validateImport(entity, file as File);
      setSummary(s);
      setMsg({ tone: s.invalid === 0 ? 'ok' : 'info', text: `${s.valid} valid · ${s.invalid} with errors.` });
    } catch (err) {
      setMsg({ tone: 'err', text: (err as Error).message });
    } finally { setBusy(false); }
  }

  async function onCommit() {
    setBusy(true);
    try {
      const res = await commitImport(entity, file as File, fy);
      setMsg({ tone: 'ok', text: `Imported ${res.inserted} row(s)${res.skipped ? `, skipped ${res.skipped}` : ''}.` });
      setSummary(null); setFile(null);
    } catch (err) {
      setMsg({ tone: 'err', text: (err as Error).message });
    } finally { setBusy(false); }
  }

  const entOptions = (entities.length ? entities : [{ key: 'ledgers', label: 'Ledgers / parties' }]).map((e) => ({ value: e.key, label: e.label }));

  return (
    <AppShell crumb="Documents / Import">
      <div className="page-head">
        <div>
          <div className="eyebrow">Documents · data migration</div>
          <h1 className="display">Import older data</h1>
          <p>Download the template, fill it, then validate before importing. Nothing is written until you commit.</p>
        </div>
      </div>

      <div className="ui-grid">
        <div className="card">
          <div className="card-head"><h3>1 · Choose &amp; upload</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>Entity</label>
              <Dropdown width="100%" value={entity} onChange={(v) => { setEntity(v); setSummary(null); }} options={entOptions} />
            </div>
            <div className="field"><label>Financial year</label>
              <Dropdown width="100%" value={fy} onChange={setFy} options={[{ value: '2025-26', label: 'FY 2025–26' }, { value: '2024-25', label: 'FY 2024–25' }, { value: '2026-27', label: 'FY 2026–27' }]} />
            </div>
            <label
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files?.[0] ?? null); }}
            >
              <input type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <CloudUploadIcon size={26} color="var(--text-3)" />
              <div style={{ marginTop: 6 }}><b style={{ color: 'var(--text-2)' }}>Click to upload</b> or drag &amp; drop</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>XLSX / CSV up to 10 MB</div>
            </label>
            {file && (
              <div className="fileitem">
                <span className="fi-ic"><File01Icon size={17} color="currentColor" /></span>
                <div className="fi-main"><div className="fi-name">{file.name}</div><div className="fi-meta">{(file.size / 1024).toFixed(1)} KB · ready</div></div>
                <button className="fi-x" onClick={() => setFile(null)}><Cancel01Icon size={16} color="currentColor" /></button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" disabled={busy} onClick={onValidate}>Validate</button>
              <button className="btn btn-primary" disabled={busy || !summary || summary.valid === 0} onClick={onCommit}>{summary ? `Import ${summary.valid} valid row(s)` : 'Import'}</button>
            </div>
            {msg && (
              <div className={`alert ${msg.tone}`}>
                {msg.tone === 'ok' ? <CheckmarkCircle02Icon size={16} color="currentColor" /> : <Alert01Icon size={16} color="currentColor" />}
                <span>{msg.text}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>2 · Validation preview</h3>{summary && <span className="pill ok" style={{ marginLeft: 'auto' }}>{summary.valid} valid · {summary.invalid} error</span>}</div>
          {summary ? (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Row</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.rowNo}>
                      <td className="num" style={{ paddingLeft: 18 }}>{row.rowNo}</td>
                      <td><span className={`pill ${row.errors.length === 0 ? 'ok' : 'crit'}`}>{row.errors.length === 0 ? 'valid' : 'error'}</span></td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                        {row.errors.length === 0
                          ? Object.values(row.raw).filter(Boolean).slice(0, 3).join(' · ')
                          : row.errors.map((e) => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-body"><div className="empty"><div className="em-ic"><File01Icon size={22} color="currentColor" /></div>Validate a file to preview rows here.</div></div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
