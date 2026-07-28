-- 014_app_data_tables — tables backing the remaining screens (masters, docs,
-- notifications, TCS, e-invoice/e-way registers, lien, compliance, TDS registers).
-- All start empty; rows accrue as the app is used against the live backend.

CREATE TABLE IF NOT EXISTS process_masters (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  code VARCHAR(30) NOT NULL, name VARCHAR(120) NOT NULL, sac VARCHAR(10) NULL,
  uom VARCHAR(20) NOT NULL DEFAULT 'Per kg', turnaround VARCHAR(40) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_co FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_pm (company_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_masters (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  process VARCHAR(120) NOT NULL, customer VARCHAR(200) NOT NULL,
  rate DECIMAL(19,4) NOT NULL DEFAULT 0, effective DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rm_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_rm_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL, type VARCHAR(20) NULL, category VARCHAR(60) NULL,
  linked_to VARCHAR(120) NULL, size VARCHAR(20) NULL, uploaded_by VARCHAR(120) NULL,
  date DATE NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_doc_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  kind ENUM('crit','warn','ok','info') NOT NULL DEFAULT 'info',
  cat ENUM('task','alert') NOT NULL DEFAULT 'alert',
  day VARCHAR(20) NULL, time VARCHAR(12) NULL,
  title VARCHAR(200) NOT NULL, body VARCHAR(500) NULL, chips JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ntf_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_ntf_co (company_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tcs_collections (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  party VARCHAR(200) NOT NULL, pan VARCHAR(10) NULL, section VARCHAR(20) NULL,
  sale DECIMAL(19,4) NOT NULL DEFAULT 0, rate DECIMAL(6,3) NOT NULL DEFAULT 0,
  tcs DECIMAL(19,4) NOT NULL DEFAULT 0, date DATE NULL, challan_no VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tcs_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_tcs_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eway_bills (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  ewb_no VARCHAR(20) NULL, invoice_no VARCHAR(50) NULL, party VARCHAR(200) NULL,
  from_place VARCHAR(80) NULL, to_place VARCHAR(80) NULL, distance INT NULL,
  value DECIMAL(19,4) NOT NULL DEFAULT 0, valid_till VARCHAR(20) NULL,
  status ENUM('active','pending','expired') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ewb_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_ewb_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS e_invoices (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  invoice_no VARCHAR(50) NULL, party VARCHAR(200) NULL, date DATE NULL,
  value DECIMAL(19,4) NOT NULL DEFAULT 0, irn VARCHAR(70) NULL, ack VARCHAR(30) NULL,
  status ENUM('generated','pending','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_einv_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_einv_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lien_cases (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  customer VARCHAR(200) NOT NULL, overdue DECIMAL(19,4) NOT NULL DEFAULT 0,
  ageing_days INT NOT NULL DEFAULT 0, material VARCHAR(120) NULL, qty VARCHAR(40) NULL,
  assessed DECIMAL(19,4) NOT NULL DEFAULT 0, expected_sale DECIMAL(19,4) NOT NULL DEFAULT 0,
  status ENUM('notice','held','recovered') NOT NULL DEFAULT 'notice',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lien_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_lien_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compliance_items (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  form VARCHAR(40) NOT NULL, period VARCHAR(20) NULL, due DATE NULL, days INT NULL,
  amount DECIMAL(19,4) NULL, kind ENUM('gst','tds','tcs','pf','roc') NOT NULL DEFAULT 'gst',
  status ENUM('due','filed','overdue') NOT NULL DEFAULT 'due',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cmp_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_cmp_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tds_challans (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  section VARCHAR(20) NOT NULL, description VARCHAR(120) NULL, deductees INT NOT NULL DEFAULT 0,
  amount DECIMAL(19,4) NOT NULL DEFAULT 0, challan_no VARCHAR(40) NULL, bsr VARCHAR(20) NULL,
  paid_on DATE NULL, due_on DATE NULL, status ENUM('paid','due') NOT NULL DEFAULT 'due',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tdsc_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_tdsc_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tds_deductees (
  id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL,
  form VARCHAR(10) NULL, quarter VARCHAR(10) NULL, name VARCHAR(200) NOT NULL, pan VARCHAR(10) NULL,
  section VARCHAR(20) NULL, paid DECIMAL(19,4) NOT NULL DEFAULT 0, rate DECIMAL(6,3) NOT NULL DEFAULT 0,
  tds DECIMAL(19,4) NOT NULL DEFAULT 0, date DATE NULL, challan VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tdsd_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_tdsd_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
