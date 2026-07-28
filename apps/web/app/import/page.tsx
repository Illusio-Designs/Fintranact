'use client';

import { useEffect, useState } from 'react';
import { C, Shell } from '../../lib/ui';
import { commitImport, listImportEntities, MOCK, validateImport } from '../../lib/api';
import { mockValidation } from '../../lib/mock';

type Summary = typeof mockValidation;

export default function ImportPage() {
  const [entities, setEntities] = useState<{ key: string; label: string }[]>([]);
  const [entity, setEntity] = useState('ledgers');
  const [file, setFile] = useState<File | null>(null);
  const [fy, setFy] = useState('2025-26');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listImportEntities().then(setEntities).catch(() => setMsg('Sign in first.'));
  }, []);

  async function onValidate() {
    if (!file && !MOCK) return setMsg('Choose an .xlsx file first.');
    setBusy(true);
    setMsg(null);
    try {
      const s = await validateImport(entity, file as File);
      setSummary(s);
      setMsg(`${s.valid} valid · ${s.invalid} with errors.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCommit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await commitImport(entity, file as File, fy);
      setSummary(null);
      setMsg(`Imported ${res.inserted} row(s); ${res.skipped} skipped.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ghost: React.CSSProperties = { background: '#fff', color: C.text, border: `1px solid ${C.line}`, padding: '9px 16px', borderRadius: 8, fontWeight: 650, cursor: 'pointer' };
  const ctl: React.CSSProperties = { padding: '9px 11px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14 };

  return (
    <Shell active="Import">
      <main style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
        <h2 style={{ marginBottom: 2 }}>Import older data from Excel</h2>
        <p style={{ color: C.muted, marginTop: 0, fontSize: 13 }}>
          Download the template, fill it, then validate before importing. Nothing is written until you commit.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0' }}>
          <select value={entity} onChange={(e) => { setEntity(e.target.value); setSummary(null); }} style={ctl}>
            {(entities.length ? entities : [{ key: 'ledgers', label: 'Ledgers / parties' }]).map((e) => (
              <option key={e.key} value={e.key}>{e.label}</option>
            ))}
          </select>
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button style={ghost} disabled={busy} onClick={onValidate}>Validate</button>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>
            FY <input value={fy} onChange={(e) => setFy(e.target.value)} style={{ ...ctl, width: 90, marginLeft: 6 }} />
          </label>
          <button style={{ background: C.red, color: '#fff', border: 0, padding: '9px 16px', borderRadius: 8, fontWeight: 650, cursor: 'pointer' }} disabled={busy || !summary || summary.valid === 0} onClick={onCommit}>
            {summary ? `Import ${summary.valid} valid row(s)` : 'Import'}
          </button>
        </div>

        {msg && <p style={{ fontSize: 13 }}>{msg}</p>}

        {summary && (
          <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.paper, textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Row</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.rowNo} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: 8, fontVariantNumeric: 'tabular-nums' }}>{row.rowNo}</td>
                    <td style={{ padding: 8, fontWeight: 700, color: row.errors.length === 0 ? C.good : C.redInk }}>
                      {row.errors.length === 0 ? 'valid' : 'error'}
                    </td>
                    <td style={{ padding: 8, color: C.muted }}>
                      {row.errors.length === 0
                        ? Object.values(row.raw).filter(Boolean).slice(0, 3).join(' · ')
                        : row.errors.map((e) => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Shell>
  );
}
