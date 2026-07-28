-- 016_leave_bank — employee leave applications, company bank accounts (for voucher
-- printing) and a couple of company-level print/automation settings.

CREATE TABLE IF NOT EXISTS leave_requests (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  employee_id   CHAR(36) NULL,
  employee_name VARCHAR(200) NOT NULL,
  type          ENUM('casual','sick','earned','unpaid') NOT NULL DEFAULT 'casual',
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  days          DECIMAL(5,1) NOT NULL DEFAULT 1,
  reason        VARCHAR(500) NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approver      VARCHAR(200) NULL,
  decided_at    DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_leave_co (company_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id           CHAR(36) PRIMARY KEY,
  company_id   CHAR(36) NOT NULL,
  ledger_id    CHAR(36) NULL,                 -- optional link to the Bank Accounts ledger
  bank_name    VARCHAR(120) NOT NULL,
  account_no   VARCHAR(30) NOT NULL,
  ifsc         VARCHAR(15) NULL,
  branch       VARCHAR(120) NULL,
  upi          VARCHAR(80) NULL,
  print_default TINYINT(1) NOT NULL DEFAULT 0, -- printed on vouchers/invoices
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bank_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_bank_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Company print / automation settings.
ALTER TABLE companies
  ADD COLUMN auto_einvoice_service TINYINT(1) NOT NULL DEFAULT 0 AFTER gst_reg_type; -- auto-IRN on service invoices
