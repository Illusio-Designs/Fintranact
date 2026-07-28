-- 007_purchase_ledgers — statutory system ledgers used to auto-compose purchase bills.

SET @co := '11111111-1111-1111-1111-111111111111';

-- TDS payable is credited when TDS is deducted on a purchase; a default expense
-- head gives the purchase composer a fallback account when none is chosen.
INSERT IGNORE INTO ledgers (id, company_id, name, category, system_key, created_by) VALUES
 (UUID(), @co, 'TDS Payable',          'liability', 'tds_payable',      NULL),
 (UUID(), @co, 'Purchases / Material', 'expense',   'expense_purchase', NULL);
