-- Fix RLS policies for sub_room_proposals to allow delegates and vie-scolaire to create
DROP POLICY IF EXISTS "Delegates can create proposals" ON sub_room_proposals;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Allow ALL authenticated users to create proposals (delegates, vie-scolaire, teachers)
CREATE POLICY "Authenticated users can create proposals"
  ON sub_room_proposals FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Allow ALL authenticated users to create notifications  
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Fix RLS for sub_room_teachers to allow creation during sub-room setup
CREATE POLICY "Users can insert into sub_room_teachers"
  ON sub_room_teachers FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view sub_room_teachers"
  ON sub_room_teachers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );
