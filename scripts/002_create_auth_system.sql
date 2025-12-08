-- Create authentication tables needed by the application code
-- This script adds the profiles, teachers, and students tables
-- that the authentication system expects

-- Table pour les profils génériques (vie scolaire, admin, etc.)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('vie-scolaire', 'admin')),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les professeurs
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  subject VARCHAR(255),
  allow_delegate_subrooms BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les élèves/délégués
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  class_id UUID,
  username VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  is_delegate BOOLEAN DEFAULT FALSE,
  is_eco_delegate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction pour hasher les mots de passe avec SHA256
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour vérifier un mot de passe
CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash_password(password) = password_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_establishment ON profiles(establishment_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_establishment ON teachers(establishment_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_students_establishment ON students(establishment_id);

-- Insérer les utilisateurs de test
INSERT INTO profiles (establishment_id, username, password_hash, role, first_name, last_name, email)
SELECT 
  e.id,
  'vs.stmarie',
  hash_password('VieScol2024!'),
  'vie-scolaire',
  'Vie Scolaire',
  'ST-MARIE',
  'vs.stmarie@test.local'
FROM establishments e
WHERE e.code = 'stm001'
ON CONFLICT (username) DO NOTHING;

INSERT INTO profiles (establishment_id, username, password_hash, role, first_name, last_name, email)
SELECT 
  e.id,
  'vs.vhugo',
  hash_password('VieScol2024!'),
  'vie-scolaire',
  'Vie Scolaire',
  'VICTOR-HUGO',
  'vs.vhugo@test.local'
FROM establishments e
WHERE e.code = 'vh001'
ON CONFLICT (username) DO NOTHING;

INSERT INTO teachers (establishment_id, username, password_hash, first_name, last_name, email)
SELECT 
  e.id,
  'prof.stmarie',
  hash_password('Prof2024!'),
  'Professeur',
  'ST-MARIE',
  'prof.stmarie@test.local'
FROM establishments e
WHERE e.code = 'stm001'
ON CONFLICT (username) DO NOTHING;

INSERT INTO teachers (establishment_id, username, password_hash, first_name, last_name, email)
SELECT 
  e.id,
  'prof.vhugo',
  hash_password('Prof2024!'),
  'Professeur',
  'VICTOR-HUGO',
  'prof.vhugo@test.local'
FROM establishments e
WHERE e.code = 'vh001'
ON CONFLICT (username) DO NOTHING;

INSERT INTO students (establishment_id, username, password_hash, first_name, last_name, email, is_delegate)
SELECT 
  e.id,
  'del.stmarie',
  hash_password('Delegue2024!'),
  'Délégué',
  'ST-MARIE',
  'del.stmarie@test.local',
  TRUE
FROM establishments e
WHERE e.code = 'stm001'
ON CONFLICT (username) DO NOTHING;

INSERT INTO students (establishment_id, username, password_hash, first_name, last_name, email, is_delegate)
SELECT 
  e.id,
  'del.vhugo',
  hash_password('Delegue2024!'),
  'Délégué',
  'VICTOR-HUGO',
  'del.vhugo@test.local',
  TRUE
FROM establishments e
WHERE e.code = 'vh001'
ON CONFLICT (username) DO NOTHING;
