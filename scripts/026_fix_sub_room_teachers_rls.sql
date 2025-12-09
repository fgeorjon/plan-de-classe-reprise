-- Fix RLS policies for sub_room_teachers table
-- This allows teachers and admins to create multi-teacher sub-rooms

-- Enable RLS if not already enabled
ALTER TABLE sub_room_teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can view their sub_room_teachers" ON sub_room_teachers;
DROP POLICY IF EXISTS "Teachers can insert sub_room_teachers" ON sub_room_teachers;
DROP POLICY IF EXISTS "Teachers can update their sub_room_teachers" ON sub_room_teachers;
DROP POLICY IF EXISTS "Teachers can delete their sub_room_teachers" ON sub_room_teachers;

-- Policy: Teachers and admins can view all sub_room_teachers
CREATE POLICY "Teachers can view their sub_room_teachers"
ON sub_room_teachers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policy: Teachers and admins can insert sub_room_teachers
CREATE POLICY "Teachers can insert sub_room_teachers"
ON sub_room_teachers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policy: Teachers and admins can update sub_room_teachers
CREATE POLICY "Teachers can update their sub_room_teachers"
ON sub_room_teachers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policy: Teachers and admins can delete sub_room_teachers
CREATE POLICY "Teachers can delete their sub_room_teachers"
ON sub_room_teachers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin')
  )
);
