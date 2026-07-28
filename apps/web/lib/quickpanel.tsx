'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSalesInvoice, createPurchaseInvoice, composeVoucher } from './api';
import { showSuccess, showError } from './success';
import { Dropdown, type Opt } from './components';

const TYPE_LABEL: Record<VType, string> = {
  payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal',
  sales: 'Sales Invoice', purchase: 'Purchase Bill', creditnote: 'Credit Note', debitnote: 'Debit Note',
  bank: 'Bank Batch', job: 'Job Work', forfeiture: 'Lien / Forfeiture', payroll: 'Payroll Run',
  ledger: 'Ledger', process: 'Process', rate: 'Rate',
};

/** Quick Entry aside panel — voucher-type-driven pass-entry with live GST / journal-balance / job-work gating.
 *  Ported from the HTML mockup into React (mock-mode; posting is simulated + PIN-gated). */

type VType =
  | 'payment' | 'receipt' | 'contra' | 'journal'
  | 'sales' | 'purchase' | 'creditnote' | 'debitnote'
  | 'bank' | 'job' | 'forfeiture' | 'payroll'
  | 'ledger' | 'process' | 'rate';

const VMETA: Record<VType, { s: string; d: string; post: string; master?: boolean }> = {
  payment: { s: 'PMT/26-27', d: 'Money going out through bank or cash.', post: 'Sign & post payment' },
  receipt: { s: 'RCP/26-27', d: 'Money received into bank or cash.', post: 'Sign & post receipt' },
  contra: { s: 'CTR/26-27', d: 'Transfer between your own bank / cash accounts.', post: 'Sign & post contra' },
  journal: { s: 'JV/26-27', d: 'Adjustment entry — debit must equal credit.', post: 'Sign & post journal' },
  sales: { s: 'SI/26-27', d: 'Tax invoice — output GST, e-Invoice eligible.', post: 'Sign & raise invoice' },
  purchase: { s: 'PB/26-27', d: 'Vendor bill — input GST / ITC.', post: 'Sign & post bill' },
  creditnote: { s: 'CN/26-27', d: 'Reduce a sales invoice — output GST down.', post: 'Sign & post note' },
  debitnote: { s: 'DN/26-27', d: 'Reduce a purchase bill — reverse ITC.', post: 'Sign & post note' },
  bank: { s: 'BNK/26-27', d: 'One bank, many contra lines — post as a batch.', post: 'Post lines' },
  job: { s: 'JW/26-27', d: 'Receive customer material — Cash / Debit memo & charge.', post: 'Sign & save inward' },
  forfeiture: { s: 'LIEN/26-27', d: 'Recover an overdue via customer material in custody.', post: 'Sign & record lien' },
  payroll: { s: 'PAY/26-27', d: 'Monthly salary run off biometric attendance.', post: 'Approve & post payroll' },
  ledger: { s: 'MASTER', d: 'Create a party / ledger with addresses & blacklist.', post: 'Save ledger', master: true },
  process: { s: 'MASTER', d: 'Heat-treatment process master.', post: 'Save process', master: true },
  rate: { s: 'MASTER', d: 'Rate card per process / customer.', post: 'Save rate', master: true },
};

const pnum = (v: string | undefined) => { const n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const inr2 = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function KV({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return (
    <div className="kv">
      <span className="k" style={strong ? { fontWeight: 700, color: 'var(--text)' } : undefined}>{k}</span>
      <span className="v" style={strong ? { fontSize: 15 } : undefined}>{inr2(v)}</span>
    </div>
  );
}
function TaxBox({ taxable, gst, pos, total }: { taxable: number; gst: number; pos?: string; total: string }) {
  if (taxable <= 0 || gst <= 0) return null;
  const tax = (taxable * gst) / 100;
  return (
    <div className="calc-box">
      <KV k="Taxable value" v={taxable} />
      {pos === 'inter'
        ? <KV k={`IGST @ ${gst}%`} v={tax} />
        : <><KV k={`CGST @ ${gst / 2}%`} v={tax / 2} /><KV k={`SGST @ ${gst / 2}%`} v={tax / 2} /></>}
      <KV k={total} v={taxable + tax} strong />
    </div>
  );
}
const Note = ({ children, tone }: { children: React.ReactNode; tone?: 'ok' | 'warn' }) => (
  <div className="qp-note" style={tone === 'ok' ? { background: 'var(--good-tint)', color: 'var(--good)' } : tone === 'warn' ? { background: 'var(--warn-tint)', color: 'var(--warn)' } : undefined}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flex: 'none' }}><path d="M12 8v5M12 16h.01" /><circle cx="12" cy="12" r="9" /></svg>
    <span>{children}</span>
  </div>
);

type BankLine = { date: string; dir: 'dr' | 'cr'; acc: string; narr: string; amt: number };

const VTYPES: VType[] = ['payment', 'receipt', 'contra', 'journal', 'sales', 'purchase', 'creditnote', 'debitnote', 'bank', 'job', 'forfeiture', 'payroll', 'ledger', 'process', 'rate'];

