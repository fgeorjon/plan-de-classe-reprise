-- Create sub_room_classes junction table to link sub-rooms with classes
CREATE TABLE IF NOT EXISTS sub_room_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_room_id UUID NOT NULL REFERENCES sub_rooms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sub_room_id, class_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_room_classes_sub_room ON sub_room_classes(sub_room_id);
CREATE INDEX IF NOT EXISTS idx_sub_room_classes_class ON sub_room_classes(class_id);

-- Enable RLS
ALTER TABLE sub_room_classes ENABLE ROW LEVEL SECURITY;

-- RLS policies for sub_room_classes
CREATE POLICY "Users can view sub_room_classes in their establishment"
  ON sub_room_classes FOR SELECT
  USING (
    sub_room_id IN (
      SELECT id FROM sub_rooms 
      WHERE establishment_id IN (
        SELECT establishment_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage sub_room_classes for their sub_rooms"
  ON sub_room_classes FOR ALL
  USING (
    sub_room_id IN (
      SELECT id FROM sub_rooms WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    sub_room_id IN (
      SELECT id FROM sub_rooms WHERE created_by = auth.uid()
    )
  );

COMMENT ON TABLE sub_room_classes IS 'Junction table linking sub-rooms to classes for multi-class support';
