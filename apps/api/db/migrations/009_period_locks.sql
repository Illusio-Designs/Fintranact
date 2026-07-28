-- 009_period_locks — close an accounting month so no voucher can be posted/edited in it.

CREATE TABLE IF NOT EXISTS period_locks (
  id          CHAR(36) PRIMARY KEY,
  company_id  CHAR(36) NOT NULL,
  period      CHAR(7) NOT NULL,        -- YYYY-MM
  note        VARCHAR(200) NULL,
  locked_by   CHAR(36) NULL,
  locked_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plock_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_plock (company_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
