-- 001_init — Phase 0 foundation: identity, access, and audit.
-- Money uses DECIMAL(19,4); timestamps stored UTC; InnoDB + utf8mb4.

CREATE TABLE IF NOT EXISTS companies (
  id            CHAR(36) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  legal_name    VARCHAR(200) NOT NULL,
  pan           VARCHAR(10) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branches (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  gstin         VARCHAR(15) NULL,
  state_code    VARCHAR(2) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_branch_company FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_branch_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- secret signing PIN (per-user step-up), hashed, never plaintext (PRD §5.15)
  signing_pin_hash VARCHAR(255) NULL,
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  mfa_enabled   TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id            CHAR(36) PRIMARY KEY,
  company_id    CHAR(36) NOT NULL,
  `key`         VARCHAR(50) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  is_system     TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_role_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uq_role_company_key (company_id, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
  id            CHAR(36) PRIMARY KEY,
  `key`         VARCHAR(100) NOT NULL UNIQUE,  -- e.g. voucher:create
  description   VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_company_roles (
  user_id       CHAR(36) NOT NULL,
  company_id    CHAR(36) NOT NULL,
  branch_id     CHAR(36) NULL,
  role_id       CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, company_id, role_id, branch_id),
  CONSTRAINT fk_ucr_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ucr_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_ucr_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_ucr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id            CHAR(36) PRIMARY KEY,
  user_id       CHAR(36) NOT NULL,
  refresh_hash  VARCHAR(255) NOT NULL,
  device        VARCHAR(255) NULL,
  ip            VARCHAR(64) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  revoked_at    DATETIME NULL,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tamper-evident, append-only audit log (hash-chained per company) — PRD §7.5
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id    CHAR(36) NOT NULL,
  branch_id     CHAR(36) NULL,
  actor_user_id CHAR(36) NULL,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(100) NULL,
  entity_id     VARCHAR(64) NULL,
  before_json   JSON NULL,
  after_json    JSON NULL,
  ip            VARCHAR(64) NULL,
  user_agent    VARCHAR(255) NULL,
  request_id    VARCHAR(64) NULL,
  prev_hash     CHAR(64) NULL,
  hash          CHAR(64) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_company (company_id, id),
  INDEX idx_audit_entity (company_id, entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
