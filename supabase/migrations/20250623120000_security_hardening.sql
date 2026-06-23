-- Security hardening: fix linter warnings
-- - Immutable search_path on trigger helpers
-- - Remove SECURITY DEFINER RPCs; enforce via RLS instead
-- - Revoke EXECUTE on internal/trigger functions from API roles

-- Trigger helpers: fixed search_path, not callable via PostgREST
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'is_admin can only be changed in Supabase directly';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_is_admin() FROM PUBLIC;

-- Auth signup trigger: not an RPC
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Supabase "automatic RLS" helper (if enabled on project)
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
  END IF;
END $$;

-- Replace policies that referenced is_admin()
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS spots_insert_admin ON public.parking_spots;
DROP POLICY IF EXISTS spots_update_admin ON public.parking_spots;
DROP POLICY IF EXISTS spots_delete_admin ON public.parking_spots;

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY spots_insert_admin ON public.parking_spots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY spots_update_admin ON public.parking_spots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY spots_delete_admin ON public.parking_spots
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Occupancy mutations via RLS (replaces SECURITY DEFINER RPCs)
CREATE POLICY occupancies_insert_claim ON public.occupancies
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND full_name IS NOT NULL
        AND btrim(full_name) <> ''
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.occupancies o
      WHERE o.user_id = auth.uid() AND o.released_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.occupancies o
      WHERE o.spot_id = spot_id AND o.released_at IS NULL
    )
  );

CREATE POLICY occupancies_release_own ON public.occupancies
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND released_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY occupancies_admin_update ON public.occupancies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Drop RPC functions no longer needed
DROP FUNCTION IF EXISTS public.claim_spot(uuid);
DROP FUNCTION IF EXISTS public.release_spot(uuid);
DROP FUNCTION IF EXISTS public.admin_release_spot(uuid);
DROP FUNCTION IF EXISTS public.reset_all_occupancies();
DROP FUNCTION IF EXISTS public.is_admin();
