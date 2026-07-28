-- 008_jobwork — job-work (heat-treatment) inward & outward challans (Rule 45 movement).

CREATE TABLE IF NOT EXISTS job_work_inward (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  challan_no    VARCHAR(50) NOT NULL,
  customer_ledger_id CHAR(36) NULL,
  customer_name VARCHAR(200) NOT NULL,
  process       VARCHAR(80) NOT NULL,
  material      VARCHAR(120) NULL,
  qty_recd      DECIMAL(19,3) NOT NULL,
  uom           VARCHAR(10) NOT NULL DEFAULT 'kg',
  rate          DECIMAL(19,4) NOT NULL DEFAULT 0,
  gst_rate      DECIMAL(5,2) NOT NULL DEFAULT 18,
  memo_type     ENUM('debit','cash') NOT NULL DEFAULT 'debit',
  date          DATE NOT NULL,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jwi_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_jwi_no (company_id, challan_no),
  INDEX idx_jwi_company_date (company_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_work_outward (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  inward_id     CHAR(36) NOT NULL,
  challan_no    VARCHAR(50) NOT NULL,
  qty_out       DECIMAL(19,3) NOT NULL,
  loss          DECIMAL(19,3) NOT NULL DEFAULT 0,
  date          DATE NOT NULL,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jwo_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_jwo_inward FOREIGN KEY (inward_id) REFERENCES job_work_inward(id),
  UNIQUE KEY uq_jwo_no (company_id, challan_no),
  INDEX idx_jwo_inward (inward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
