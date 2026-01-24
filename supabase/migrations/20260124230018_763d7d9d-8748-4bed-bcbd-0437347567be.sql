-- Add DELETE policy for sales_orders
CREATE POLICY "Authenticated users can delete sales orders"
ON public.sales_orders
FOR DELETE
TO authenticated
USING (true);