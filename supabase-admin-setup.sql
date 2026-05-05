-- Run this script in your Supabase SQL Editor to support Admin features
-- This uses a profiles table synced with auth.users

-- 1. Create a table for public profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  role text not null,
  name text not null,
  email text,
  company_name text,
  university text,
  reg_no text,
  staff_number text,
  approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (or restrict to admins as needed)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
  ON profiles FOR SELECT USING (true);

-- Allow users to insert/update their own profile
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile."
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  student_exists BOOLEAN;
BEGIN
  -- Strict verification for students
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.students_db 
      WHERE reg_no = NEW.raw_user_meta_data->>'reg_no' 
      AND university = NEW.raw_user_meta_data->>'university'
    ) INTO student_exists;
    
    IF NOT student_exists THEN
      RAISE EXCEPTION 'Verification failed. Student with reg_no % not found at %', 
        NEW.raw_user_meta_data->>'reg_no', 
        NEW.raw_user_meta_data->>'university';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, role, name, email, company_name, university, reg_no, staff_number, approved)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'role', 
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'reg_no',
    NEW.raw_user_meta_data->>'staff_number',
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('company', 'admin') THEN false ELSE true END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- 3. Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Function to implicitly update auth user metadata if an admin overrides the profile
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS trigger AS $$
BEGIN
  IF NEW.approved = true AND OLD.approved = false THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{approved}', 'true'::jsonb)
    WHERE id = NEW.id;
  ELSIF NEW.approved = false AND OLD.approved = true THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{approved}', 'false'::jsonb)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

DROP TRIGGER IF EXISTS on_profile_approved_changed ON public.profiles;
CREATE TRIGGER on_profile_approved_changed
  AFTER UPDATE OF approved ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_to_auth();

-- 5. Helper function for AdminDashboard to approve a user using RPC
CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET approved = true WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function for AdminDashboard to reject/delete a pending user
CREATE OR REPLACE FUNCTION reject_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- This removes them from auth.users (which cascades to profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper function to fetch pending users
CREATE OR REPLACE FUNCTION get_pending_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.role,
    p.name,
    p.company_name,
    p.created_at
  FROM public.profiles p
  WHERE p.approved = false
  AND p.role IN ('company', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

