import PDFDocument from 'pdfkit';
import type { RowDataPacket } from 'mysql2/promise';

/** Human labels for voucher types (mirrors the web Quick Entry). */
const TYPE_LABEL: Record<string, string> = {
  payment: 'Payment Voucher', receipt: 'Receipt Voucher', contra: 'Contra Voucher',
  journal: 'Journal Voucher', sales: 'Tax Invoice', purchase: 'Purchase Bill',
  credit_note: 'Credit Note', debit_note: 'Debit Note',
};

interface VoucherLine {
  ledger_name?: string;
  dr_amount?: number | string;
  cr_amount?: number | string;
  narration?: string | null;
}

// pdfkit's built-in Helvetica has no ₹ glyph, so use the "Rs." prefix (standard
// on generated Indian invoices without an embedded Unicode font).
const inr = (n: number): string =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Render a branded voucher PDF from the DB rows and return it as a Buffer.
 * The company statutory block (GSTIN/PAN/TAN) is drawn from the company profile.
 */
export function renderVoucherPdf(
  voucher: RowDataPacket,
  company: RowDataPacket | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // ---- Header: company identity + statutory ----
    const coName = String(company?.name ?? 'Company');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(coName, left, 48);
    doc.font('Helvetica').fontSize(9.5).fillColor('#475569');
    const addr = [company?.address, company?.city, company?.pincode].filter(Boolean).join(', ');
    if (addr) doc.text(addr, left, doc.y + 2, { width: width * 0.62 });

    const statY = 50;
    const stat = (k: string, v?: unknown): string | null => (v ? `${k}: ${v}` : null);
    const statLines = [
      stat('GSTIN', company?.gstin),
      stat('PAN', company?.pan),
      stat('TAN', company?.tan),
    ].filter(Boolean) as string[];
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
      .text(statLines.join('\n'), left, statY, { width, align: 'right' });

    doc.moveTo(left, 108).lineTo(right, 108).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // ---- Title band ----
    const title = TYPE_LABEL[String(voucher.type)] ?? 'Voucher';
    doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(13).text(title.toUpperCase(), left, 122);
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
    const dateStr = voucher.date ? new Date(voucher.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    doc.text(`No: ${voucher.voucher_no}`, left, 122, { width, align: 'right' });
    doc.text(`Date: ${dateStr}    Status: ${String(voucher.status ?? 'posted')}`, left, 138, { width, align: 'right' });

    if (voucher.narration) {
      doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#475569')
        .text(`Narration: ${voucher.narration}`, left, 160, { width });
    }

    // ---- Ledger table ----
    let y = voucher.narration ? 184 : 168;
    const cDr = right - 200;
    const cCr = right - 100;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a');
    doc.rect(left, y, width, 22).fill('#f1f5f9');
    doc.fillColor('#0f172a')
      .text('Particulars', left + 8, y + 6)
      .text('Debit', cDr, y + 6, { width: 92, align: 'right' })
      .text('Credit', cCr, y + 6, { width: 92, align: 'right' });
    y += 22;

    const lines: VoucherLine[] = Array.isArray(voucher.lines) ? voucher.lines : [];
    let totDr = 0;
    let totCr = 0;
    doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b');
    for (const ln of lines) {
      const dr = num(ln.dr_amount);
      const cr = num(ln.cr_amount);
      totDr += dr;
      totCr += cr;
      const label = (dr > 0 ? '' : '    ') + String(ln.ledger_name ?? '');
      doc.text(label, left + 8, y + 6, { width: cDr - left - 16 });
      if (dr > 0) doc.text(inr(dr), cDr, y + 6, { width: 92, align: 'right' });
      if (cr > 0) doc.text(inr(cr), cCr, y + 6, { width: 92, align: 'right' });
      const rowH = Math.max(20, doc.heightOfString(label, { width: cDr - left - 16 }) + 10);
      doc.moveTo(left, y + rowH).lineTo(right, y + rowH).strokeColor('#eef2f7').lineWidth(0.7).stroke();
      y += rowH;
    }

    // Totals
    doc.rect(left, y, width, 24).fill('#f8fafc');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
      .text('Total', left + 8, y + 7)
      .text(inr(totDr), cDr, y + 7, { width: 92, align: 'right' })
      .text(inr(totCr), cCr, y + 7, { width: 92, align: 'right' });
    y += 40;

    // ---- Signature block ----
    doc.font('Helvetica').fontSize(9.5).fillColor('#475569')
      .text(`For ${coName}`, right - 200, y + 30, { width: 200, align: 'right' });
    doc.text('Authorised Signatory', right - 200, y + 64, { width: 200, align: 'right' });

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text('This is a computer-generated voucher and does not require a physical signature.', left, doc.page.height - 70, { width, align: 'center' });

    doc.end();
  });
}
