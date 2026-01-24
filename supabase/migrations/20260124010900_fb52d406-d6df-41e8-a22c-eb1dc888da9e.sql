-- Add column to store completed edges of the polygon
ALTER TABLE public.territorios 
ADD COLUMN lados_completados integer[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.territorios.lados_completados IS 'Array of indices indicating which polygon edges have been completed';

-- Update RLS policy to allow all authenticated users to update territories (for status and edge changes)
DROP POLICY IF EXISTS "Admins can update territories" ON public.territorios;

CREATE POLICY "Authenticated users can update territory status"
ON public.territorios
FOR UPDATE
USING (true)
WITH CHECK (true);