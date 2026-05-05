-- SQL snippet to promote normal users to admin
-- Instructions: 
-- 1. Go to your application's Signup page
-- 2. Create the accounts you want to use for admins (e.g. sign up as a Student)
-- 3. Run this script in the Supabase SQL Editor to promote those specific accounts

DO $$
DECLARE
  target_email_1 TEXT := 'systemadmin1@example.com'; -- Replace with the first admin's email
  target_email_2 TEXT := 'systemadmin2@example.com'; -- Replace with the second admin's email
  
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Get the IDs of the users
  SELECT id INTO user1_id FROM auth.users WHERE email = target_email_1;
  SELECT id INTO user2_id FROM auth.users WHERE email = target_email_2;

  -- Update auth.users metadata to reflect 'admin' role
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"'::jsonb)
  WHERE id IN (user1_id, user2_id);

  -- Update base_profiles to admin role
  UPDATE public.base_profiles
  SET role = 'admin', approved = true
  WHERE id IN (user1_id, user2_id);

  -- Clean up specific profiles that might have been created during signup
  DELETE FROM public.student_profiles WHERE id IN (user1_id, user2_id);
  DELETE FROM public.company_profiles WHERE id IN (user1_id, user2_id);
  DELETE FROM public.staff_profiles WHERE id IN (user1_id, user2_id);
  
END $$;
