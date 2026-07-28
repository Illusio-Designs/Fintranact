-- 011_company_statutory — statutory registration details live on the COMPANY.
-- RAVI Metal Treatment runs all branches from one city (Rajkot, Gujarat) under a
-- single GST registration, so GSTIN/PAN/TAN etc. are company-level, not per-branch.

ALTER TABLE companies
  ADD COLUMN gstin        VARCHAR(15) NULL AFTER pan,
  ADD COLUMN tan          VARCHAR(10) NULL AFTER gstin,
  ADD COLUMN cin          VARCHAR(21) NULL AFTER tan,
  ADD COLUMN gst_reg_type ENUM('regular','composition','unregistered') NOT NULL DEFAULT 'regular' AFTER cin,
  ADD COLUMN pt_regn      VARCHAR(30) NULL AFTER gst_reg_type,   -- Professional Tax
  ADD COLUMN pf_regn      VARCHAR(30) NULL AFTER pt_regn,        -- EPF
  ADD COLUMN esi_regn     VARCHAR(30) NULL AFTER pf_regn,        -- ESIC
  ADD COLUMN address      VARCHAR(400) NULL AFTER esi_regn,
  ADD COLUMN city         VARCHAR(80)  NULL AFTER address,
  ADD COLUMN state_code   VARCHAR(2)   NULL AFTER city,
  ADD COLUMN pincode      VARCHAR(6)   NULL AFTER state_code;

SET @co := '11111111-1111-1111-1111-111111111111';

UPDATE companies SET
  gstin        = '24AABCS1429P1Z5',
  pan          = 'AABCS1429P',
  tan          = 'RKTR02914E',
  gst_reg_type = 'regular',
  pt_regn      = 'PT/24/RAJ/0009142',
  pf_regn      = 'GJRAJ0456789000',
  esi_regn     = '37000123450000901',
  address      = 'Aji Deam Unit 3, GIDC, Rajkot',
  city         = 'Rajkot',
  state_code   = '24',
  pincode      = '360003'
WHERE id = @co;
