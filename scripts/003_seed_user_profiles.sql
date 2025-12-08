-- Script de création des profils utilisateurs de test
-- Utilise les tables existantes: establishments, profiles, teachers

-- =====================================================
-- ÉTABLISSEMENTS
-- =====================================================

-- ST-MARIE 14000
INSERT INTO establishments (code, name, password, created_at)
VALUES (
  'stm001',
  'ST-MARIE 14000',
  encode(sha256('stm001'::bytea), 'hex'),
  NOW()
) ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name;

-- VICTOR-HUGO 18760
INSERT INTO establishments (code, name, password, created_at)
VALUES (
  'vh001',
  'VICTOR-HUGO 18760',
  encode(sha256('vh001'::bytea), 'hex'),
  NOW()
) ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name;

-- =====================================================
-- PROFILS (PROFILES) - ST-MARIE
-- =====================================================

-- Vie Scolaire ST-MARIE
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'stm001'),
  'vie-scolaire',
  'vs.stmarie',
  encode(sha256('VieScol2024!'::bytea), 'hex'),
  'Vie',
  'Scolaire',
  'vs.stmarie@test.local',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Professeur ST-MARIE
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'stm001'),
  'professeur',
  'prof.stmarie',
  encode(sha256('Prof2024!'::bytea), 'hex'),
  'Professeur',
  'ST-MARIE',
  'prof.stmarie@test.local',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Délégué ST-MARIE
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'stm001'),
  'delegue',
  'del.stmarie',
  encode(sha256('Delegue2024!'::bytea), 'hex'),
  'Délégué',
  'ST-MARIE',
  'del.stmarie@test.local',
  false,
  false,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- =====================================================
-- PROFILS (PROFILES) - VICTOR-HUGO
-- =====================================================

-- Vie Scolaire VICTOR-HUGO
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'vh001'),
  'vie-scolaire',
  'vs.vhugo',
  encode(sha256('VieScol2024!'::bytea), 'hex'),
  'Vie',
  'Scolaire',
  'vs.vhugo@test.local',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Professeur VICTOR-HUGO
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'vh001'),
  'professeur',
  'prof.vhugo',
  encode(sha256('Prof2024!'::bytea), 'hex'),
  'Professeur',
  'VICTOR-HUGO',
  'prof.vhugo@test.local',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Délégué VICTOR-HUGO
INSERT INTO profiles (
  establishment_id, 
  role, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  email,
  can_create_subrooms,
  allow_delegate_subrooms,
  created_at, 
  updated_at
)
VALUES (
  (SELECT id FROM establishments WHERE code = 'vh001'),
  'delegue',
  'del.vhugo',
  encode(sha256('Delegue2024!'::bytea), 'hex'),
  'Délégué',
  'VICTOR-HUGO',
  'del.vhugo@test.local',
  false,
  false,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE 
SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- =====================================================
-- ENSEIGNANTS (TEACHERS) - Créer les entrées pour les professeurs
-- =====================================================

-- Professeur ST-MARIE
INSERT INTO teachers (
  profile_id,
  establishment_id,
  first_name,
  last_name,
  email,
  subject,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM profiles WHERE username = 'prof.stmarie'),
  (SELECT id FROM establishments WHERE code = 'stm001'),
  'Professeur',
  'ST-MARIE',
  'prof.stmarie@test.local',
  'Mathématiques',
  NOW(),
  NOW()
) ON CONFLICT (profile_id) DO UPDATE 
SET 
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- Professeur VICTOR-HUGO
INSERT INTO teachers (
  profile_id,
  establishment_id,
  first_name,
  last_name,
  email,
  subject,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM profiles WHERE username = 'prof.vhugo'),
  (SELECT id FROM establishments WHERE code = 'vh001'),
  'Professeur',
  'VICTOR-HUGO',
  'prof.vhugo@test.local',
  'Français',
  NOW(),
  NOW()
) ON CONFLICT (profile_id) DO UPDATE 
SET 
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher les établissements créés
SELECT code, name, created_at
FROM establishments 
WHERE code IN ('stm001', 'vh001')
ORDER BY code;

-- Afficher les profils créés
SELECT 
  p.username,
  p.role,
  p.first_name,
  p.last_name,
  p.email,
  e.name as establishment
FROM profiles p
JOIN establishments e ON p.establishment_id = e.id
WHERE p.username IN ('vs.stmarie', 'prof.stmarie', 'del.stmarie', 'vs.vhugo', 'prof.vhugo', 'del.vhugo')
ORDER BY e.code, p.role;

-- Afficher les enseignants créés
SELECT 
  t.first_name,
  t.last_name,
  t.email,
  t.subject,
  e.name as establishment
FROM teachers t
JOIN establishments e ON t.establishment_id = e.id
ORDER BY e.code;
