-- SQL snippet to add two admin accounts to the database
-- Instructions: Run this in the Supabase SQL Editor.
-- You can change the emails, passwords, and names as needed before running.

-- 1. Temporarily disable the trigger that prevents admin signups
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

DO $$
DECLARE
  admin1_id UUID := gen_random_uuid();
  admin2_id UUID := gen_random_uuid();
BEGIN
  -- Insert Admin 1 into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', admin1_id, 'authenticated', 'authenticated', 
    'admin1@system.com', extensions.crypt('Admin1Pass#2024!', extensions.gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{"role":"admin","name":"System Admin 1"}', NOW(), NOW()
  );

  -- Insert Admin 2 into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', admin2_id, 'authenticated', 'authenticated', 
    'admin2@system.com', extensions.crypt('Admin2Pass#2024!', extensions.gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}', '{"role":"admin","name":"System Admin 2"}', NOW(), NOW()
  );

  -- 2. Insert Admin Profiles directly into public.base_profiles
  INSERT INTO public.base_profiles (id, role, name, email, phone_number, approved)
  VALUES 
    (admin1_id, 'admin', 'System Admin 1', 'admin1@system.com', '+254700000001', true),
    (admin2_id, 'admin', 'System Admin 2', 'admin2@system.com', '+254700000002', true);
    
END $$;

-- 3. Re-enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
