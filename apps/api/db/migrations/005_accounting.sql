-- 005_accounting — Phase 1 core: FY, ledger addresses, numbering, vouchers, lines.

-- Multi-address for ledgers (PRD §5.2)
CREATE TABLE IF NOT EXISTS ledger_addresses (
  id          CHAR(36) PRIMARY KEY,
  company_id  CHAR(36) NOT NULL,
  ledger_id   CHAR(36) NOT NULL,
  type        ENUM('registered','shipping','works') NOT NULL DEFAULT 'registered',
  line        VARCHAR(400) NOT NULL,
  state       VARCHAR(50) NULL,
  gstin       VARCHAR(15) NULL,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_addr_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  INDEX idx_addr_ledger (ledger_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add blacklist reason to ledgers (created in 003 without it)
ALTER TABLE ledgers ADD COLUMN blacklist_reason VARCHAR(255) NULL AFTER blacklisted;

-- Financial years (Apr–Mar) with open/active/closed states (PRD §5.17)
CREATE TABLE IF NOT EXISTS financial_years (
  id          CHAR(36) PRIMARY KEY,
  company_id  CHAR(36) NOT NULL,
  year        VARCHAR(7) NOT NULL,     -- e.g. 2026-27
  starts_on   DATE NOT NULL,
  ends_on     DATE NOT NULL,
  status      ENUM('open','active','closed') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_fy_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_fy_company_year (company_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-company/type voucher numbering series
CREATE TABLE IF NOT EXISTS numbering_series (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  voucher_type  VARCHAR(30) NOT NULL,
  prefix        VARCHAR(30) NOT NULL,
  next_no       INT NOT NULL DEFAULT 1,
  width         INT NOT NULL DEFAULT 4,
  CONSTRAINT fk_ns_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_ns_company_type (company_id, voucher_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vouchers (header) — status draft/posted; postings are append-only
CREATE TABLE IF NOT EXISTS vouchers (
  id           CHAR(36) PRIMARY KEY,
  company_id   CHAR(36) NOT NULL,
  branch_id    CHAR(36) NULL,
  type         VARCHAR(30) NOT NULL,
  voucher_no   VARCHAR(50) NOT NULL,
  date         DATE NOT NULL,
  narration    VARCHAR(500) NULL,
  status       ENUM('draft','posted') NOT NULL DEFAULT 'posted',
  created_by   CHAR(36) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_v_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_voucher_no (company_id, type, voucher_no),
  INDEX idx_voucher_company_date (company_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS voucher_lines (
  id           CHAR(36) PRIMARY KEY,
  company_id   CHAR(36) NOT NULL,
  voucher_id   CHAR(36) NOT NULL,
  ledger_id    CHAR(36) NOT NULL,
  dr_amount    DECIMAL(19,4) NOT NULL DEFAULT 0,
  cr_amount    DECIMAL(19,4) NOT NULL DEFAULT 0,
  narration    VARCHAR(500) NULL,
  CONSTRAINT fk_vl_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
  CONSTRAINT fk_vl_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  INDEX idx_vl_voucher (voucher_id),
  INDEX idx_vl_ledger (company_id, ledger_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the current FY + default numbering series for RAVI Metal Treatment
SET @co := '11111111-1111-1111-1111-111111111111';
INSERT IGNORE INTO financial_years (id, company_id, year, starts_on, ends_on, status)
VALUES (UUID(), @co, '2026-27', '2026-04-01', '2027-03-31', 'active');

INSERT IGNORE INTO numbering_series (id, company_id, voucher_type, prefix, next_no, width) VALUES
 (UUID(), @co, 'payment',     'PMT/26-27/', 1, 4),
 (UUID(), @co, 'receipt',     'RCP/26-27/', 1, 4),
 (UUID(), @co, 'contra',      'CTR/26-27/', 1, 4),
 (UUID(), @co, 'journal',     'JV/26-27/',  1, 4),
 (UUID(), @co, 'sales',       'SI/26-27/',  1, 4),
 (UUID(), @co, 'purchase',    'PB/26-27/',  1, 4),
 (UUID(), @co, 'credit_note', 'CN/26-27/',  1, 4),
 (UUID(), @co, 'debit_note',  'DN/26-27/',  1, 4);
