-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create invoice freight links" ON public.invoice_freight_links;
DROP POLICY IF EXISTS "Authenticated users can update invoice freight links" ON public.invoice_freight_links;
DROP POLICY IF EXISTS "Authenticated users can delete invoice freight links" ON public.invoice_freight_links;

-- Create more restrictive policies - users can only manage links they created
CREATE POLICY "Users can create invoice freight links" 
ON public.invoice_freight_links 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can update own invoice freight links" 
ON public.invoice_freight_links 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can delete own invoice freight links" 
ON public.invoice_freight_links 
FOR DELETE 
TO authenticated
USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));