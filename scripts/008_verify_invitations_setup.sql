-- Script de vérification du système d'invitations
-- Exécutez ce script pour vérifier que tout est correctement configuré

-- Vérifier que la table room_invitations existe
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'room_invitations'
ORDER BY ordinal_position;

-- Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'room_invitations';

-- Vérifier que RLS est activé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'room_invitations';
