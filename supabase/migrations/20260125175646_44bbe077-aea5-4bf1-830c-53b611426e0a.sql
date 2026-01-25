-- Drop and recreate the insert policy to also allow admins/managers for public channels
DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON chat_channel_members;

-- Combined policy for adding channel members
CREATE POLICY "Users can add channel members" 
ON chat_channel_members 
FOR INSERT 
WITH CHECK (
  -- Users can add themselves
  user_id = auth.uid()
  OR
  -- Channel owners/admins can add other users to their channels
  channel_id IN (
    SELECT channel_id 
    FROM chat_channel_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR
  -- System admins/managers can add anyone to public channels
  (
    is_admin_or_manager(auth.uid())
    AND channel_id IN (
      SELECT id FROM chat_channels WHERE channel_type = 'public'
    )
  )
);