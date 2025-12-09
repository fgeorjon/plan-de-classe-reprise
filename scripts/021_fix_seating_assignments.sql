-- Diagnostic et correction de la table seating_assignments
-- Vérifie la structure actuelle et ajoute les colonnes manquantes si nécessaire

-- Afficher la structure actuelle
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'seating_assignments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN
    -- Vérifier et ajouter les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'seating_assignments' AND column_name = 'id') THEN
        ALTER TABLE seating_assignments ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'seating_assignments' AND column_name = 'created_at') THEN
        ALTER TABLE seating_assignments ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'seating_assignments' AND column_name = 'updated_at') THEN
        ALTER TABLE seating_assignments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Afficher le résultat final
SELECT 'Seating assignments table fixed!' as status,
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'seating_assignments' AND table_schema = 'public') as total_columns;
