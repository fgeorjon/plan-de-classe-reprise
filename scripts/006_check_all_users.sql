-- Vérification complète de tous les utilisateurs créés
-- Exécutez ce script pour voir l'état de tous les comptes

-- 1. Vérifier tous les profiles
SELECT 
  username,
  role,
  email,
  establishment_id,
  CASE 
    WHEN password_hash IS NOT NULL THEN '✓ Password set'
    ELSE '✗ No password'
  END as password_status,
  created_at
FROM profiles
WHERE username IN (
  'vs.stmarie', 'prof.stmarie', 'del.stmarie',
  'vs.vhugo', 'prof.vhugo', 'del.vhugo'
)
ORDER BY establishment_id, role;

-- 2. Vérifier les teachers avec leurs profiles
SELECT 
  t.first_name,
  t.last_name,
  t.email as teacher_email,
  p.username as profile_username,
  p.role as profile_role,
  e.name as establishment
FROM teachers t
LEFT JOIN profiles p ON t.profile_id = p.id
LEFT JOIN establishments e ON t.establishment_id = e.id
WHERE t.email LIKE '%@test.local'
ORDER BY e.name;

-- 3. Vérifier les students (délégués)
SELECT 
  s.first_name,
  s.last_name,
  s.email as student_email,
  p.username as profile_username,
  p.role as profile_role,
  c.name as class_name,
  e.name as establishment
FROM students s
LEFT JOIN profiles p ON s.profile_id = p.id
LEFT JOIN classes c ON s.class_id = c.id
-- Fixed: use p.establishment_id instead of c.establishment_id
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE s.email LIKE '%@test.local'
ORDER BY e.name;

-- 4. Test du hash SHA256 pour vérifier le format
SELECT 
  username,
  role,
  LENGTH(password_hash) as hash_length,
  CASE 
    WHEN LENGTH(password_hash) = 64 THEN '✓ Correct (SHA256)'
    ELSE '✗ Incorrect length'
  END as hash_format
FROM profiles
WHERE username IN (
  'vs.stmarie', 'prof.stmarie', 'del.stmarie',
  'vs.vhugo', 'prof.vhugo', 'del.vhugo'
);
