-- Create room_invitations table for multi-teacher room invitations
CREATE TABLE IF NOT EXISTS room_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  invited_teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can see their own invitations
CREATE POLICY "Teachers can view their own invitations"
  ON room_invitations
  FOR SELECT
  USING (
    invited_teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
    OR invited_by = auth.uid()
  );

-- Policy: Teachers can create invitations for their rooms
CREATE POLICY "Teachers can create invitations for their rooms"
  ON room_invitations
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
  );

-- Policy: Invited teachers can update invitation status
CREATE POLICY "Invited teachers can update invitation status"
  ON room_invitations
  FOR UPDATE
  USING (
    invited_teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    invited_teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_room_invitations_teacher ON room_invitations(invited_teacher_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_status ON room_invitations(status);
CREATE INDEX IF NOT EXISTS idx_room_invitations_room ON room_invitations(room_id);

-- Removed this file as the RLS policies are now in 005_add_room_invitations.sql
-- This script was causing duplicate policy errors
-- All room_invitations RLS policies are now properly configured in script 005
