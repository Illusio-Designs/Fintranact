-- 003_ledgers_import — minimal ledgers + opening balances (needed as an import
-- target for legacy data) and import staging/audit tables (PRD §5.19).

CREATE TABLE IF NOT EXISTS ledgers (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  category      VARCHAR(30) NOT NULL,
  pan           VARCHAR(10) NULL,
  gstin         VARCHAR(15) NULL,
  state         VARCHAR(50) NULL,
  blacklisted   TINYINT(1) NOT NULL DEFAULT 0,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  CONSTRAINT fk_ledger_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_ledger_company_name (company_id, name),
  INDEX idx_ledger_company_cat (company_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ledger_opening_balances (
  id             CHAR(36) PRIMARY KEY,
  company_id     CHAR(36) NOT NULL,
  ledger_id      CHAR(36) NOT NULL,
  financial_year VARCHAR(7) NOT NULL,           -- e.g. 2025-26
  dr             DECIMAL(19,4) NOT NULL DEFAULT 0,
  cr             DECIMAL(19,4) NOT NULL DEFAULT 0,
  as_on          DATE NULL,
  CONSTRAINT fk_ob_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
  UNIQUE KEY uq_ob_ledger_fy (ledger_id, financial_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Import batch (one uploaded file) + per-row outcome, for traceable migration.
CREATE TABLE IF NOT EXISTS import_batches (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  entity        VARCHAR(50) NOT NULL,           -- e.g. 'ledgers'
  filename      VARCHAR(255) NULL,
  total_rows    INT NOT NULL DEFAULT 0,
  valid_rows    INT NOT NULL DEFAULT 0,
  committed     TINYINT(1) NOT NULL DEFAULT 0,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ib_company FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_ib_company (company_id, entity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS import_rows (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_id      CHAR(36) NOT NULL,
  row_no        INT NOT NULL,
  status        ENUM('valid','error','committed') NOT NULL,
  error_json    JSON NULL,
  entity_id     CHAR(36) NULL,
  CONSTRAINT fk_ir_batch FOREIGN KEY (batch_id) REFERENCES import_batches(id),
  INDEX idx_ir_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permission for the import feature; grant to admin(*) implicitly + accountant.
SET @co := '11111111-1111-1111-1111-111111111111';
INSERT IGNORE INTO permissions (id, `key`, description)
VALUES (UUID(), 'data:import', 'Import legacy data from Excel');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` IN ('accountant','controller') AND p.`key` = 'data:import';
