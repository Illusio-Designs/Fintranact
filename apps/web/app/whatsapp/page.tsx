'use client';

import { useEffect, useMemo, useState } from 'react';
import { WhatsappIcon, SentIcon, Message01Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';
import { Dropdown } from '../../lib/components';
import { showSuccess, showError } from '../../lib/success';
import { listWhatsApp, sendWhatsApp, getIntegrationsStatus, type WhatsAppMsg } from '../../lib/api';

const statusPill: Record<string, string> = { sent: 'ok', delivered: 'ok', read: 'ok', queued: 'warn', failed: 'crit' };
const kindLabel: Record<string, string> = { invoice: 'Invoice', reminder: 'Reminder', document: 'Document', text: 'Message' };
const fmt = (s: string) => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function WhatsAppPage() {
  const [rows, setRows] = useState<WhatsAppMsg[]>([]);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('sandbox');
  const [open, setOpen] = useState(false);
  const load = () => listWhatsApp().then(setRows).catch(() => {});
  useEffect(() => { load(); getIntegrationsStatus().then((s) => setMode(s.whatsapp)).catch(() => {}); }, []);

  const list = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter]);
  const sent = rows.filter((r) => r.status !== 'failed').length;
  const failed = rows.filter((r) => r.status === 'failed').length;

  return (
    <AppShell crumb="Overview / WhatsApp">
      <div className="page-head">
        <div>
          <div className="eyebrow">Communications · WhatsApp Business · <span className="pill neut">{mode}</span></div>
          <h1 className="display">WhatsApp</h1>
          <p>Every invoice, reminder and message sent to customers over WhatsApp, with delivery status.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><WhatsappIcon size={15} color="currentColor" /> New message</button>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="tile"><div className="label">Sent</div><div className="value num">{sent}</div><div className="delta up">Delivered / queued</div></div>
        <div className="tile"><div className="label">Failed</div><div className="value num">{failed}</div><div className={failed ? 'delta down' : 'delta'}>{failed ? 'Check numbers' : 'None'}</div></div>
        <div className="tile accent"><div className="label">Total messages</div><div className="value num">{rows.length}</div></div>
      </section>

      <div className="toolbar">
        <div className="tb-field"><span>Status</span>
          <Dropdown width={170} value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }]} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Message log</h3><span className="csub" style={{ marginLeft: 'auto' }}>{list.length} shown</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>When</th><th>To</th><th>Type</th><th>Message</th><th>Attachment</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmt(r.createdAt)}</td>
                  <td className="party">{r.toName || '—'}<small style={{ display: 'block', color: 'var(--text-3)', fontWeight: 400 }}>{r.toPhone}</small></td>
                  <td><span className="tag">{kindLabel[r.kind] ?? r.kind}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-2)', maxWidth: 360 }}>{r.body}</td>
                  <td style={{ fontSize: 12.5 }}>{r.docUrl ? <span style={{ color: 'var(--good)' }}>📎 {r.docUrl}</span> : '—'}</td>
                  <td><span className={`pill ${statusPill[r.status] ?? 'neut'}`}>{r.status}</span></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No WhatsApp messages yet — send an invoice or reminder to a customer.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && <ComposeModal onClose={() => setOpen(false)} onDone={load} />}
    </AppShell>
  );
}

function ComposeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!to.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const res = await sendWhatsApp({ to, toName: toName || undefined, kind: 'text', body });
      onClose(); onDone();
      showSuccess({ title: 'Message sent', rows: [['To', res.to], ['Status', res.status], ['Via', res.provider]] });
    } catch (e) { showError('WhatsApp send failed', [['Reason', (e as Error).message]]); }
    finally { setBusy(false); }
  }
  return (
    <div className="ok-scrim" onClick={onClose}>
      <div className="ok-card" style={{ width: 400, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: '#25D366', display: 'grid', placeItems: 'center', flex: 'none' }}><Message01Icon size={19} color="#fff" /></span>
          <b style={{ fontSize: 15 }}>New WhatsApp message</b>
        </div>
        <div className="grid2" style={{ gap: 10, marginBottom: 10 }}>
          <div className="field"><label>Number</label><input className="ctl" type="tel" placeholder="98250 12345" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="field"><label>Name (optional)</label><input className="ctl" value={toName} onChange={(e) => setToName(e.target.value)} /></div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>Message</label><textarea className="ctl" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !to.trim() || !body.trim()} onClick={send}><SentIcon size={15} color="currentColor" /> {busy ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
