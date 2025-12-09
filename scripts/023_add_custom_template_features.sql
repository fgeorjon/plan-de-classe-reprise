-- Add pinning support and custom templates table

-- Add is_level flag to classes to distinguish levels from actual classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_level BOOLEAN DEFAULT false;

-- Update existing levels to be marked
UPDATE classes SET is_level = true WHERE id IN (
  SELECT id FROM levels
);

-- Table for custom room templates
CREATE TABLE IF NOT EXISTS custom_room_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_seats INTEGER NOT NULL,
  config JSONB NOT NULL,
  board_position TEXT CHECK (board_position IN ('top', 'bottom', 'left', 'right')) DEFAULT 'top',
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick access
CREATE INDEX IF NOT EXISTS idx_custom_templates_establishment ON custom_room_templates(establishment_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_pinned ON custom_room_templates(is_pinned) WHERE is_pinned = true;

SELECT 'Custom templates features added!' as status;
