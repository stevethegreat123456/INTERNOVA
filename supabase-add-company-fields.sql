-- 1. Add new fields to the profiles table
ALTER TABLE public.profiles
ADD COLUMN phone_number text,
ADD COLUMN kra_pin text,
ADD COLUMN company_reg_number text,
ADD COLUMN county text,
ADD COLUMN town text,
ADD COLUMN building text,
ADD COLUMN online_presence text;

-- 2. Update the handle_new_user function to extract these fields and apply the email logic
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  student_exists BOOLEAN;
  is_approved BOOLEAN;
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

  -- Determine initial approval status
  IF NEW.raw_user_meta_data->>'role' = 'company' THEN
    IF NEW.email LIKE '%@gmail.com' OR NEW.email LIKE '%@yahoo.com' OR NEW.email LIKE '%@hotmail.com' OR NEW.email LIKE '%@outlook.com' THEN
      is_approved := false; -- Manual review for generic domains
    ELSE
      is_approved := true;  -- Fast track for corporate domains
    END IF;
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    is_approved := false;
  ELSE
    is_approved := true;
  END IF;

  INSERT INTO public.profiles (
    id, role, name, email, company_name, university, reg_no, staff_number,
    phone_number, kra_pin, company_reg_number, county, town, building, online_presence,
    approved
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'role', 
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'reg_no',
    NEW.raw_user_meta_data->>'staff_number',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'kra_pin',
    NEW.raw_user_meta_data->>'company_reg_number',
    NEW.raw_user_meta_data->>'county',
    NEW.raw_user_meta_data->>'town',
    NEW.raw_user_meta_data->>'building',
    NEW.raw_user_meta_data->>'online_presence',
    is_approved
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;
