-- Fix notifications table to ensure proper structure
-- Add missing columns if they don't exist

ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS sub_room_id uuid REFERENCES sub_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES sub_room_proposals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES room_invitations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS triggered_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  sub_room_id uuid REFERENCES sub_rooms(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES sub_room_proposals(id) ON DELETE CASCADE,
  invitation_id uuid REFERENCES room_invitations(id) ON DELETE CASCADE,
  triggered_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies to use auth.uid() correctly
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Anyone authenticated can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_invitation_id ON notifications(invitation_id);
