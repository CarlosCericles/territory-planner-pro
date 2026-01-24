-- Fix the overly permissive RLS policy
DROP POLICY IF EXISTS "Authenticated users can update territory status" ON public.territorios;

-- Create a more secure policy that only allows authenticated users
CREATE POLICY "Authenticated users can update territory status"
ON public.territorios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);