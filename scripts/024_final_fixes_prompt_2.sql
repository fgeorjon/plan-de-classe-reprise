CREATE TABLE IF NOT EXISTS sub_room_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_room_id UUID NOT NULL REFERENCES sub_rooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sub_room_id, teacher_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sub_room_teachers_sub_room ON sub_room_teachers(sub_room_id);
CREATE INDEX IF NOT EXISTS idx_sub_room_teachers_teacher ON sub_room_teachers(teacher_id);

-- Add is_level column to classes if not exists (to exclude custom levels from class selection)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'is_level') THEN
    ALTER TABLE classes ADD COLUMN is_level BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure custom_templates table exists with pinning support
CREATE TABLE IF NOT EXISTS custom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_seats INTEGER NOT NULL,
  columns JSONB NOT NULL,
  board_position VARCHAR(10) NOT NULL DEFAULT 'top',
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for pinned templates
CREATE INDEX IF NOT EXISTS idx_custom_templates_pinned ON custom_templates(establishment_id, is_pinned);

SELECT 'All Prompt 2 fixes applied successfully!' as status;
