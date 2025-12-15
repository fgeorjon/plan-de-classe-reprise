-- Create room_invitations table for multi-prof rooms
CREATE TABLE IF NOT EXISTS room_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  invited_teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_room_invitations_invited_teacher ON room_invitations(invited_teacher_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_room ON room_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_status ON room_invitations(status);

-- Enable RLS
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies to use profile_id instead of user_id
-- Policies for room_invitations
CREATE POLICY "Users can view their own invitations"
  ON room_invitations FOR SELECT
  USING (
    invited_teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
    OR invited_by = auth.uid()
  );

CREATE POLICY "Users can create invitations for their rooms"
  ON room_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
  );

CREATE POLICY "Invited teachers can update their invitations"
  ON room_invitations FOR UPDATE
  USING (
    invited_teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
  );
