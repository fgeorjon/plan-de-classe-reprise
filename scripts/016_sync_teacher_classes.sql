-- Script pour synchroniser la table teacher_classes
-- Crée automatiquement les relations entre professeurs et leurs classes

-- Removed updated_at column as it doesn't exist in teacher_classes table
-- Remplir teacher_classes depuis les données des professeurs
INSERT INTO teacher_classes (teacher_id, class_id, created_at)
SELECT DISTINCT 
  t.id as teacher_id,
  c.id as class_id,
  NOW() as created_at
FROM teachers t
CROSS JOIN classes c
WHERE 
  -- Associer les professeurs aux classes du même établissement
  t.establishment_id = c.establishment_id
  -- Éviter les doublons
  AND NOT EXISTS (
    SELECT 1 FROM teacher_classes tc 
    WHERE tc.teacher_id = t.id AND tc.class_id = c.id
  );

-- Afficher le résultat
SELECT 
  COUNT(*) as "Nombre de relations créées"
FROM teacher_classes;

-- Afficher quelques exemples
SELECT 
  t.first_name || ' ' || t.last_name as "Professeur",
  t.subject as "Matière",
  c.name as "Classe",
  e.name as "Établissement"
FROM teacher_classes tc
JOIN teachers t ON tc.teacher_id = t.id
JOIN classes c ON tc.class_id = c.id
LEFT JOIN establishments e ON c.establishment_id = e.id
LIMIT 10;
