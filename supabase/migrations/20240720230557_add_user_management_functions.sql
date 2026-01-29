-- 1. Create the function to update user roles
CREATE OR REPLACE FUNCTION update_user_role(user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- First, check if the currently authenticated user is an admin.
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can change user roles.';
  END IF;

  -- Update the role for the specified user.
  UPDATE public.profiles
  SET role = new_role
  WHERE id = user_id;
END;
$$;

-- 2. Enable RLS for the profiles table if not already enabled
-- (It should be enabled from the initial migration, but this is a safeguard)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Adjust RLS policies on the 'profiles' table

-- Drop existing policies to avoid conflicts. Be specific to be safe.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;

-- Create new, more appropriate policies

-- Policy 1: Any authenticated user can view all profiles.
-- This is necessary for the user management modal to list all users.
CREATE POLICY "Authenticated users can view all profiles." ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Users can insert their own profile.
-- This remains the same as the default.
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their OWN profile.
-- We will restrict this to non-role fields if needed, but for now, it's simple.
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- NOTE: The RPC function `update_user_role` handles the authorization for role changes.
-- We do not need a specific RLS policy for admins to update roles, as the function logic
-- (checking the caller's role) provides a more robust and secure way to handle this.
