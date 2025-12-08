-- Test l'authentification complète pour tous les utilisateurs
-- Exécutez ce script pour vérifier que chaque utilisateur peut être authentifié

-- Test 1: Vie Scolaire ST-MARIE
SELECT 
  'vs.stmarie / VieScol2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('VieScol2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'vs.stmarie';

-- Test 2: Professeur ST-MARIE
SELECT 
  'prof.stmarie / Prof2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('Prof2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'prof.stmarie';

-- Test 3: Délégué ST-MARIE
SELECT 
  'del.stmarie / Delegue2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('Delegue2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'del.stmarie';

-- Test 4: Vie Scolaire VICTOR-HUGO
SELECT 
  'vs.vhugo / VieScol2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('VieScol2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'vs.vhugo';

-- Test 5: Professeur VICTOR-HUGO
SELECT 
  'prof.vhugo / Prof2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('Prof2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'prof.vhugo';

-- Test 6: Délégué VICTOR-HUGO
SELECT 
  'del.vhugo / Delegue2024!' as test_user,
  p.username,
  p.role,
  e.name as establishment,
  verify_password('Delegue2024!', p.password_hash) as can_login
FROM profiles p
LEFT JOIN establishments e ON p.establishment_id = e.id
WHERE p.username = 'del.vhugo';
