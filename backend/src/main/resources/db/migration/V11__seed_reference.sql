-- Reference/seed data: roles, permissions, paper catalog, system settings
-- (Dev users/shops are seeded by DevDataSeeder at startup with proper password hashes)

INSERT INTO roles (name, description) VALUES
    ('CUSTOMER',    'Prints documents via the platform'),
    ('SHOPKEEPER',  'Operates a print shop on the platform'),
    ('ADMIN',       'Manages shops, users and platform operations'),
    ('SUPER_ADMIN', 'Unrestricted administrative access');

INSERT INTO permissions (code, description) VALUES
    ('shop:manage_own',      'Manage own shop settings'),
    ('queue:manage',         'Manage shop queue and tokens'),
    ('printer:manage',       'Manage shop printers'),
    ('inventory:manage',     'Manage shop paper inventory'),
    ('pricing:manage_shop',  'Set shop pricing within platform boundaries'),
    ('discount:manage_shop', 'Create shop discounts'),
    ('qr:manage_shop',       'Manage shop QR codes'),
    ('earnings:view_own',    'View own shop earnings'),
    ('shop:create',          'Create new shops'),
    ('shop:manage_all',      'Manage all shops'),
    ('user:manage',          'Manage platform users'),
    ('order:view_all',       'View all orders'),
    ('payment:view_all',     'View all payments'),
    ('refund:approve',       'Approve/reject refunds'),
    ('token:manage_all',     'Manage all tokens'),
    ('complaint:manage',     'Handle complaints'),
    ('qr:manage_all',        'Manage all QR codes'),
    ('audit:view',           'View audit logs'),
    ('analytics:view',       'View platform analytics'),
    ('settings:manage',      'Manage system settings'),
    ('admin:manage',         'Create/manage admin accounts');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SHOPKEEPER'
  AND p.code IN ('shop:manage_own','queue:manage','printer:manage','inventory:manage',
                 'pricing:manage_shop','discount:manage_shop','qr:manage_shop','earnings:view_own');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SUPER_ADMIN';

INSERT INTO paper_types (name, size, gsm, category, status) VALUES
    ('Plain Paper',   'A4',     80,  'PLAIN',   'ACTIVE'),
    ('Bond Paper',    'A4',     100, 'BOND',    'ACTIVE'),
    ('Glossy Photo',  'A4',     150, 'GLOSSY',  'ACTIVE'),
    ('Plain Paper',   'A3',     80,  'PLAIN',   'ACTIVE'),
    ('Plain Paper',   'A5',     80,  'PLAIN',   'ACTIVE'),
    ('Plain Paper',   'LETTER', 80,  'PLAIN',   'ACTIVE'),
    ('Plain Paper',   'LEGAL',  80,  'PLAIN',   'ACTIVE');

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('tax.percent',                 '0',              'Tax percentage applied to orders'),
    ('cancellation.window_minutes', '5',              'Free self-service cancel window after payment'),
    ('cancellation.fee_percent',    '10',             'Cancellation fee percent after window'),
    ('pricing.min_a4_bw_per_page',  '1.00',           'Platform minimum price A4 B&W per page'),
    ('pricing.max_a4_bw_per_page',  '10.00',          'Platform maximum price A4 B&W per page'),
    ('high_paper_alert.threshold_sheets', '500',      'Alert keeper when upcoming orders exceed this'),
    ('low_stock.default_threshold', '100',            'Default low-stock threshold for inventory'),
    ('platform.currency',           '"INR"',          'Display currency');
