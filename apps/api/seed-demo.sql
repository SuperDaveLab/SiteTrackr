-- Insert demo company if not exists
INSERT INTO "Company" (id, name, slug, "createdAt", "updatedAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Demo Telecom',
  'demo-telecom',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert global counter if not exists
INSERT INTO "GlobalCounter" (id, "ticketNext", "updatedAt")
VALUES (
  'global',
  1,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo user if not exists
INSERT INTO "User" (id, "companyId", email, "passwordHash", role, "displayName", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'demo@site-trackr.local',
  'dummy-hash',
  'ADMIN',
  'Demo Admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Insert demo ticket template if not exists
INSERT INTO "TicketTemplate" (id, "companyId", name, code, description, "createdAt", "updatedAt")
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Standard Site Visit',
  'STD-VISIT',
  'Baseline checklist for routine maintenance visits.',
  NOW(),
  NOW()
)
ON CONFLICT ("companyId", code) DO NOTHING;

-- Insert template fields for the demo template if not exists
INSERT INTO "TicketTemplateField" (id, "templateId", "key", label, type, required, "orderIndex", config, section, "sectionOrder", "createdAt", "updatedAt")
VALUES
  (
    '22222222-2222-2222-2222-222222222223',
    '22222222-2222-2222-2222-222222222222',
    'visit_summary',
    'Visit Summary',
    'TEXTAREA',
    false,
    0,
    '{"placeholder":"Summarize the work performed"}'::jsonb,
    'General',
    0,
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    '22222222-2222-2222-2222-222222222222',
    'priority_level',
    'Priority Level',
    'SELECT',
    false,
    1,
    '{"options":["Low","Normal","High"]}'::jsonb,
    'General',
    0,
    NOW(),
    NOW()
  )
ON CONFLICT ("templateId", "key") DO NOTHING;

-- Insert demo site owner if not exists
INSERT INTO "SiteOwner" (id, "companyId", name, code, notes, "createdAt", "updatedAt")
VALUES (
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111111',
  'Front Range Partners',
  'FRP',
  'Primary regional owner contact for demo records.',
  NOW(),
  NOW()
)
ON CONFLICT ("companyId", code) DO NOTHING;

-- Insert demo site if not exists
INSERT INTO "Site" (id, "companyId", "siteOwnerId", name, code, "addressLine1", city, state, "postalCode", latitude, longitude, notes, "customFields", "createdAt", "updatedAt")
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333332',
  'Demo Broadcast Tower',
  'DBT-001',
  '123 Skyline Dr',
  'Denver',
  'CO',
  '80202',
  39.7486,
  -104.9965,
  'Primary training site for demo data.',
  '{"accessInstructions":"Badge in at guard shack","elevation":"5400ft"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
