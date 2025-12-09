-- Ajouter le support pour plusieurs professeurs dans les sous-salles

-- Créer une table de liaison pour les professeurs multiples
CREATE TABLE IF NOT EXISTS sub_room_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_room_id UUID REFERENCES sub_rooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sub_room_id, teacher_id)
);

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_sub_room_teachers_sub_room ON sub_room_teachers(sub_room_id);
CREATE INDEX IF NOT EXISTS idx_sub_room_teachers_teacher ON sub_room_teachers(teacher_id);

-- Ajouter une colonne pour marquer si c'est une classe collaborative
ALTER TABLE sub_rooms ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;

SELECT 'Multi-teacher support added!' as status;
