-- Prevent admin signups by updating the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  student_exists BOOLEAN;
  is_approved BOOLEAN;
BEGIN
  -- Block admin role creation from signups
  IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    RAISE EXCEPTION 'Registration for system administrators is not permitted.';
  END IF;

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
  IF NEW.raw_user_meta_data->>'role' IN ('company', 'supervisor') THEN
    is_approved := false; -- Requires administrator approval
  ELSE
    is_approved := true;
  END IF;

  -- Insert Base Profile
  INSERT INTO public.base_profiles (
    id, role, name, email, phone_number, approved
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'role', 
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    is_approved
  );

  -- Insert Sub-Profiles
  IF NEW.raw_user_meta_data->>'role' = 'company' THEN
    INSERT INTO public.company_profiles (
      id, company_name, kra_pin, company_reg_number, county, town, building, online_presence
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'kra_pin',
      NEW.raw_user_meta_data->>'company_reg_number',
      NEW.raw_user_meta_data->>'county',
      NEW.raw_user_meta_data->>'town',
      NEW.raw_user_meta_data->>'building',
      NEW.raw_user_meta_data->>'online_presence'
    );
  ELSIF NEW.raw_user_meta_data->>'role' = 'student' THEN
    INSERT INTO public.student_profiles (
      id, reg_no, university
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'reg_no',
      NEW.raw_user_meta_data->>'university'
    );
  ELSIF NEW.raw_user_meta_data->>'role' = 'supervisor' THEN
    INSERT INTO public.staff_profiles (
      id, staff_number, university, department
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'staff_number',
      NEW.raw_user_meta_data->>'university',
      NEW.raw_user_meta_data->>'department'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;
