-- 006_system_ledgers — tax/income system ledgers used to auto-compose GST vouchers.

ALTER TABLE ledgers ADD COLUMN system_key VARCHAR(40) NULL AFTER category;
CREATE UNIQUE INDEX uq_ledger_system ON ledgers (company_id, system_key);

SET @co := '11111111-1111-1111-1111-111111111111';

-- system_key lets the invoice composer find the right GST/income accounts.
INSERT IGNORE INTO ledgers (id, company_id, name, category, system_key, created_by) VALUES
 (UUID(), @co, 'Output CGST',                'tax',    'output_cgst',   NULL),
 (UUID(), @co, 'Output SGST',                'tax',    'output_sgst',   NULL),
 (UUID(), @co, 'Output IGST',                'tax',    'output_igst',   NULL),
 (UUID(), @co, 'Input CGST',                 'tax',    'input_cgst',    NULL),
 (UUID(), @co, 'Input SGST',                 'tax',    'input_sgst',    NULL),
 (UUID(), @co, 'Input IGST',                 'tax',    'input_igst',    NULL),
 (UUID(), @co, 'Job Work / Process Charges', 'income', 'income_jobwork', NULL),
 (UUID(), @co, 'Round Off',                  'expense','round_off',     NULL);
