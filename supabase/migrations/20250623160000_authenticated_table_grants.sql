-- Required when "Automatically expose new tables" is disabled in Supabase.
-- Without these GRANTs, authenticated users get "permission denied for table ...".

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parking_spots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.occupancies TO authenticated;
