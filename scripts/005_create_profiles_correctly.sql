-- Script pour créer les profiles utilisateurs correctement
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Récupérer les IDs des établissements
DO $$
DECLARE
    stmarie_id uuid;
    vhugo_id uuid;
BEGIN
    -- Récupérer les IDs des établissements
    SELECT id INTO stmarie_id FROM establishments WHERE code = 'stm001';
    SELECT id INTO vhugo_id FROM establishments WHERE code = 'vh001';
    
    -- Si les établissements n'existent pas, les créer
    IF stmarie_id IS NULL THEN
        INSERT INTO establishments (code, name, password)
        VALUES ('stm001', 'ST-MARIE 14000', encode(digest('V30', 'sha256'), 'hex'))
        RETURNING id INTO stmarie_id;
    END IF;
    
    IF vhugo_id IS NULL THEN
        INSERT INTO establishments (code, name, password)
        VALUES ('vh001', 'VICTOR-HUGO 18760', encode(digest('V30', 'sha256'), 'hex'))
        RETURNING id INTO vhugo_id;
    END IF;
    
    -- 2. Créer les profiles (avec username, pas email)
    -- Vie Scolaire ST-MARIE
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (stmarie_id, 'vie-scolaire', 'vs.stmarie', encode(digest('VieScol2024!', 'sha256'), 'hex'), 
            'Vie Scolaire', 'ST-MARIE', 'vs.stmarie@test.local', true)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('VieScol2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- Professeur ST-MARIE
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (stmarie_id, 'professeur', 'prof.stmarie', encode(digest('Prof2024!', 'sha256'), 'hex'), 
            'Professeur', 'ST-MARIE', 'prof.stmarie@test.local', true)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('Prof2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- Délégué ST-MARIE
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (stmarie_id, 'delegue', 'del.stmarie', encode(digest('Delegue2024!', 'sha256'), 'hex'), 
            'Délégué', 'ST-MARIE', 'del.stmarie@test.local', false)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('Delegue2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- Vie Scolaire VICTOR-HUGO
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (vhugo_id, 'vie-scolaire', 'vs.vhugo', encode(digest('VieScol2024!', 'sha256'), 'hex'), 
            'Vie Scolaire', 'VICTOR-HUGO', 'vs.vhugo@test.local', true)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('VieScol2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- Professeur VICTOR-HUGO
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (vhugo_id, 'professeur', 'prof.vhugo', encode(digest('Prof2024!', 'sha256'), 'hex'), 
            'Professeur', 'VICTOR-HUGO', 'prof.vhugo@test.local', true)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('Prof2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- Délégué VICTOR-HUGO
    INSERT INTO profiles (establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms)
    VALUES (vhugo_id, 'delegue', 'del.vhugo', encode(digest('Delegue2024!', 'sha256'), 'hex'), 
            'Délégué', 'VICTOR-HUGO', 'del.vhugo@test.local', false)
    ON CONFLICT (username) DO UPDATE SET
        password_hash = encode(digest('Delegue2024!', 'sha256'), 'hex'),
        updated_at = NOW();
    
    -- 3. Créer ou mettre à jour les teachers avec leur profile_id
    INSERT INTO teachers (profile_id, establishment_id, first_name, last_name, email, subject)
    SELECT p.id, stmarie_id, 'Professeur', 'ST-MARIE', 'prof.stmarie@test.local', 'Mathématiques'
    FROM profiles p
    WHERE p.username = 'prof.stmarie'
    ON CONFLICT (profile_id) DO UPDATE SET
        email = 'prof.stmarie@test.local',
        subject = 'Mathématiques',
        updated_at = NOW();
    
    INSERT INTO teachers (profile_id, establishment_id, first_name, last_name, email, subject)
    SELECT p.id, vhugo_id, 'Professeur', 'VICTOR-HUGO', 'prof.vhugo@test.local', 'Français'
    FROM profiles p
    WHERE p.username = 'prof.vhugo'
    ON CONFLICT (profile_id) DO UPDATE SET
        email = 'prof.vhugo@test.local',
        subject = 'Français',
        updated_at = NOW();
    
END $$;

-- 4. Vérifier les résultats
SELECT 
    p.id,
    p.username,
    p.email,
    p.role,
    p.first_name,
    p.last_name,
    e.name as establishment,
    p.created_at
FROM profiles p
JOIN establishments e ON p.establishment_id = e.id
ORDER BY e.name, p.role;

-- 5. Vérifier les teachers
SELECT 
    t.id,
    t.first_name,
    t.last_name,
    t.email,
    t.subject,
    p.username as profile_username,
    e.name as establishment
FROM teachers t
JOIN profiles p ON t.profile_id = p.id
JOIN establishments e ON t.establishment_id = e.id;
