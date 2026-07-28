-- 010_ledger_groups — Tally-style account group heads (chart-of-accounts hierarchy).
-- Ledgers roll up into groups; groups roll up into a primary nature for the P&L / Balance Sheet.

CREATE TABLE IF NOT EXISTS ledger_groups (
  id          CHAR(36) PRIMARY KEY,
  company_id  CHAR(36) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  parent_id   CHAR(36) NULL,                                  -- NULL = primary group
  nature      ENUM('asset','liability','income','expense','equity') NOT NULL,
  is_system   TINYINT(1) NOT NULL DEFAULT 1,
  sort        INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lg_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_lg_parent  FOREIGN KEY (parent_id)  REFERENCES ledger_groups(id),
  UNIQUE KEY uq_lg_company_name (company_id, name),
  INDEX idx_lg_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ledgers point at a group head (kept nullable so legacy rows import cleanly).
ALTER TABLE ledgers ADD COLUMN group_id CHAR(36) NULL AFTER category;
ALTER TABLE ledgers ADD CONSTRAINT fk_ledger_group FOREIGN KEY (group_id) REFERENCES ledger_groups(id);

SET @co := '11111111-1111-1111-1111-111111111111';

-- Primary groups (parent_id = NULL)
INSERT IGNORE INTO ledger_groups (id, company_id, name, parent_id, nature, sort) VALUES
 ('c0000000-0000-0000-0000-000000000001', @co, 'Capital Account',      NULL, 'equity',    10),
 ('c0000000-0000-0000-0000-000000000002', @co, 'Loans (Liability)',    NULL, 'liability', 20),
 ('c0000000-0000-0000-0000-000000000003', @co, 'Current Liabilities',  NULL, 'liability', 30),
 ('c0000000-0000-0000-0000-000000000004', @co, 'Fixed Assets',         NULL, 'asset',     40),
 ('c0000000-0000-0000-0000-000000000005', @co, 'Investments',          NULL, 'asset',     50),
 ('c0000000-0000-0000-0000-000000000006', @co, 'Current Assets',       NULL, 'asset',     60),
 ('c0000000-0000-0000-0000-000000000007', @co, 'Sales Accounts',       NULL, 'income',    70),
 ('c0000000-0000-0000-0000-000000000008', @co, 'Purchase Accounts',    NULL, 'expense',   80),
 ('c0000000-0000-0000-0000-000000000009', @co, 'Direct Income',        NULL, 'income',    90),
 ('c0000000-0000-0000-0000-00000000000a', @co, 'Direct Expenses',      NULL, 'expense',  100),
 ('c0000000-0000-0000-0000-00000000000b', @co, 'Indirect Income',      NULL, 'income',   110),
 ('c0000000-0000-0000-0000-00000000000c', @co, 'Indirect Expenses',    NULL, 'expense',  120),
 ('c0000000-0000-0000-0000-00000000000d', @co, 'Suspense Account',     NULL, 'liability',130);

-- Sub-groups under Current Assets
INSERT IGNORE INTO ledger_groups (id, company_id, name, parent_id, nature, sort) VALUES
 ('c1000000-0000-0000-0000-000000000001', @co, 'Bank Accounts',        'c0000000-0000-0000-0000-000000000006', 'asset', 61),
 ('c1000000-0000-0000-0000-000000000002', @co, 'Cash-in-Hand',         'c0000000-0000-0000-0000-000000000006', 'asset', 62),
 ('c1000000-0000-0000-0000-000000000003', @co, 'Sundry Debtors',       'c0000000-0000-0000-0000-000000000006', 'asset', 63),
 ('c1000000-0000-0000-0000-000000000004', @co, 'Stock-in-Hand',        'c0000000-0000-0000-0000-000000000006', 'asset', 64),
 ('c1000000-0000-0000-0000-000000000005', @co, 'Loans & Advances (Asset)', 'c0000000-0000-0000-0000-000000000006', 'asset', 65);

-- Sub-groups under Current Liabilities
INSERT IGNORE INTO ledger_groups (id, company_id, name, parent_id, nature, sort) VALUES
 ('c2000000-0000-0000-0000-000000000001', @co, 'Sundry Creditors',     'c0000000-0000-0000-0000-000000000003', 'liability', 31),
 ('c2000000-0000-0000-0000-000000000002', @co, 'Duties & Taxes',       'c0000000-0000-0000-0000-000000000003', 'liability', 32),
 ('c2000000-0000-0000-0000-000000000003', @co, 'Provisions',           'c0000000-0000-0000-0000-000000000003', 'liability', 33);

-- Sub-groups under Loans (Liability)
INSERT IGNORE INTO ledger_groups (id, company_id, name, parent_id, nature, sort) VALUES
 ('c3000000-0000-0000-0000-000000000001', @co, 'Secured Loans',        'c0000000-0000-0000-0000-000000000002', 'liability', 21),
 ('c3000000-0000-0000-0000-000000000002', @co, 'Unsecured Loans',      'c0000000-0000-0000-0000-000000000002', 'liability', 22),
 ('c3000000-0000-0000-0000-000000000003', @co, 'Bank OD / CC',         'c0000000-0000-0000-0000-000000000002', 'liability', 23);

-- Re-home the system ledgers seeded in 006/007 into their correct group heads.
UPDATE ledgers SET group_id = 'c2000000-0000-0000-0000-000000000002'
  WHERE company_id = @co AND system_key IN
    ('output_cgst','output_sgst','output_igst','input_cgst','input_sgst','input_igst','tds_payable');
UPDATE ledgers SET group_id = 'c0000000-0000-0000-0000-000000000009'
  WHERE company_id = @co AND system_key = 'income_jobwork';       -- Direct Income
UPDATE ledgers SET group_id = 'c0000000-0000-0000-0000-000000000008'
  WHERE company_id = @co AND system_key = 'expense_purchase';     -- Purchase Accounts
UPDATE ledgers SET group_id = 'c0000000-0000-0000-0000-00000000000c'
  WHERE company_id = @co AND system_key = 'round_off';            -- Indirect Expenses
