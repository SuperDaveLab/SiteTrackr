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
