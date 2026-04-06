-- Optional: auto-create public.profiles when a Supabase Auth user is created.
-- Set role from raw_user_meta_data.role ('founder' | 'investor') if your client passes it at sign-up.
-- If you prefer to insert profiles only from your API, skip this migration.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.app_role;
  meta_role TEXT;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_app_meta_data->>'role');
  IF meta_role = 'investor' THEN
    r := 'investor'::public.app_role;
  ELSE
    r := 'founder'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, role, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    r,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF r = 'founder' THEN
    INSERT INTO public.founder_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.vc_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profiles + role-specific row; pass role in user metadata before OAuth callback if possible.';
