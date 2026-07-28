-- 015_integrations — extra columns for e-invoice/e-way results + a WhatsApp message log.

ALTER TABLE e_invoices
  ADD COLUMN voucher_id CHAR(36) NULL AFTER company_id,
  ADD COLUMN signed_qr  MEDIUMTEXT NULL AFTER irn,
  ADD COLUMN ack_date   DATETIME NULL AFTER ack,
  ADD COLUMN error      VARCHAR(300) NULL AFTER status;

ALTER TABLE eway_bills
  ADD COLUMN voucher_id     CHAR(36) NULL AFTER company_id,
  ADD COLUMN vehicle_no     VARCHAR(20) NULL AFTER to_place,
  ADD COLUMN transport_mode VARCHAR(20) NULL AFTER vehicle_no,
  ADD COLUMN error          VARCHAR(300) NULL AFTER status;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             CHAR(36) PRIMARY KEY,
  company_id     CHAR(36) NOT NULL,
  to_phone       VARCHAR(20) NOT NULL,
  to_name        VARCHAR(200) NULL,
  kind           VARCHAR(30) NOT NULL DEFAULT 'text',   -- text | invoice | reminder | document
  body           VARCHAR(1000) NULL,
  doc_url        VARCHAR(500) NULL,
  provider       VARCHAR(20) NOT NULL DEFAULT 'sandbox',
  provider_msg_id VARCHAR(80) NULL,
  status         ENUM('queued','sent','delivered','read','failed') NOT NULL DEFAULT 'queued',
  error          VARCHAR(300) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wam_co FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_wam_co (company_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
