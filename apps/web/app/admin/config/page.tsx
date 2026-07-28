'use client';

import { useEffect, useMemo, useState } from 'react';
import { FloppyDiskIcon, InformationCircleIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { showSuccess, showError } from '../../../lib/success';
import {
  getNumberingSeries, updateNumberingSeries, getCompanyProfile,
  type NumberingSeries, type CompanyProfile,
} from '../../../lib/api';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

export default function SystemConfigPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [series, setSeries] = useState<NumberingSeries[]>([]);
  const [draft, setDraft] = useState<Record<string, { prefix: string; nextNo: number; width: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getCompanyProfile().then(setCompany).catch(() => {});
    getNumberingSeries().then(setSeries).catch(() => {});
  }, []);

  const edit = (t: string, patch: Partial<{ prefix: string; nextNo: number; width: number }>) => {
    const base = series.find((s) => s.voucherType === t)!;
    setDraft((d) => ({ ...d, [t]: { prefix: base.prefix, nextNo: base.nextNo, width: base.width, ...d[t], ...patch } }));
  };
  const cur = (s: NumberingSeries) => draft[s.voucherType] ?? { prefix: s.prefix, nextNo: s.nextNo, width: s.width };
  const dirty = (s: NumberingSeries) => {
    const d = draft[s.voucherType];
    return !!d && (d.prefix !== s.prefix || d.nextNo !== s.nextNo || d.width !== s.width);
  };

  const save = async (s: NumberingSeries) => {
    const d = cur(s);
    if (!d.prefix.trim() || d.nextNo < 1 || d.width < 1) { showError('Invalid series', [['Fix', 'Prefix, next no. and width are required']]); return; }
    setSaving(s.voucherType);
    try {
      const updated = await updateNumberingSeries(s.voucherType, { prefix: d.prefix.trim(), nextNo: d.nextNo, width: d.width });
      setSeries((rows) => rows.map((r) => (r.voucherType === s.voucherType ? { ...r, ...updated } : r)));
      setDraft((dd) => { const n = { ...dd }; delete n[s.voucherType]; return n; });
      showSuccess({ title: 'Numbering updated', rows: [['Document', s.label], ['Next number', `${d.prefix}${pad(d.nextNo, d.width)}`]] });
    } catch (e) {
      showError('Could not update numbering', [['Reason', (e as Error)?.message || 'Try again'], ['Document', s.label]]);
    } finally { setSaving(null); }
  };

  const statutory = useMemo(() => company ? [
    ['GSTIN', company.gstin], ['PAN', company.pan], ['TAN', company.tan],
    ['GST reg. type', company.gstRegType], ['CIN', company.cin || '—'],
    ['Professional Tax', company.ptRegn], ['EPF', company.pfRegn], ['ESIC', company.esiRegn],
  ] as [string, string | undefined][] : [], [company]);

  return (
    <AppShell crumb="Admin / System & Tax Config">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin · Ravi Metal Ops</div>
          <h1 className="display">System &amp; Tax Config</h1>
          <p>Statutory registration is held at the company level (single GSTIN, single city). Numbering series drive every voucher number and are editable here.</p>
        </div>
      </div>

      {/* Company statutory details */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h3>Company statutory details</h3><span className="csub" style={{ marginLeft: 'auto' }}>{company?.name}</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, color: 'var(--text-2)', fontSize: 12.5 }}>
            <InformationCircleIcon size={16} color="currentColor" style={{ flex: 'none', marginTop: 1 }} />
            <span>{company?.address}{company?.city ? `, ${company.city}` : ''}{company?.pincode ? ` — ${company.pincode}` : ''} · State code {company?.stateCode}. All branches operate under this single registration.</span>
          </div>
          <div className="grid3" style={{ rowGap: 14 }}>
            {statutory.map(([k, v]) => (
              <div key={k} className="field">
                <label>{k}</label>
                <div className="ctl" style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--mono, ui-monospace, monospace)', letterSpacing: '.02em' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Numbering series */}
      <div className="card">
        <div className="card-head"><h3>Voucher numbering series</h3><span className="csub" style={{ marginLeft: 'auto' }}>{series.length} series</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Document</th><th>Prefix</th><th>Next no.</th><th>Width</th><th>Next number</th><th /></tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const d = cur(s);
                return (
                  <tr key={s.voucherType}>
                    <td className="party">{s.label}</td>
                    <td><input className="ctl" style={{ width: 130 }} value={d.prefix} onChange={(e) => edit(s.voucherType, { prefix: e.target.value })} /></td>
                    <td><input className="ctl" style={{ width: 84 }} type="number" min={1} value={d.nextNo} onChange={(e) => edit(s.voucherType, { nextNo: Math.max(1, parseInt(e.target.value || '1', 10)) })} /></td>
                    <td style={{ width: 96 }}>
                      <Dropdown width={72} value={String(d.width)} onChange={(v) => edit(s.voucherType, { width: parseInt(v, 10) })} options={[3, 4, 5, 6].map((w) => ({ value: String(w), label: String(w) }))} />
                    </td>
                    <td className="vno" style={{ fontWeight: 700 }}>{d.prefix}{pad(d.nextNo, d.width)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-primary" style={{ padding: '6px 12px' }} disabled={!dirty(s) || saving === s.voucherType} onClick={() => save(s)}>
                        <FloppyDiskIcon size={14} color="currentColor" /> {saving === s.voucherType ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ paddingTop: 14, color: 'var(--text-2)', fontSize: 12 }}>
          E-Invoice IRN and E-Way Bill numbers are issued by the government portal (IRP / NIC); the series above are only our internal document references stored against each invoice.
        </div>
      </div>
    </AppShell>
  );
}
