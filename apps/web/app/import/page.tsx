'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface RowError {
  field?: string;
  message: string;
}
interface ValidatedRow {
  rowNo: number;
  raw: Record<string, unknown>;
  errors: RowError[];
}
interface Summary {
  entity: string;
  total: number;
  valid: number;
  invalid: number;
  rows: ValidatedRow[];
}
interface Entity {
  key: string;
  label: string;
  columns: string[];
}

function token(): string {
  return typeof window !== 'undefined' ? (sessionStorage.getItem('accessToken') ?? '') : '';
}

export default function ImportPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entity, setEntity] = useState('ledgers');
  const [file, setFile] = useState<File | null>(null);
  const [fy, setFy] = useState('2025-26');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/import/entities`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((b) => setEntities(b.data ?? []))
      .catch(() => setMsg('Sign in first (no API / token).'));
  }, []);

  async function downloadTemplate() {
    const res = await fetch(`${API}/api/v1/import/${entity}/template`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return setMsg('Could not fetch template — are you signed in?');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintranact-${entity}-template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function post(action: 'validate' | 'commit') {
    if (!file) return setMsg('Choose an .xlsx file first.');
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (action === 'commit') fd.append('financialYear', fy);
      const res = await fetch(`${API}/api/v1/import/${entity}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body?.errors?.[0]?.message ?? `${action} failed`);
        return;
      }
      if (action === 'validate') {
        setSummary(body.data);
        setMsg(`${body.data.valid} valid · ${body.data.invalid} with errors.`);
      } else {
        setSummary(null);
        setMsg(`Imported ${body.data.inserted} row(s); ${body.data.skipped} skipped. Batch ${body.data.batchId}.`);
      }
    } catch {
      setMsg('Cannot reach the API on :4000.');
    } finally {
      setBusy(false);
    }
  }

  const btn: React.CSSProperties = {
    background: '#C8102E',
    color: '#fff',
    border: 0,
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 650,
    cursor: 'pointer',
  };
  const ghost: React.CSSProperties = {
    background: '#fff',
    color: '#14141A',
    border: '1px solid #E4E2E0',
    padding: '9px 16px',
    borderRadius: 8,
    fontWeight: 650,
    cursor: 'pointer',
  };
  const ctl: React.CSSProperties = {
    padding: '9px 11px',
    border: '1px solid #E4E2E0',
    borderRadius: 8,
    fontSize: 14,
  };

  return (
    <main style={{ maxWidth: 920, margin: '48px auto', padding: 24 }}>
      <h2 style={{ marginBottom: 2 }}>Import older data from Excel</h2>
      <p style={{ color: '#5C5A5E', marginTop: 0, fontSize: 13 }}>
        Download the template, fill it, then validate before importing. Nothing is written until you commit.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0' }}>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setSummary(null); }} style={ctl}>
          {entities.length === 0 && <option value="ledgers">Ledgers / parties</option>}
          {entities.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
        <button style={ghost} onClick={downloadTemplate}>Download template</button>
        <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button style={ghost} disabled={busy} onClick={() => post('validate')}>Validate</button>
        <label style={{ fontSize: 12, color: '#5C5A5E', fontWeight: 700 }}>
          FY <input value={fy} onChange={(e) => setFy(e.target.value)} style={{ ...ctl, width: 90, marginLeft: 6 }} />
        </label>
        <button style={btn} disabled={busy || !summary || summary.valid === 0} onClick={() => post('commit')}>
          {summary ? `Import ${summary.valid} valid row(s)` : 'Import'}
        </button>
      </div>

      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}

      {summary && (
        <div style={{ overflowX: 'auto', border: '1px solid #E4E2E0', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F6F5F4', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Row</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.rowNo} style={{ borderTop: '1px solid #E4E2E0' }}>
                  <td style={{ padding: 8, fontVariantNumeric: 'tabular-nums' }}>{r.rowNo}</td>
                  <td style={{ padding: 8 }}>
                    {r.errors.length === 0 ? (
                      <span style={{ color: '#1F7A54', fontWeight: 700 }}>valid</span>
                    ) : (
                      <span style={{ color: '#7A0913', fontWeight: 700 }}>error</span>
                    )}
                  </td>
                  <td style={{ padding: 8, color: '#5C5A5E' }}>
                    {r.errors.length === 0
                      ? Object.values(r.raw).filter(Boolean).slice(0, 3).join(' · ')
                      : r.errors.map((e) => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
