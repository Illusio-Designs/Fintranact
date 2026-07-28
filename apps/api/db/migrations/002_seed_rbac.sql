-- 002_seed_rbac — seed RAVI Metal Treatment company, default roles & permissions.
-- Idempotent-ish: uses fixed IDs + INSERT IGNORE so re-runs don't duplicate.

SET @co := '11111111-1111-1111-1111-111111111111';
SET @br := '22222222-2222-2222-2222-222222222222';

INSERT IGNORE INTO companies (id, name, legal_name, pan)
VALUES (@co, 'RAVI Metal Treatment', 'RAVI Metal Treatment', 'AABCS1429P');

INSERT IGNORE INTO branches (id, company_id, name, gstin, state_code)
VALUES (@br, @co, 'Aji Deam Unit 3, Rajkot', '24AABCS1429P1Z5', '24');

-- Default roles (PRD §7.2.1)
INSERT IGNORE INTO roles (id, company_id, `key`, name, is_system) VALUES
 ('a0000000-0000-0000-0000-000000000001', @co, 'admin',      'Tenant Admin / Owner', 1),
 ('a0000000-0000-0000-0000-000000000002', @co, 'controller', 'Finance Controller',   1),
 ('a0000000-0000-0000-0000-000000000003', @co, 'accountant', 'Accountant',           1),
 ('a0000000-0000-0000-0000-000000000004', @co, 'operator',   'Data-Entry Operator',  1),
 ('a0000000-0000-0000-0000-000000000005', @co, 'supervisor', 'Process Supervisor',   1),
 ('a0000000-0000-0000-0000-000000000006', @co, 'payroll',    'Payroll / HR Manager', 1),
 ('a0000000-0000-0000-0000-000000000007', @co, 'compliance', 'Compliance Officer',   1),
 ('a0000000-0000-0000-0000-000000000008', @co, 'auditor',    'Auditor (read-only)',  1),
 ('a0000000-0000-0000-0000-000000000009', @co, 'employee',   'Employee',             1);

-- Core permission catalog (grows per phase)
INSERT IGNORE INTO permissions (id, `key`, description) VALUES
 (UUID(), '*',                 'Superuser wildcard'),
 (UUID(), 'voucher:create',    'Create/post vouchers'),
 (UUID(), 'voucher:approve',   'Approve vouchers'),
 (UUID(), 'ledger:manage',     'Create/edit ledgers & masters'),
 (UUID(), 'payment:approve',   'Approve payments'),
 (UUID(), 'jobwork:manage',    'Inward/outward job work'),
 (UUID(), 'payroll:run',       'Run payroll'),
 (UUID(), 'gst_return:lock',   'Lock GST/return working'),
 (UUID(), 'report:view',       'View reports & dashboards'),
 (UUID(), 'report:export',     'Export reports'),
 (UUID(), 'audit:read',        'Read audit trail'),
 (UUID(), 'user:manage',       'Manage users & roles');

-- Admin → wildcard
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'admin' AND p.`key` = '*';

-- Controller → approvals + view/export + audit
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'controller'
  AND p.`key` IN ('voucher:approve','payment:approve','gst_return:lock','report:view','report:export','audit:read');

-- Accountant → voucher/ledger/jobwork + view
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'accountant'
  AND p.`key` IN ('voucher:create','ledger:manage','jobwork:manage','report:view');

-- Operator → voucher create
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'operator' AND p.`key` IN ('voucher:create');

-- Supervisor → jobwork
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'supervisor' AND p.`key` IN ('jobwork:manage','report:view');

-- Payroll → payroll run + view
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'payroll' AND p.`key` IN ('payroll:run','report:view');

-- Compliance → return lock + view/export
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'compliance' AND p.`key` IN ('gst_return:lock','report:view','report:export');

-- Auditor → read-only reports + audit
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.company_id = @co AND r.`key` = 'auditor' AND p.`key` IN ('report:view','audit:read');
