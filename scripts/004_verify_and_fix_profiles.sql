-- Script de vérification et correction des profiles manquants
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier les profiles existants
SELECT 
    p.id,
    p.email,
    p.role,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- 2. Si les profiles n'existent pas, les créer
-- NOTE: Remplacez les UUID par ceux réellement créés dans votre table teachers

INSERT INTO profiles (id, email, role, password_hash, created_at)
VALUES 
    -- Vie Scolaire ST-MARIE
    (gen_random_uuid(), 'vs.stmarie@test.local', 'vie-scolaire', 
     encode(digest('VieScol2024!', 'sha256'), 'hex'), NOW()),
    
    -- Professeur ST-MARIE (lié à la table teachers)
    ((SELECT id FROM teachers WHERE email = 'prof.stmarie@test.local'), 
     'prof.stmarie@test.local', 'teacher', 
     encode(digest('Prof2024!', 'sha256'), 'hex'), NOW()),
    
    -- Délégué ST-MARIE
    (gen_random_uuid(), 'del.stmarie@test.local', 'delegate', 
     encode(digest('Delegue2024!', 'sha256'), 'hex'), NOW()),
    
    -- Vie Scolaire VICTOR-HUGO
    (gen_random_uuid(), 'vs.vhugo@test.local', 'vie-scolaire', 
     encode(digest('VieScol2024!', 'sha256'), 'hex'), NOW()),
    
    -- Professeur VICTOR-HUGO (lié à la table teachers)
    ((SELECT id FROM teachers WHERE email = 'prof.vhugo@test.local'), 
     'prof.vhugo@test.local', 'teacher', 
     encode(digest('Prof2024!', 'sha256'), 'hex'), NOW()),
    
    -- Délégué VICTOR-HUGO
    (gen_random_uuid(), 'del.vhugo@test.local', 'delegate', 
     encode(digest('Delegue2024!', 'sha256'), 'hex'), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Vérifier les profiles après insertion
SELECT 
    p.id,
    p.email,
    p.role,
    p.password_hash IS NOT NULL as has_password,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- 4. Vérifier que les teachers ont bien leur profile_id
SELECT 
    t.id,
    t.first_name,
    t.last_name,
    t.email,
    t.profile_id,
    p.email as profile_email,
    p.role as profile_role
FROM teachers t
LEFT JOIN profiles p ON t.profile_id = p.id
WHERE t.email IN ('prof.stmarie@test.local', 'prof.vhugo@test.local');
