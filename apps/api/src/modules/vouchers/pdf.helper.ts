import { getVoucher } from '../accounting/vouchers.service.js';
import { getCompanyProfile, getPrintBank } from '../settings/settings.service.js';
import { renderVoucherPdf } from './pdf.service.js';

/** Render a voucher's branded PDF (with statutory header + print bank) to a Buffer. */
export async function voucherPdfBuffer(companyId: string, voucherId: string): Promise<{ buffer: Buffer; voucherNo: string } | null> {
  const v = await getVoucher(companyId, voucherId);
  if (!v) return null;
  const [company, bank] = await Promise.all([getCompanyProfile(companyId), getPrintBank(companyId)]);
  const buffer = await renderVoucherPdf(v, company, bank);
  return { buffer, voucherNo: String(v.voucher_no) };
}
