-- 013_series_settings — extra internal document series + a settings:manage permission.
-- Note: e-invoice IRN and e-way-bill EWB numbers are ISSUED BY THE GOVT PORTAL (IRP / NIC).
-- These series are only our INTERNAL document references; the fetched IRN/EWB is stored
-- separately against the invoice.

SET @co := '11111111-1111-1111-1111-111111111111';

INSERT IGNORE INTO numbering_series (id, company_id, voucher_type, prefix, next_no, width) VALUES
 (UUID(), @co, 'eway',            'EWB/26-27/',    1, 4),
 (UUID(), @co, 'einvoice',        'EINV/26-27/',   1, 4),
 (UUID(), @co, 'jobwork_inward',  'JW-IN/26-27/',  1, 4),
 (UUID(), @co, 'jobwork_outward', 'JW-OUT/26-27/', 1, 4),
 (UUID(), @co, 'lien',            'LIEN/26-27/',   1, 4),
 (UUID(), @co, 'payroll',         'PAY/26-27/',    1, 4);

-- Permission for editing company settings (numbering series, statutory config).
INSERT IGNORE INTO permissions (id, `key`, description)
VALUES (UUID(), 'settings:manage', 'Edit numbering series & company settings');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'controller' AND p.`key` = 'settings:manage';
