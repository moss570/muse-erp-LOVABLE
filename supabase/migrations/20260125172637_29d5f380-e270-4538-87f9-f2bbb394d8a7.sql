-- Drop the existing INSERT policy for chat_messages
DROP POLICY IF EXISTS "Users can send messages to their channels" ON chat_messages;

-- Create updated INSERT policy that includes DM channels via participant_ids
CREATE POLICY "Users can send messages to their channels" 
ON chat_messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() 
  AND channel_id IN (
    -- Public channels
    SELECT id FROM chat_channels WHERE channel_type = 'public'
    UNION
    -- Channels user is a member of
    SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    UNION
    -- Direct message channels where user is a participant
    SELECT id FROM chat_channels 
    WHERE channel_type = 'direct' 
    AND auth.uid() = ANY(participant_ids)
  )
);

-- Also update the SELECT policy to ensure users can see DM messages
DROP POLICY IF EXISTS "Users see messages in their channels" ON chat_messages;

CREATE POLICY "Users see messages in their channels" 
ON chat_messages 
FOR SELECT 
USING (
  channel_id IN (
    -- Public channels
    SELECT id FROM chat_channels WHERE channel_type = 'public'
    UNION
    -- Channels user is a member of
    SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    UNION
    -- Direct message channels where user is a participant
    SELECT id FROM chat_channels 
    WHERE channel_type = 'direct' 
    AND auth.uid() = ANY(participant_ids)
  )
);