-- Create table to track active editors
CREATE TABLE public.active_editors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id)
);

-- Enable RLS
ALTER TABLE public.active_editors ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see active editors
CREATE POLICY "Authenticated users can view active editors"
ON public.active_editors FOR SELECT
TO authenticated
USING (true);

-- Users can manage their own editor sessions
CREATE POLICY "Users can insert their own editor sessions"
ON public.active_editors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own editor sessions"
ON public.active_editors FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own editor sessions"
ON public.active_editors FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_active_editors_resource ON public.active_editors(resource_type, resource_id);
CREATE INDEX idx_active_editors_heartbeat ON public.active_editors(last_heartbeat);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_editors;

-- Function to clean up stale editor sessions (older than 2 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_editors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.active_editors
  WHERE last_heartbeat < now() - INTERVAL '2 minutes';
END;
$$;