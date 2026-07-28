'use client';

import { useEffect, useMemo, useState } from 'react';
import { FloppyDiskIcon, InformationCircleIcon, Add01Icon, CheckmarkCircle02Icon, Building06Icon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown } from '../../../lib/components';
import { showSuccess, showError } from '../../../lib/success';
import {
  getNumberingSeries, updateNumberingSeries, getCompanyProfile,
  getBankAccounts, addBankAccount, setPrintBank, updateCompanySettings,
  type NumberingSeries, type CompanyProfile, type BankAccount,
} from '../../../lib/api';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

export default function SystemConfigPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [series, setSeries] = useState<NumberingSeries[]>([]);
  const [draft, setDraft] = useState<Record<string, { prefix: string; nextNo: number; width: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNo: '', ifsc: '', branch: '', upi: '' });
  const [autoIrn, setAutoIrn] = useState(false);

  const loadBanks = () => getBankAccounts().then(setBanks).catch(() => {});
  useEffect(() => {
    getCompanyProfile().then((c) => { setCompany(c); setAutoIrn(!!c.autoEinvoiceService); }).catch(() => {});
    getNumberingSeries().then(setSeries).catch(() => {});
    loadBanks();
  }, []);

  async function saveBank() {
    if (!bankForm.bankName || !bankForm.accountNo) return;
    try {
      await addBankAccount(bankForm);
      setBankForm({ bankName: '', accountNo: '', ifsc: '', branch: '', upi: '' });
      await loadBanks();
      showSuccess({ title: 'Bank account added', rows: [['Bank', bankForm.bankName], ['A/C', bankForm.accountNo]] });
    } catch (e) { showError('Could not add bank', [['Reason', (e as Error).message]]); }
  }
  async function pickPrint(id: string) {
    try { setBanks(await setPrintBank(id)); showSuccess({ title: 'Print bank updated', rows: [['Info', 'This bank now prints on vouchers']] }); }
    catch (e) { showError('Could not update', [['Reason', (e as Error).message]]); }
  }
  async function toggleAutoIrn(v: boolean) {
    setAutoIrn(v);
    try { await updateCompanySettings({ autoEinvoiceService: v }); showSuccess({ title: v ? 'Auto e-Invoice on' : 'Auto e-Invoice off', rows: [['Service invoices', v ? 'IRN generated on post' : 'Generate manually']] }); }
    catch (e) { setAutoIrn(!v); showError('Could not update', [['Reason', (e as Error).message]]); }
  }

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
          E-Invoice IRN and E-Way Bill numbers are issued by the government portal (IRP / NIC) via our GSP (Whitebooks); the series above are only our internal document references.
        </div>
      </div>

      {/* Bank accounts — which one prints on vouchers */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h3>Bank accounts (printed on vouchers)</h3><span className="csub" style={{ marginLeft: 'auto' }}>{banks.length}</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Bank</th><th>Account no.</th><th>IFSC</th><th>Branch</th><th>Prints on voucher</th></tr></thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.id}>
                  <td className="party"><Building06Icon size={14} color="var(--text-3)" style={{ verticalAlign: '-2px', marginRight: 6 }} />{b.bankName}</td>
                  <td className="vno">{b.accountNo}</td>
                  <td style={{ fontSize: 12.5 }}>{b.ifsc ?? '—'}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{b.branch ?? '—'}</td>
                  <td>{b.printDefault
                    ? <span className="pill ok"><CheckmarkCircle02Icon size={12} color="currentColor" /> Default</span>
                    : <button className="mini" onClick={() => pickPrint(b.id)}>Set as print</button>}</td>
                </tr>
              ))}
              {banks.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 22 }}>No bank accounts yet — add one below to print it on vouchers.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ paddingTop: 14 }}>
          <div className="grid3" style={{ gap: 10, alignItems: 'end' }}>
            <div className="field"><label>Bank name</label><input className="ctl" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="HDFC Bank" /></div>
            <div className="field"><label>Account no.</label><input className="ctl" value={bankForm.accountNo} onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })} /></div>
            <div className="field"><label>IFSC</label><input className="ctl" value={bankForm.ifsc} onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label>Branch</label><input className="ctl" value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} /></div>
            <div className="field"><label>UPI (optional)</label><input className="ctl" value={bankForm.upi} onChange={(e) => setBankForm({ ...bankForm, upi: e.target.value })} /></div>
            <div><button className="btn btn-primary" disabled={!bankForm.bankName || !bankForm.accountNo} onClick={saveBank}><Add01Icon size={14} color="currentColor" /> Add bank</button></div>
          </div>
        </div>
      </div>

      {/* Automation */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h3>Automation</h3></div>
        <div className="card-body">
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoIrn} onChange={(e) => toggleAutoIrn(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span>
              <b>Auto-generate e-Invoice (IRN) on service invoices</b>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>When a job-work / service invoice is posted, the IRN &amp; signed QR are fetched automatically from the IRP.</div>
            </span>
          </label>
        </div>
      </div>
    </AppShell>
  );
}