export function QuickPanel({ open, onClose, initialType, initialJobDir }: { open: boolean; onClose: () => void; initialType?: string; initialJobDir?: 'inward' | 'outward' }) {
  const [vType, setVType] = useState<VType>('payment');
  const [v, setV] = useState<Record<string, string>>({ jwGst: '18' });
  const set = (id: string, val: string) => setV((p) => ({ ...p, [id]: val }));

  // When opened, jump to the page's own task (e.g. Sales page → Sales Invoice,
  // Outward Challans → Job Work in the outward direction).
  useEffect(() => {
    if (!open) return;
    if (initialType && VTYPES.includes(initialType as VType)) setVType(initialType as VType);
    if (initialJobDir) setJobDir(initialJobDir);
  }, [open, initialType, initialJobDir]);

  // bank multi-line
  const [bankLines, setBankLines] = useState<BankLine[]>([]);
  const [dir, setDir] = useState<'dr' | 'cr'>('dr');
  // job work
  const [jobDir, setJobDir] = useState<'inward' | 'outward'>('inward');
  const [memo, setMemo] = useState<'debit' | 'cash'>('debit');
  // pin
  const [pin, setPin] = useState(false);
  const [pinVal, setPinVal] = useState('');
  const [pinErr, setPinErr] = useState(false);

  const meta = VMETA[vType];

  const addBankLine = () => {
    const amt = pnum(v.lnAmt);
    if (amt <= 0) return;
    setBankLines((l) => [...l, { date: v.lnDate || '27 Jul 26', dir, acc: v.lnAcc || 'Mahalaxmi Traders', narr: v.lnNarr || '', amt }]);
    setV((p) => ({ ...p, lnAmt: '', lnNarr: '' }));
  };
  const recv = bankLines.filter((l) => l.dir === 'dr').reduce((s, l) => s + l.amt, 0);
  const paid = bankLines.filter((l) => l.dir === 'cr').reduce((s, l) => s + l.amt, 0);

  // journal balance
  const jDr = pnum(v.jDr), jCr = pnum(v.jCr), jDiff = jDr - jCr, jOk = jDr > 0 && jDiff === 0;
  // job outward pending
  const pending = v.jwInwardRef ? parseFloat((v.jwInwardRef.split('|')[1]) || '0') : 0;
  const outQ = pnum(v.jwQtyOut), outLoss = pnum(v.jwLoss), outOver = pending > 0 && outQ + outLoss > pending;
  // forfeiture
  const frDue = pnum(v.frCust || '104200'), frSale = pnum(v.frSale), frDiff = frSale - frDue;

  const canPost = useMemo(() => {
    switch (vType) {
      case 'journal': return jDr > 0 && jDr === jCr;
      case 'bank': return bankLines.length > 0;
      case 'sales': return pnum(v.sQty) > 0 && pnum(v.sRate) > 0 && pnum(v.sGst) > 0 && !!v.sPos;
      case 'purchase': return pnum(v.pQty) > 0 && pnum(v.pRate) > 0 && pnum(v.pGst) > 0 && !!v.pPos;
      case 'creditnote': return pnum(v.cnTax) > 0 && pnum(v.cnGst) > 0;
      case 'debitnote': return pnum(v.dnTax) > 0 && pnum(v.dnGst) > 0;
      case 'job': return jobDir === 'inward' ? pnum(v.jwQtyIn) > 0 && pnum(v.jwRate) > 0 : !!v.jwInwardRef && outQ > 0 && outQ + outLoss <= pending;
      case 'forfeiture': return pnum(v.frValue) > 0 && frSale > 0;
      default: return true;
    }
  }, [vType, v, jDr, jCr, bankLines.length, jobDir, outQ, outLoss, pending, frSale]);

  const postLabel = vType === 'bank' ? `Post ${bankLines.length} line${bankLines.length === 1 ? '' : 's'}`
    : vType === 'job' ? (jobDir === 'inward' ? 'Sign & save inward' : 'Sign & save outward') : meta.post;

  const doPost = async () => {
    // Every voucher type posts through the composer API (mock returns a canned no.).
    const date = '2026-07-27';
    try {
      let r: { voucherNo: string; total?: number } | null = null;
      if (vType === 'sales') {
        r = await createSalesInvoice({ partyLedgerId: 'l-mahalaxmi', placeOfSupply: (v.sPos as 'intra' | 'inter') || 'intra', date, items: [{ salesLedgerId: 'l-jobwork', taxable: pnum(v.sQty) * pnum(v.sRate), gstRate: pnum(v.sGst) }] });
      } else if (vType === 'purchase') {
        r = await createPurchaseInvoice({ partyLedgerId: 'l-gujpoly', placeOfSupply: (v.pPos as 'intra' | 'inter') || 'intra', date, items: [{ purchaseLedgerId: 'l-material', taxable: pnum(v.pQty) * pnum(v.pRate), gstRate: pnum(v.pGst) }] });
      } else if (vType === 'payment') {
        r = await composeVoucher({ kind: 'payment', bankLedgerId: 'l-hdfc', partyLedgerId: 'l-gujpoly', amount: pnum(v.payAmt) || 100000, date });
      } else if (vType === 'receipt') {
        r = await composeVoucher({ kind: 'receipt', bankLedgerId: 'l-hdfc', partyLedgerId: 'l-mahalaxmi', amount: pnum(v.rcpAmt) || 100000, date });
      } else if (vType === 'contra') {
        r = await composeVoucher({ kind: 'contra', fromLedgerId: 'l-hdfc', toLedgerId: 'l-cash', amount: pnum(v.ctrAmt) || 50000, date });
      } else if (vType === 'journal') {
        r = await composeVoucher({ kind: 'journal', debitLedgerId: 'l-dep', creditLedgerId: 'l-accdep', amount: jDr, date });
      } else if (vType === 'creditnote') {
        r = await composeVoucher({ kind: 'credit_note', partyLedgerId: 'l-balaji', salesLedgerId: 'l-jobwork', placeOfSupply: 'intra', taxable: pnum(v.cnTax), gstRate: pnum(v.cnGst), date });
      } else if (vType === 'debitnote') {
        r = await composeVoucher({ kind: 'debit_note', partyLedgerId: 'l-gujpoly', purchaseLedgerId: 'l-material', placeOfSupply: 'intra', taxable: pnum(v.dnTax), gstRate: pnum(v.dnGst), date });
      }
      onClose();
      if (meta.master) {
        showSuccess({ title: `${TYPE_LABEL[vType]} saved successfully`, rows: [['Type', TYPE_LABEL[vType]], ['Series', meta.s], ['Date', '27 Jul 2026']] });
      } else {
        const amt = typeof r?.total === 'number' ? inr0(r.total) : '—';
        showSuccess({
          title: 'Voucher posted successfully',
          rows: [['Voucher no.', r?.voucherNo ?? '—'], ['Type', TYPE_LABEL[vType]], ['Date', '27 Jul 2026'], ['Amount', amt]],
        });
      }
    } catch (e) {
      showError('Could not post the voucher', [['Reason', (e as Error)?.message || 'Check the entry and try again'], ['Type', TYPE_LABEL[vType]]]);
    }
  };
  const postQuick = () => { if (!canPost) return; if (meta.master) doPost(); else { setPin(true); setPinVal(''); setPinErr(false); } };
  const confirmPin = () => { if (pinVal.replace(/\D/g, '').length >= 4) { setPin(false); doPost(); } else setPinErr(true); };

  const change = (v2: VType) => { setVType(v2); };

  // Field dropdown — wraps the shared <Dropdown>, backed by the `v` state bag.
  const Sel = ({ id, opts, ph = '— Select —', dv, onPick }: { id: string; opts: (string | Opt)[]; ph?: string; dv?: string; onPick?: (val: string) => void }) => (
    <Dropdown
      width="100%"
      value={v[id] ?? dv ?? ''}
      placeholder={ph}
      onChange={(val) => { set(id, val); onPick?.(val); }}
      options={opts.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))}
    />
  );
  const PROC_RATE: Record<string, string> = { Carburising: '18', 'Hardening & Tempering': '22', Annealing: '14', Nitriding: '28' };

  return (
    <>
      <div className="qp-scrim" style={{ display: open ? 'block' : 'none' }} onClick={onClose} />
      <aside className="qpanel" style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }} aria-label="Quick entry" aria-hidden={!open}>
        <div className="qp-head">
          <div className="qp-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M13 2L4 13h6l-1 9 9-11h-6z" /></svg></div>
          <div>
            <h2>Quick Entry</h2>
            <div className="qp-sub">Fast voucher passing · posts to RAVI Metal Treatment · Aji Deam Unit 3 · Rajkot</div>
          </div>
          <button className="qp-close" onClick={onClose} aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        <div className="qp-vtype">
          <label>Voucher type</label>
          <Dropdown width="100%" value={vType} onChange={(val) => change(val as VType)} options={[
            { value: 'payment', label: 'Payment', hint: 'Accounting' }, { value: 'receipt', label: 'Receipt', hint: 'Accounting' }, { value: 'contra', label: 'Contra', hint: 'Accounting' }, { value: 'journal', label: 'Journal', hint: 'Accounting' },
            { value: 'sales', label: 'Sales Invoice', hint: 'Trade / GST' }, { value: 'purchase', label: 'Purchase Bill', hint: 'Trade / GST' }, { value: 'creditnote', label: 'Credit Note', hint: 'Trade / GST' }, { value: 'debitnote', label: 'Debit Note', hint: 'Trade / GST' },
            { value: 'bank', label: 'Bank — multi-line entry', hint: 'Operations' }, { value: 'job', label: 'Job Work — Inward / Outward', hint: 'Operations' }, { value: 'forfeiture', label: 'Lien / Material Forfeiture', hint: 'Operations' }, { value: 'payroll', label: 'Payroll Run', hint: 'Operations' },
            { value: 'ledger', label: 'Ledger (party) master', hint: 'Masters' }, { value: 'process', label: 'Process master', hint: 'Masters' }, { value: 'rate', label: 'Rate master', hint: 'Masters' },
          ]} />
          <div className="vt-meta"><span className="vt-badge">{meta.s}</span> <span>{vType === 'job' ? (jobDir === 'inward' ? 'Receive customer material — Cash / Debit memo & charge.' : 'Dispatch against pending inward quantity.') : meta.d}</span></div>
        </div>

        <div className="qp-body">
          {/* PAYMENT */}
          {vType === 'payment' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Voucher no.</label><input className="ctl" defaultValue="PMT/26-27/0209" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
              <div className="fld"><label>Paid from — Bank / Cash a/c</label><Sel id="payFrom" opts={['HDFC Bank — Current ••4021', 'ICICI Bank — Current ••7788', 'SBI — CC ••1120', 'Cash in Hand']} /></div>
              <div className="fld"><label>Paid to — party / ledger</label><Sel id="payTo" opts={['Gujarat Poly Pvt Ltd', 'Anand Fabrication (Job Worker)', 'MSEB — Electricity', 'Furnace Fuel & Gas']} /></div>
              <div className="grid2"><div className="fld"><label>Payment mode</label><Sel id="payMode" opts={['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque']} /></div><div className="fld"><label>Instrument / UTR no.</label><input className="ctl" placeholder="Cheque / UTR ref" /></div></div>
              <div className="grid2"><div className="fld"><label>Amount ₹</label><input className="ctl big" placeholder="0.00" value={v.payAmt || ''} onChange={(e) => set('payAmt', e.target.value)} /></div><div className="fld"><label>TDS section</label><Sel id="payTds" opts={['None', '194C — Contractor', '194J — Professional', '194I — Rent', '194Q — Purchase of goods']} /></div></div>
              <div className="fld"><label>Narration</label><input className="ctl" placeholder="e.g. Being payment against June supplies" /></div>
              <Note>Payments above ₹1L route through <b>maker-checker</b> approval before release. TDS, if any, is auto-deducted on the net.</Note>
            </div>
          )}

          {/* RECEIPT */}
          {vType === 'receipt' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Voucher no.</label><input className="ctl" defaultValue="RCP/26-27/0341" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
              <div className="fld"><label>Received in — Bank / Cash a/c</label><Sel id="rcpIn" opts={['HDFC Bank — Current ••4021', 'ICICI Bank — Current ••7788', 'Cash in Hand']} /></div>
              <div className="fld"><label>Received from — customer</label><Sel id="rcpFrom" opts={['Mahalaxmi Traders', 'Shree Balaji Enterprises', 'Tata Motors Ltd']} /></div>
              <div className="grid2"><div className="fld"><label>Receipt mode</label><Sel id="rcpMode" opts={['NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash']} /></div><div className="fld"><label>Amount ₹</label><input className="ctl big" placeholder="0.00" value={v.rcpAmt || ''} onChange={(e) => set('rcpAmt', e.target.value)} /></div></div>
              <div className="fld"><label>Against reference (bill)</label><Sel id="rcpRef" opts={['On account', 'SI/26-27/0482 — ₹2,48,600', 'Advance receipt']} /></div>
              <div className="fld"><label>Narration</label><input className="ctl" placeholder="e.g. Being amount received against invoice" /></div>
              <Note tone="ok">Auto-knocks off the selected outstanding bill and updates receivable ageing.</Note>
            </div>
          )}

          {/* CONTRA */}
          {vType === 'contra' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Voucher no.</label><input className="ctl" defaultValue="CTR/26-27/0067" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
              <div className="fld"><label>From account</label><Sel id="ctrFrom" opts={['HDFC Bank — Current ••4021', 'SBI — CC ••1120', 'Cash in Hand']} /></div>
              <div className="fld"><label>To account</label><Sel id="ctrTo" opts={['Cash in Hand', 'ICICI Bank — Current ••7788', 'HDFC Bank — Current ••4021']} /></div>
              <div className="fld"><label>Amount ₹</label><input className="ctl big" placeholder="0.00" value={v.ctrAmt || ''} onChange={(e) => set('ctrAmt', e.target.value)} /></div>
              <div className="fld"><label>Narration</label><input className="ctl" placeholder="e.g. Cash deposited to HDFC" /></div>
              <Note>Contra moves money between your own bank / cash accounts — no party, no P&amp;L impact.</Note>
            </div>
          )}

          {/* JOURNAL */}
          {vType === 'journal' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Voucher no.</label><input className="ctl" defaultValue="JV/26-27/0128" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
              <div className="sec-label">Debit</div>
              <div className="grid2"><div className="fld"><label>Debit ledger</label><Sel id="jDrLedger" opts={['Depreciation', 'Furnace Fuel & Gas', 'Bad Debts', 'Round Off']} /></div><div className="fld"><label>Debit amount ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.jDr || ''} onChange={(e) => set('jDr', e.target.value)} /></div></div>
              <div className="sec-label">Credit</div>
              <div className="grid2"><div className="fld"><label>Credit ledger</label><Sel id="jCrLedger" opts={['Accumulated Depreciation', 'Provision for Expenses', 'Sundry Debtors']} /></div><div className="fld"><label>Credit amount ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.jCr || ''} onChange={(e) => set('jCr', e.target.value)} /></div></div>
              <div className={`jbal ${jOk ? 'ok' : (jDr > 0 || jCr > 0) && jDiff !== 0 ? 'bad' : ''}`}>
                <div className="jbal-row"><span>Debit <b>{inr2(jDr)}</b></span><span>Credit <b>{inr2(jCr)}</b></span><span>Diff <b>{inr2(Math.abs(jDiff))}</b></span></div>
                <div className="jbal-status">{jOk ? '✓ Balanced — ready to post' : jDr === 0 && jCr === 0 ? 'Enter debit & credit' : jDiff > 0 ? `Credit short by ${inr2(jDiff)}` : `Debit short by ${inr2(-jDiff)}`}</div>
              </div>
              <div className="fld"><label>Narration (reason)</label><input className="ctl" placeholder="e.g. Being provision for June expenses" /></div>
              <Note>Adjustment entry — no cash / bank movement. Debit total must equal credit total to post.</Note>
            </div>
          )}

          {/* SALES */}
          {vType === 'sales' && (
            <div className="qp-pane on">
              <div className="fld"><label>Customer</label><Sel id="sCust" opts={['Mahalaxmi Traders — 27AACFM…9K1', 'Shree Balaji Enterprises — 27AAB…2Z1']} /></div>
              <div className="grid2">
                <div className="fld"><label>Place of supply</label><Sel id="sPos" opts={[{ value: 'intra', label: 'Gujarat — intra-state (CGST+SGST)' }, { value: 'inter', label: 'Maharashtra — inter-state (IGST)' }]} /></div>
                <div className="fld"><label>Invoice date</label><input className="ctl" defaultValue="27 Jul 2026" /></div>
              </div>
              <div className="fld"><label>Item / service</label><Sel id="sItem" opts={['Heat Treatment — Carburising (SAC 9988)', 'Annealing job (SAC 9988)']} /></div>
              <div className="grid3">
                <div className="fld"><label>Qty</label><input className="ctl" inputMode="decimal" placeholder="0" value={v.sQty || ''} onChange={(e) => set('sQty', e.target.value)} /></div>
                <div className="fld"><label>Rate ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.sRate || ''} onChange={(e) => set('sRate', e.target.value)} /></div>
                <div className="fld"><label>GST rate</label><Sel id="sGst" opts={[{ value: '5', label: '5%' }, { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }]} /></div>
              </div>
              <TaxBox taxable={pnum(v.sQty) * pnum(v.sRate)} gst={pnum(v.sGst)} pos={v.sPos} total="Invoice total" />
              <Note tone="ok">Eligible for e-Invoice — IRN &amp; signed QR will be fetched on save.</Note>
            </div>
          )}

          {/* PURCHASE */}
          {vType === 'purchase' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Supplier bill no.</label><input className="ctl" placeholder="Vendor invoice no." /></div><div className="fld"><label>Bill date</label><input className="ctl" defaultValue="24 Jul 2026" /></div></div>
              <div className="fld"><label>Supplier</label><Sel id="pSupplier" opts={['Gujarat Poly Pvt Ltd — 24AAGCG…2P3', 'Precision Heat Treaters — 27AAB…5T1']} /></div>
              <div className="grid2">
                <div className="fld"><label>Place of supply</label><Sel id="pPos" opts={[{ value: 'intra', label: 'Gujarat — intra-state (CGST+SGST)' }, { value: 'inter', label: 'Maharashtra — inter-state (IGST)' }]} /></div>
                <div className="fld"><label>Item / service</label><Sel id="pItem" opts={['HDPE Granules (HSN 3901)', 'Furnace LPG (HSN 2711)']} /></div>
              </div>
              <div className="grid3">
                <div className="fld"><label>Qty</label><input className="ctl" inputMode="decimal" placeholder="0" value={v.pQty || ''} onChange={(e) => set('pQty', e.target.value)} /></div>
                <div className="fld"><label>Rate ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.pRate || ''} onChange={(e) => set('pRate', e.target.value)} /></div>
                <div className="fld"><label>GST rate</label><Sel id="pGst" opts={[{ value: '5', label: '5%' }, { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }]} /></div>
              </div>
              <TaxBox taxable={pnum(v.pQty) * pnum(v.pRate)} gst={pnum(v.pGst)} pos={v.pPos} total="Bill total" />
              <Note>ITC flows to GSTR-2B reconciliation. 194Q vs supplier's 206C(1H) is auto-guarded to avoid double tax.</Note>
            </div>
          )}

          {/* CREDIT / DEBIT NOTE */}
          {(vType === 'creditnote' || vType === 'debitnote') && (() => {
            const p = vType === 'creditnote' ? 'cn' : 'dn';
            const taxable = pnum(v[`${p}Tax`]), gst = pnum(v[`${p}Gst`]), tax = (taxable * gst) / 100;
            return (
              <div className="qp-pane on">
                <div className="grid2"><div className="fld"><label>{vType === 'creditnote' ? 'Credit' : 'Debit'} note no.</label><input className="ctl" defaultValue={vType === 'creditnote' ? 'CN/26-27/0020' : 'DN/26-27/0012'} /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
                <div className="fld"><label>{vType === 'creditnote' ? 'Against sales invoice' : 'Against purchase bill'}</label><Sel id={`${p}Against`} opts={vType === 'creditnote' ? ['SI/26-27/0461 — Shree Balaji ₹1,04,200', 'SI/26-27/0448 — Tata Motors ₹3,20,000'] : ['PB/26-27/0311 — Gujarat Poly ₹1,12,000', 'PB/26-27/0298 — Precision Heat ₹64,800']} /></div>
                <div className="grid2">
                  <div className="fld"><label>Reason</label><Sel id={`${p}Reason`} opts={vType === 'creditnote' ? ['Sales return', 'Rate difference', 'Post-sale discount'] : ['Purchase return', 'Damaged goods', 'Short supply']} /></div>
                  <div className="fld"><label>GST rate</label><Sel id={`${p}Gst`} opts={[{ value: '5', label: '5%' }, { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }]} /></div>
                </div>
                <div className="fld"><label>Taxable amount ₹</label><input className="ctl big" inputMode="decimal" placeholder="0.00" value={v[`${p}Tax`] || ''} onChange={(e) => set(`${p}Tax`, e.target.value)} /></div>
                {taxable > 0 && gst > 0 && <div className="calc-box"><KV k="Taxable value" v={taxable} /><KV k={`GST @ ${gst}%`} v={tax} /><KV k="Note total" v={taxable + tax} strong /></div>}
                <div className="fld"><label>Narration</label><input className="ctl" placeholder="Reason for note" /></div>
                <Note>{vType === 'creditnote' ? 'Reduces output GST liability and reflects in GSTR-1 (credit / debit notes). Above ₹1L → approval.' : 'Reverses input ITC on the returned value and adjusts the supplier ledger.'}</Note>
              </div>
            );
          })()}

          {/* BANK multi-line */}
          {vType === 'bank' && (
            <div className="qp-pane on">
              <div className="bank-strip">
                <div className="row1">
                  <div className="bk-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg></div>
                  <Sel id="bankSel" dv="HDFC Bank — Current A/c ••4021" opts={['HDFC Bank — Current A/c ••4021', 'ICICI Bank — Current A/c ••7788', 'SBI — CC A/c ••1120', 'Cash in Hand']} />
                </div>
                <div className="bk-meta"><span>Book balance <b>₹41,86,220</b></span><span>Lines this session <b>{bankLines.length}</b></span><span>Series <b>BNK/26-27</b></span></div>
              </div>
              <div className="lines">
                <div className="lines-head"><div>Date</div><div>Opposite A/c &amp; narration</div><div>Dr/Cr</div><div className="r">Amount</div><div /></div>
                <div>
                  {bankLines.length === 0
                    ? <div className="lines-empty">No lines yet — add the first line below. It will post to the selected bank.</div>
                    : bankLines.map((l, i) => (
                      <div className="line-row" key={i}>
                        <div className="l-date">{l.date}</div>
                        <div className="l-acc">{l.acc}<small>{l.narr || '—'}</small></div>
                        <div className={`dir ${l.dir}`}>{l.dir === 'dr' ? 'DR ▸ Recd' : 'CR ▸ Paid'}</div>
                        <div className="l-amt">{inr0(l.amt)}</div>
                        <button className="l-del" title="Remove" onClick={() => setBankLines((b) => b.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                </div>
              </div>
              <div className="composer">
                <div className="ctitle"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg> Add line — same bank</div>
                <div className="crow">
                  <div className="fld" style={{ margin: 0 }}><label>Date</label><input className="ctl" value={v.lnDate || '27 Jul 26'} onChange={(e) => set('lnDate', e.target.value)} /></div>
                  <div className="fld" style={{ margin: 0 }}><label>Dr / Cr (bank)</label>
                    <div className="seg-dir">
                      <button type="button" className={dir === 'dr' ? 'on-dr' : ''} onClick={() => setDir('dr')}>Received ▸ Dr</button>
                      <button type="button" className={dir === 'cr' ? 'on-cr' : ''} onClick={() => setDir('cr')}>Paid ▸ Cr</button>
                    </div>
                  </div>
                </div>
                <div className="fld" style={{ margin: '0 0 9px' }}><label>Opposite account (particulars)</label>
                  <Sel id="lnAcc" dv="Mahalaxmi Traders" opts={['Mahalaxmi Traders', 'Gujarat Poly Pvt Ltd', 'Anand Fabrication (Job Worker)', 'MSEB — Electricity', 'Salary Payable', 'GST Payable', 'TDS Payable — 194C']} />
                </div>
                <div className="crow amt">
                  <div className="fld" style={{ margin: 0 }}><label>Amount ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.lnAmt || ''} onChange={(e) => set('lnAmt', e.target.value)} /></div>
                  <div className="fld" style={{ margin: 0 }}><label>Narration</label><input className="ctl" placeholder="e.g. NEFT ref / cheque no." value={v.lnNarr || ''} onChange={(e) => set('lnNarr', e.target.value)} /></div>
                </div>
                <button className="add-btn" onClick={addBankLine}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg> Add line &amp; keep bank selected</button>
              </div>
              <Note>One bank, many lines. Each line hits the <b>same selected bank</b>; the opposite account carries the contra leg. Post as one batch — all lines audit-logged.</Note>
            </div>
          )}

          {/* JOB WORK */}
          {vType === 'job' && (
            <div className="qp-pane on">
              <div className="toggle2">
                <button type="button" className={jobDir === 'inward' ? 'on' : ''} onClick={() => setJobDir('inward')}>Inward (receive)</button>
                <button type="button" className={jobDir === 'outward' ? 'on' : ''} onClick={() => setJobDir('outward')}>Outward (dispatch)</button>
              </div>
              {jobDir === 'inward' ? (
                <div style={{ marginTop: 12 }}>
                  <div className="grid2"><div className="fld"><label>Inward challan no.</label><input className="ctl" defaultValue="JW-IN/26-27/0052" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
                  <div className="fld"><label>Customer (material owner)</label><Sel id="jwCust" opts={['Mahalaxmi Traders — 27AACFM…9K1', 'Shree Balaji Enterprises — 27AAB…2Z1']} /></div>
                  <div className="fld"><label>Memo type</label>
                    <div className="toggle2"><button type="button" className={memo === 'debit' ? 'on' : ''} onClick={() => setMemo('debit')}>Debit (bill to ledger)</button><button type="button" className={memo === 'cash' ? 'on' : ''} onClick={() => setMemo('cash')}>Cash (collect on delivery)</button></div>
                  </div>
                  <div className="grid2">
                    <div className="fld"><label>Process</label><Sel id="jwProc" opts={['Carburising', 'Hardening & Tempering', 'Annealing', 'Nitriding']} onPick={(val) => { const r = PROC_RATE[val]; if (r) set('jwRate', r); }} /></div>
                    <div className="fld"><label>Material / description</label><Sel id="jwMaterial" opts={['Gears', 'Shafts', 'MS Rounds']} /></div>
                  </div>
                  <div className="grid3">
                    <div className="fld"><label>Qty received (kg)</label><input className="ctl" inputMode="decimal" placeholder="0" value={v.jwQtyIn || ''} onChange={(e) => set('jwQtyIn', e.target.value)} /></div>
                    <div className="fld"><label>Rate ₹/kg</label><input className="ctl" inputMode="decimal" placeholder="auto" value={v.jwRate || ''} onChange={(e) => set('jwRate', e.target.value)} /></div>
                    <div className="fld"><label>GST rate</label><Sel id="jwGst" dv="18" opts={[{ value: '18', label: '18% (SAC 9988)' }, { value: '12', label: '12%' }, { value: '5', label: '5%' }]} /></div>
                  </div>
                  {pnum(v.jwQtyIn) > 0 && pnum(v.jwRate) > 0 && (() => { const c = pnum(v.jwQtyIn) * pnum(v.jwRate); const g = pnum(v.jwGst); return (
                    <div className="calc-box"><KV k={`Process charge (${pnum(v.jwQtyIn)} × ₹${pnum(v.jwRate)})`} v={c} /><KV k={`GST @ ${g}%`} v={c * g / 100} /><KV k={memo === 'cash' ? 'Cash memo total' : 'Debit memo total'} v={c + c * g / 100} strong /></div>
                  ); })()}
                  <Note>{memo === 'cash' ? 'Cash memo → charge collected on delivery; a receipt is raised (no receivable). Pending-to-return = qty received.' : 'Debit memo → process charge posts to the customer ledger (receivable) with GST + TDS 194C where deducted. Pending-to-return = qty received.'}</Note>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div className="grid2"><div className="fld"><label>Outward challan no. (Rule 45)</label><input className="ctl" defaultValue="JW-OUT/26-27/0061" /></div><div className="fld"><label>Date</label><input className="ctl" defaultValue="27 Jul 2026" /></div></div>
                  <div className="fld"><label>Against inward challan</label>
                    <Sel id="jwInwardRef" opts={[{ value: '1000|400', label: 'JW-IN/0044 · Mahalaxmi · Gears · recd 1,000 · pending 400' }, { value: '500|500', label: 'JW-IN/0051 · Shree Balaji · Shafts · recd 500 · pending 500' }, { value: '250|60', label: 'JW-IN/0039 · Tata Motors · Pins · recd 250 · pending 60' }]} />
                    <div className="hint">Outward can dispatch at most the <b>pending quantity</b>. <span className="badge-auto">pending <b>{pending.toLocaleString('en-IN')}</b> kg</span></div>
                  </div>
                  <div className="grid2"><div className="fld"><label>Dispatch qty (kg)</label><input className="ctl" inputMode="decimal" placeholder="0" value={v.jwQtyOut || ''} onChange={(e) => set('jwQtyOut', e.target.value)} /></div><div className="fld"><label>Handling / burning loss (kg)</label><input className="ctl" inputMode="decimal" placeholder="0" value={v.jwLoss || ''} onChange={(e) => set('jwLoss', e.target.value)} /></div></div>
                  {!!v.jwInwardRef && (
                    <div className="calc-box">
                      <div className="kv"><span className="k">Pending before dispatch</span><span className="v">{pending.toLocaleString('en-IN')} kg</span></div>
                      <div className="kv"><span className="k">Dispatch now</span><span className="v">{outQ.toLocaleString('en-IN')} kg</span></div>
                      <div className="kv"><span className="k">Handling / burning loss</span><span className="v">{outLoss.toLocaleString('en-IN')} kg</span></div>
                      <div className="kv"><span className="k" style={{ fontWeight: 700, color: 'var(--text)' }}>Pending after</span><span className="v" style={{ fontSize: 15 }}>{Math.max(0, pending - outQ - outLoss).toLocaleString('en-IN')} kg</span></div>
                      {outOver && <div className="jbal-status" style={{ color: 'var(--red-ink)', marginTop: 8 }}>⚠ Dispatch + loss ({outQ + outLoss}) exceeds pending {pending} kg — reduce quantity.</div>}
                    </div>
                  )}
                  <Note>No GST on Rule 45 movement — charge was booked at inward per the Cash / Debit memo. Partial dispatches allowed until pending = 0; feeds <b>ITC-04</b>.</Note>
                </div>
              )}
            </div>
          )}

          {/* FORFEITURE */}
          {vType === 'forfeiture' && (
            <div className="qp-pane on">
              <Note tone="warn">Processor's lien (Contract Act §170). This handles a customer's property — notice, approval &amp; signing are required. Fully audited.</Note>
              <div className="fld"><label>Overdue customer</label><Sel id="frCust" dv="104200" opts={[{ value: '104200', label: 'Shree Balaji Enterprises — overdue ₹1,04,200 (95 d)' }, { value: '61000', label: 'Ganesh Auto Parts — overdue ₹61,000 (72 d)' }]} /></div>
              <div className="fld"><label>Material in custody</label><Sel id="frMaterial" opts={['JW-IN/0051 · 500 kg shafts', 'JW-IN/0033 · 260 kg brackets']} /></div>
              <div className="grid2"><div className="fld"><label>Assessed realizable value ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.frValue || ''} onChange={(e) => set('frValue', e.target.value)} /></div><div className="fld"><label>Expected sale value ₹</label><input className="ctl" inputMode="decimal" placeholder="0.00" value={v.frSale || ''} onChange={(e) => set('frSale', e.target.value)} /></div></div>
              {frSale > 0 && (
                <div className="calc-box">
                  <KV k="Outstanding (overdue)" v={frDue} /><KV k="Recovered-goods value (to stock)" v={pnum(v.frValue)} /><KV k="Expected sale proceeds" v={frSale} strong />
                  <div className="jbal-status" style={{ color: frDiff >= 0 ? 'var(--good)' : 'var(--red-ink)', marginTop: 8 }}>{frDiff >= 0 ? `✓ Recovers dues · surplus ${inr2(frDiff)} refundable to customer` : `⚠ Shortfall ${inr2(-frDiff)} stays receivable / bad-debt (approval)`}</div>
                </div>
              )}
              <Note>Forfeiture moves the material to <b>Recovered-Goods stock</b> and reduces the receivable. On sale proceeds settle the dues — surplus refundable, shortfall receivable / bad-debt.</Note>
            </div>
          )}

          {/* PAYROLL */}
          {vType === 'payroll' && (
            <div className="qp-pane on">
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, marginBottom: 14, background: 'linear-gradient(180deg,color-mix(in srgb,var(--red) 5%,var(--paper-2)),var(--paper-2))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><b style={{ fontSize: 14 }}>July 2026 payroll run</b><span className="pill neut" style={{ marginLeft: 'auto' }}>Not run</span></div>
                <div className="bk-meta" style={{ marginTop: 10 }}><span>Employees <b>142</b></span><span>Gross <b>₹52.1L</b></span><span>Net <b>₹41.8L</b></span></div>
              </div>
              <div className="grid2"><div className="fld"><label>Pay month</label><Sel id="payMonth" dv="July 2026" opts={['July 2026', 'August 2026']} /></div><div className="fld"><label>Pay date</label><input className="ctl" defaultValue="31 Jul 2026" /></div></div>
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                <div className="kv"><span className="k">Basic + allowances</span><span className="v">₹52,10,000</span></div>
                <div className="kv"><span className="k">PF (employee 12%)</span><span className="v">₹6,25,200</span></div>
                <div className="kv"><span className="k">ESI + Professional Tax</span><span className="v">₹1,84,600</span></div>
                <div className="kv"><span className="k">TDS on salary (192)</span><span className="v">₹2,20,000</span></div>
                <div className="kv"><span className="k" style={{ fontWeight: 700, color: 'var(--text)' }}>Net payable (bank)</span><span className="v" style={{ fontSize: 15 }}>₹41,80,200</span></div>
              </div>
              <Note>Runs off biometric attendance → LOP / overtime. Approve to post the salary journal to GL and stage <b>PF ECR · ESI · PT · 24Q</b>. Disbursement is signed &amp; maker-checker gated.</Note>
            </div>
          )}

          {/* MASTERS: LEDGER / PROCESS / RATE (representative) */}
          {vType === 'ledger' && (
            <div className="qp-pane on">
              <div className="fld"><label>Ledger name</label><input className="ctl big" placeholder="Party / ledger name" /></div>
              <div className="grid2"><div className="fld"><label>Category</label><Sel id="ldgCat" opts={['Customer', 'Supplier', 'Job-Worker', 'Expense', 'Bank']} /></div><div className="fld"><label>Under group</label><Sel id="ldgGroup" opts={['Sundry Debtors', 'Sundry Creditors', 'Bank Accounts']} /></div></div>
              <div className="grid2"><div className="fld"><label>GSTIN</label><input className="ctl" placeholder="24AABCS…1Z8" /></div><div className="fld"><label>PAN</label><input className="ctl" placeholder="AABCS1429P" /></div></div>
              <Note>Ledgers carry categories, multi-address (state-wise GSTIN) and a blacklist flag — approval-gated to remove.</Note>
            </div>
          )}
          {vType === 'process' && (
            <div className="qp-pane on">
              <div className="grid2"><div className="fld"><label>Process code</label><input className="ctl" placeholder="e.g. CARB" /></div><div className="fld"><label>Process name</label><input className="ctl" placeholder="e.g. Carburising" /></div></div>
              <div className="grid2"><div className="fld"><label>SAC</label><input className="ctl" defaultValue="9988" /></div><div className="fld"><label>Charge basis (UoM)</label><Sel id="procUom" opts={['Per kg', 'Per piece', 'Per lot']} /></div></div>
              <Note>Processes drive inward, job cards and Rate Master lookup. This is a job-work house — no manufacturing BOM.</Note>
            </div>
          )}
          {vType === 'rate' && (
            <div className="qp-pane on">
              <div className="fld"><label>Process</label><Sel id="rateProc" opts={['Carburising', 'Hardening & Tempering', 'Annealing']} /></div>
              <div className="fld"><label>Customer (blank = standard rate)</label><Sel id="rateCust" dv="All customers — standard rate" opts={['All customers — standard rate', 'Mahalaxmi Traders', 'Tata Motors Ltd']} /></div>
              <div className="grid2"><div className="fld"><label>Rate ₹/kg</label><input className="ctl" placeholder="0.00" /></div><div className="fld"><label>Effective from</label><input className="ctl" defaultValue="01 Apr 2026" /></div></div>
              <Note>Customer-specific contract rates override the standard rate on job cards.</Note>
            </div>
          )}
        </div>

        <div className="qp-foot">
          {vType === 'bank' && (
            <div className="totwrap">
              <div className="tot"><span>Received</span><b className="recv">{inr0(recv)}</b></div>
              <div className="tot"><span>Paid</span><b className="paid">{inr0(paid)}</b></div>
              <div className="tot"><span>Net</span><b>{inr0(recv - paid)}</b></div>
            </div>
          )}
          {vType !== 'bank' && <div style={{ flex: 1 }} />}
          <button className="btn btn-primary" disabled={!canPost} onClick={postQuick}>{postLabel}</button>
        </div>
      </aside>

      {/* PIN sign modal */}
      {pin && (
        <div className="pin-scrim" style={{ display: 'flex' }} onClick={() => setPin(false)}>
          <div className="pin-card" onClick={(e) => e.stopPropagation()}>
            <div className="pin-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></div>
            <h3>Signing PIN</h3>
            <p>Enter your 4-digit signing PIN to post this voucher. The action is written to the audit trail.</p>
            <input className="pin-input" inputMode="numeric" maxLength={6} value={pinVal} autoFocus placeholder="••••" onChange={(e) => { setPinVal(e.target.value); setPinErr(false); }} onKeyDown={(e) => { if (e.key === 'Enter') confirmPin(); }} />
            {pinErr && <div className="pin-err" style={{ display: 'block' }}>Enter at least 4 digits.</div>}
            <div className="pin-actions"><button className="btn btn-ghost" onClick={() => setPin(false)}>Cancel</button><button className="btn btn-primary" onClick={confirmPin}>Sign &amp; post</button></div>
          </div>
        </div>
      )}
    </>
  );
}
