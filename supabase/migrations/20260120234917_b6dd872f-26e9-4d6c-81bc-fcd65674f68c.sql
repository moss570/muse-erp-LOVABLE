-- Fix ambiguous overloaded function call for work order number generation.
-- There are two functions:
--   1) public.generate_wo_number()                   (newer)
--   2) public.generate_wo_number(p_wo_type varchar DEFAULT ...)
-- Calling via RPC without args becomes ambiguous because (2) is also callable with zero args.
-- Keep the SECURITY DEFINER variant (2) and drop the no-arg variant.

DROP FUNCTION IF EXISTS public.generate_wo_number();