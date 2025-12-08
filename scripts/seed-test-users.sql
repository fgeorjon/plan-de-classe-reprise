-- Script de création des utilisateurs de test
-- Établissements: ST-MARIE 14000 (stm001) et VICTOR-HUGO 18760 (vh001)

-- Nettoyer les données existantes (optionnel)
-- DELETE FROM accounts WHERE email IN ('vs.stmarie@test.local', 'prof.stmarie@test.local', 'del.stmarie@test.local', 'vs.vhugo@test.local', 'prof.vhugo@test.local', 'del.vhugo@test.local');
-- DELETE FROM establishments WHERE code IN ('stm001', 'vh001');

-- =====================================================
-- ÉTABLISSEMENTS
-- =====================================================

-- ST-MARIE 14000
INSERT INTO establishments (code, name, password, created_at)
VALUES (
  'stm001',
  'ST-MARIE 14000',
  encode(sha256('stm001'::bytea), 'hex'), -- Hash du mot de passe
  NOW()
) ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name;

-- VICTOR-HUGO 18760
INSERT INTO establishments (code, name, password, created_at)
VALUES (
  'vh001',
  'VICTOR-HUGO 18760',
  encode(sha256('vh001'::bytea), 'hex'), -- Hash du mot de passe
  NOW()
) ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name;

-- =====================================================
-- COMPTES (ACCOUNTS)
-- =====================================================

-- Compte Vie Scolaire ST-MARIE
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Vie Scolaire ST-MARIE',
  'vs.stmarie@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- Compte Professeur ST-MARIE
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Professeur ST-MARIE',
  'prof.stmarie@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- Compte Délégué ST-MARIE
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Délégué ST-MARIE',
  'del.stmarie@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- Compte Vie Scolaire VICTOR-HUGO
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Vie Scolaire VICTOR-HUGO',
  'vs.vhugo@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- Compte Professeur VICTOR-HUGO
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Professeur VICTOR-HUGO',
  'prof.vhugo@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- Compte Délégué VICTOR-HUGO
INSERT INTO accounts (name, email, created_at, updated_at)
VALUES (
  'Délégué VICTOR-HUGO',
  'del.vhugo@test.local',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, updated_at = NOW();

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher les établissements créés
SELECT code, name, created_at
FROM establishments 
WHERE code IN ('stm001', 'vh001')
ORDER BY code;

-- Afficher les comptes créés
SELECT name, email, created_at
FROM accounts 
WHERE email LIKE '%@test.local'
ORDER BY email;
