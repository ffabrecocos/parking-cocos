-- Allow is_admin changes from Supabase SQL Editor / postgres (auth.uid() is null).
-- Still blocks changes from the app via PostgREST (authenticated role).

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'is_admin can only be changed in Supabase directly';
  END IF;
  RETURN NEW;
END;
$$;
