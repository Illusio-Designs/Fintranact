-- 004_items_employees — import targets for item/material master and employees.

CREATE TABLE IF NOT EXISTS items (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  kind          VARCHAR(30) NOT NULL DEFAULT 'consumable', -- consumable | customer-material | finished
  uom           VARCHAR(20) NOT NULL DEFAULT 'kg',
  hsn           VARCHAR(10) NULL,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  CONSTRAINT fk_item_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_item_company_name (company_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS item_opening_stock (
  id             CHAR(36) PRIMARY KEY,
  company_id     CHAR(36) NOT NULL,
  item_id        CHAR(36) NOT NULL,
  financial_year VARCHAR(7) NOT NULL,
  qty            DECIMAL(19,4) NOT NULL DEFAULT 0,
  rate           DECIMAL(19,4) NOT NULL DEFAULT 0,
  as_on          DATE NULL,
  CONSTRAINT fk_ios_item FOREIGN KEY (item_id) REFERENCES items(id),
  UNIQUE KEY uq_ios_item_fy (item_id, financial_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  emp_code      VARCHAR(50) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NULL,
  -- PAN is sensitive: field-level encryption applied at the app layer (PRD §7.4).
  pan_enc       VARBINARY(255) NULL,
  designation   VARCHAR(120) NULL,
  date_of_joining DATE NULL,
  basic_salary  DECIMAL(19,4) NOT NULL DEFAULT 0,
  created_by    CHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  CONSTRAINT fk_emp_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_emp_company_code (company_id, emp_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
