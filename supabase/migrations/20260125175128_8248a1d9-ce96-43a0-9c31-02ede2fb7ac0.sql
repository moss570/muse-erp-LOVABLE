-- Add policy for channel owners/admins to add members to their channels
DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;

CREATE POLICY "Channel owners can add members" 
ON chat_channel_members 
FOR INSERT 
WITH CHECK (
  -- Users can add themselves (existing behavior)
  user_id = auth.uid()
  OR
  -- Channel owners/admins can add other users
  channel_id IN (
    SELECT channel_id 
    FROM chat_channel_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);