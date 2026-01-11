-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own Xero connection" ON public.xero_connections;
DROP POLICY IF EXISTS "Users can manage their own Xero connection" ON public.xero_connections;

-- Create proper INSERT policy (edge function uses service role, but we need user context)
CREATE POLICY "Users can insert their own Xero connection"
ON public.xero_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create SELECT policy
CREATE POLICY "Users can view their own Xero connection"
ON public.xero_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Create UPDATE policy
CREATE POLICY "Users can update their own Xero connection"
ON public.xero_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Create DELETE policy
CREATE POLICY "Users can delete their own Xero connection"
ON public.xero_connections
FOR DELETE
USING (auth.uid() = user_id);