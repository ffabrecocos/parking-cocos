-- Cocos Parking initial schema

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'is_admin can only be changed in Supabase directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  license_plates text[] NOT NULL DEFAULT '{}',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_protect_is_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_is_admin();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- parking_spots
CREATE TABLE public.parking_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor int NOT NULL CHECK (floor > 0),
  spot_number int NOT NULL CHECK (spot_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (floor, spot_number)
);

-- occupancies
CREATE TABLE public.occupancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupied_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE UNIQUE INDEX occupancies_one_active_per_spot
  ON public.occupancies (spot_id)
  WHERE released_at IS NULL;

CREATE UNIQUE INDEX occupancies_one_active_per_user
  ON public.occupancies (user_id)
  WHERE released_at IS NULL;

CREATE INDEX occupancies_active_spot_idx ON public.occupancies (spot_id) WHERE released_at IS NULL;
CREATE INDEX occupancies_active_user_idx ON public.occupancies (user_id) WHERE released_at IS NULL;

-- reset all active occupancies
CREATE OR REPLACE FUNCTION public.reset_all_occupancies()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.occupancies
  SET released_at = now()
  WHERE released_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- claim spot
CREATE OR REPLACE FUNCTION public.claim_spot(p_spot_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_occupancy_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND full_name IS NOT NULL AND full_name <> ''
  ) THEN
    RAISE EXCEPTION 'Complete your profile first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.occupancies
    WHERE user_id = v_user_id AND released_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You already have an active spot';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.occupancies
    WHERE spot_id = p_spot_id AND released_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Spot is already occupied';
  END IF;

  INSERT INTO public.occupancies (spot_id, user_id)
  VALUES (p_spot_id, v_user_id)
  RETURNING id INTO v_occupancy_id;

  RETURN v_occupancy_id;
END;
$$;

-- release own spot
CREATE OR REPLACE FUNCTION public.release_spot(p_spot_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.occupancies
  SET released_at = now()
  WHERE user_id = v_user_id
    AND released_at IS NULL
    AND (p_spot_id IS NULL OR spot_id = p_spot_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active spot to release';
  END IF;

  RETURN true;
END;
$$;

-- admin force release
CREATE OR REPLACE FUNCTION public.admin_release_spot(p_spot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.occupancies
  SET released_at = now()
  WHERE spot_id = p_spot_id AND released_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Spot is not occupied';
  END IF;

  RETURN true;
END;
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY spots_select ON public.parking_spots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY spots_insert_admin ON public.parking_spots
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY spots_update_admin ON public.parking_spots
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY spots_delete_admin ON public.parking_spots
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY occupancies_select ON public.occupancies
  FOR SELECT TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.occupancies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_spots;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_spot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_spot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_spot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_occupancies() TO authenticated;
