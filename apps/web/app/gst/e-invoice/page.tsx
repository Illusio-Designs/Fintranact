'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download01Icon, CheckmarkBadge01Icon, WhatsappIcon } from 'hugeicons-react';
import { AppShell } from '../../../lib/appshell';
import { Dropdown, money } from '../../../lib/components';
import { showSuccess, showError } from '../../../lib/success';
import { getEInvoices, generateEInvoice, sendWhatsApp, getIntegrationsStatus, type EInvoiceRow } from '../../../lib/api';

const statusPill: Record<EInvoiceRow['status'], { label: string; pill: string }> = {
  generated: { label: 'IRN generated', pill: 'ok' }, pending: { label: 'Pending', pill: 'crit' }, cancelled: { label: 'Cancelled', pill: 'neut' },
};

export default function EInvoicePage() {
  const [rows, setRows] = useState<EInvoiceRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('sandbox');
  const [wa, setWa] = useState<EInvoiceRow | null>(null);

  const load = () => getEInvoices().then(setRows).catch(() => {});
  useEffect(() => { load(); getIntegrationsStatus().then((s) => setMode(s.einvoice)).catch(() => {}); }, []);
  const list = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter]);
  const gen = rows.filter((r) => r.status === 'generated').length;
  const pend = rows.filter((r) => r.status === 'pending').length;

  async function generate(r: EInvoiceRow) {
    if (!r.voucherId) return;
    setBusy(r.voucherId);
    try {
      const res = await generateEInvoice(r.voucherId);
      showSuccess({ title: 'IRN generated', rows: [['Invoice', res.invoiceNo], ['IRN', res.irn.slice(0, 24) + '…'], ['Ack no.', res.ack], ['Mode', mode]] });
      await load();
    } catch (e) { showError('Could not generate IRN', [['Reason', (e as Error).message]]); }
    finally { setBusy(null); }
  }

  async function generateAllPending() {
    const pending = rows.filter((r) => r.status === 'pending' && r.voucherId);
    if (pending.length === 0) { showError('Nothing pending', [['Info', 'All sales invoices already have an IRN']]); return; }
    setBusy('all');
    let done = 0;
    for (const r of pending) { try { await generateEInvoice(r.voucherId!); done++; } catch { /* skip */ } }
    setBusy(null); await load();
    showSuccess({ title: 'IRNs generated', rows: [['Generated', String(done)], ['Of', String(pending.length)], ['Mode', mode]] });
  }

  return (
    <AppShell crumb="GST / e-Invoice">
      <div className="page-head">
        <div>
          <div className="eyebrow">GST · e-Invoicing (IRP) · <span className="pill neut">{mode}</span></div>
          <h1 className="display">e-Invoice</h1>
          <p>IRN &amp; signed QR fetched from the Invoice Registration Portal for B2B tax invoices above the threshold.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost"><Download01Icon size={15} color="currentColor" /> Export</button>
          <button className="btn btn-primary" disabled={busy === 'all' || pend === 0} onClick={generateAllPending}><CheckmarkBadge01Icon size={15} color="currentColor" /> {busy === 'all' ? 'Generating…' : `Generate ${pend} pending IRNs`}</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={180} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All invoices' }, { value: 'generated', label: 'IRN generated' }, { value: 'pending', label: 'Pending' }, { value: 'cancelled', label: 'Cancelled' }]} />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">IRN generated</div><div className="value num">{gen}</div><div className="delta up">Signed &amp; QR ready</div></div>
        <div className="tile"><div className="label">Pending</div><div className="value num">{pend}</div><div className="delta down">Awaiting IRP</div></div>
        <div className="tile accent"><div className="label">Invoices</div><div className="value num">{rows.length}</div></div>
      </section>

      <div className="card">
        <div className="card-head"><h3>Tax invoices</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Invoice</th><th>Party</th><th style={{ textAlign: 'right' }}>Value</th><th>IRN</th><th>Ack no.</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.invoiceNo}>
                  <td className="vno">{r.invoiceNo}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.date}</small></td>
                  <td className="party">{r.party}</td>
                  <td className="amt">{money(r.value)}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.irn ? r.irn.slice(0, 18) + '…' : '—'}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.ack ?? '—'}</td>
                  <td><span className={`pill ${statusPill[r.status].pill}`}>{statusPill[r.status].label}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r.status === 'generated'
                      ? <button className="mini" onClick={() => setWa(r)}><WhatsappIcon size={13} color="currentColor" /> Send</button>
                      : <button className="mini go" disabled={busy === r.voucherId} onClick={() => generate(r)}>{busy === r.voucherId ? '…' : 'Generate'}</button>}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No sales invoices yet — raise one to generate its IRN.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {wa && <WhatsAppModal row={wa} onClose={() => setWa(null)} />}
    </AppShell>
  );
}

function WhatsAppModal({ row, onClose }: { row: EInvoiceRow; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [body, setBody] = useState(`Namaste ${row.party}, your tax invoice ${row.invoiceNo} for ${money(row.value)} is ready. Thank you for your business — RAVI Metal Treatment.`);
  const [attach, setAttach] = useState(true);
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!to.trim()) return;
    setBusy(true);
    try {
      const res = await sendWhatsApp({ to, toName: row.party, kind: 'invoice', body, attachVoucherId: attach ? row.voucherId : undefined });
      onClose();
      showSuccess({ title: 'Sent on WhatsApp', rows: [['To', res.to], ['Invoice', row.invoiceNo], ['Attachment', attach ? `${row.invoiceNo}.pdf` : 'none'], ['Via', res.provider]] });
    } catch (e) { showError('WhatsApp send failed', [['Reason', (e as Error).message]]); }
    finally { setBusy(false); }
  }
  return (
    <div className="ok-scrim" onClick={onClose}>
      <div className="ok-card" style={{ width: 400, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: '#25D366', display: 'grid', placeItems: 'center', flex: 'none' }}><WhatsappIcon size={20} color="#fff" /></span>
          <div><b style={{ fontSize: 15 }}>Send on WhatsApp</b><div style={{ fontSize: 12, color: 'var(--text-3)' }}>{row.invoiceNo} · {row.party}</div></div>
        </div>
        <div className="field" style={{ marginBottom: 10 }}><label>Customer WhatsApp number</label><input className="ctl" type="tel" placeholder="98250 12345" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 10 }}><label>Message</label><textarea className="ctl" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} style={{ width: 16, height: 16 }} disabled={!row.voucherId} />
          Attach invoice PDF ({row.invoiceNo}.pdf)
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !to.trim()} onClick={send}><WhatsappIcon size={15} color="currentColor" /> {busy ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
