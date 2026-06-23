-- Admin can mark spots occupied without a user claim (optional user / display overrides).

ALTER TABLE public.occupancies
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN marked_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN display_name text,
  ADD COLUMN display_plate text;

ALTER TABLE public.occupancies
  ADD CONSTRAINT occupancies_claim_requires_user
  CHECK (
    (marked_by_admin = false AND user_id IS NOT NULL)
    OR marked_by_admin = true
  );

-- Employee self-claim only (not admin marks)
DROP POLICY IF EXISTS occupancies_insert_claim ON public.occupancies;

CREATE POLICY occupancies_insert_claim ON public.occupancies
  FOR INSERT TO authenticated
  WITH CHECK (
    marked_by_admin = false
    AND user_id = auth.uid()
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

CREATE POLICY occupancies_insert_admin ON public.occupancies
  FOR INSERT TO authenticated
  WITH CHECK (
    marked_by_admin = true
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.occupancies o
      WHERE o.spot_id = spot_id AND o.released_at IS NULL
    )
    AND (
      user_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.occupancies o
        WHERE o.user_id = occupancies.user_id AND o.released_at IS NULL
      )
    )
  );
