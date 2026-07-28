import type { RowDataPacket } from 'mysql2';
import type { VoucherComposeInput, VoucherCreateInput } from '@fintranact/validation';
import { pool } from '../../common/db.js';
import { Errors } from '../../common/errors.js';
import { createVoucher } from '../accounting/vouchers.service.js';

interface Ctx {
  companyId: string;
  branchId?: string | null;
  userId: string;
  requestId?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function systemLedgers(companyId: string): Promise<Record<string, string>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT system_key, id FROM ledgers WHERE company_id = ? AND system_key IS NOT NULL',
    [companyId],
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.system_key as string] = r.id as string;
  return map;
}

export interface ComposeResult {
  id: string;
  voucherNo: string;
  type: string;
  total: number;
}

/**
 * Compose the "simple" vouchers (payment/receipt/contra/journal) and the GST
 * notes (credit/debit) into a balanced double-entry voucher, then post it via
 * the shared voucher engine (which re-checks that debits === credits).
 */
export async function composeVoucher(input: VoucherComposeInput, ctx: Ctx): Promise<ComposeResult> {
  let type: VoucherCreateInput['type'];
  let lines: VoucherCreateInput['lines'] = [];
  let total = 0;

  switch (input.kind) {
    case 'payment': {
      type = 'payment';
      const gross = round2(input.amount);
      const tds = input.tdsRate ? round2((gross * input.tdsRate) / 100) : 0;
      if (tds > 0) {
        const sys = await systemLedgers(ctx.companyId);
        if (!sys.tds_payable) throw Errors.validation('Missing system ledger "tds_payable"');
        lines = [
          { ledgerId: input.partyLedgerId, drCr: 'dr', amount: gross },
          { ledgerId: sys.tds_payable, drCr: 'cr', amount: tds },
          { ledgerId: input.bankLedgerId, drCr: 'cr', amount: round2(gross - tds) },
        ];
      } else {
        lines = [
          { ledgerId: input.partyLedgerId, drCr: 'dr', amount: gross },
          { ledgerId: input.bankLedgerId, drCr: 'cr', amount: gross },
        ];
      }
      total = gross;
      break;
    }
    case 'receipt': {
      type = 'receipt';
      total = round2(input.amount);
      lines = [
        { ledgerId: input.bankLedgerId, drCr: 'dr', amount: total },
        { ledgerId: input.partyLedgerId, drCr: 'cr', amount: total },
      ];
      break;
    }
    case 'contra': {
      type = 'contra';
      if (input.fromLedgerId === input.toLedgerId) throw Errors.validation('From and To accounts must differ');
      total = round2(input.amount);
      lines = [
        { ledgerId: input.toLedgerId, drCr: 'dr', amount: total },
        { ledgerId: input.fromLedgerId, drCr: 'cr', amount: total },
      ];
      break;
    }
    case 'journal': {
      type = 'journal';
      if (input.debitLedgerId === input.creditLedgerId) throw Errors.validation('Debit and Credit ledgers must differ');
      total = round2(input.amount);
      lines = [
        { ledgerId: input.debitLedgerId, drCr: 'dr', amount: total },
        { ledgerId: input.creditLedgerId, drCr: 'cr', amount: total },
      ];
      break;
    }
    case 'credit_note': {
      type = 'credit_note';
      const sys = await systemLedgers(ctx.companyId);
      const need = input.placeOfSupply === 'intra' ? ['output_cgst', 'output_sgst'] : ['output_igst'];
      for (const k of need) if (!sys[k]) throw Errors.validation(`Missing system ledger "${k}"`);
      const taxable = round2(input.taxable);
      const tax = round2((taxable * input.gstRate) / 100);
      total = round2(taxable + tax);
      lines = [{ ledgerId: input.salesLedgerId, drCr: 'dr', amount: taxable }];
      if (input.placeOfSupply === 'intra') {
        lines.push({ ledgerId: sys.output_cgst!, drCr: 'dr', amount: round2(tax / 2) });
        lines.push({ ledgerId: sys.output_sgst!, drCr: 'dr', amount: round2(tax / 2) });
      } else {
        lines.push({ ledgerId: sys.output_igst!, drCr: 'dr', amount: tax });
      }
      lines.push({ ledgerId: input.partyLedgerId, drCr: 'cr', amount: total });
      break;
    }
    case 'debit_note': {
      type = 'debit_note';
      const sys = await systemLedgers(ctx.companyId);
      const need = input.placeOfSupply === 'intra' ? ['input_cgst', 'input_sgst'] : ['input_igst'];
      for (const k of need) if (!sys[k]) throw Errors.validation(`Missing system ledger "${k}"`);
      const taxable = round2(input.taxable);
      const tax = round2((taxable * input.gstRate) / 100);
      total = round2(taxable + tax);
      lines = [{ ledgerId: input.partyLedgerId, drCr: 'dr', amount: total }, { ledgerId: input.purchaseLedgerId, drCr: 'cr', amount: taxable }];
      if (input.placeOfSupply === 'intra') {
        lines.push({ ledgerId: sys.input_cgst!, drCr: 'cr', amount: round2(tax / 2) });
        lines.push({ ledgerId: sys.input_sgst!, drCr: 'cr', amount: round2(tax / 2) });
      } else {
        lines.push({ ledgerId: sys.input_igst!, drCr: 'cr', amount: tax });
      }
      break;
    }
  }

  const voucher = await createVoucher({ type, date: input.date, narration: input.narration, lines }, ctx);
  return { id: voucher.id, voucherNo: voucher.voucherNo, type, total };
}
