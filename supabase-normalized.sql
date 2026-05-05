-- Alter staff_db to add missing columns (staff_number, department) if not exist
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.staff_db ADD COLUMN staff_number text;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;

  BEGIN
    ALTER TABLE public.staff_db ADD COLUMN department text;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;
END $$;

-- 1. Drop old tables, views, and dependencies
DROP TABLE IF EXISTS public.logbooks CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    EXECUTE 'DROP TABLE public.profiles CASCADE';
  ELSIF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = 'profiles') THEN
    EXECUTE 'DROP VIEW public.profiles CASCADE';
  END IF;
END $$;

DROP TABLE IF EXISTS public.base_profiles CASCADE;
DROP TABLE IF EXISTS public.company_profiles CASCADE;
DROP TABLE IF EXISTS public.student_profiles CASCADE;
DROP TABLE IF EXISTS public.staff_profiles CASCADE;

-- 2. Create Base Profiles table
CREATE TABLE public.base_profiles (
  id uuid NOT NULL,
  role text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone_number text,
  approved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  logo_url text,
  CONSTRAINT base_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT base_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on base_profiles
ALTER TABLE public.base_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.base_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own base profile." ON public.base_profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Create Role-Specific Tables
CREATE TABLE public.company_profiles (
  id uuid NOT NULL,
  company_name text NOT NULL,
  kra_pin text,
  company_reg_number text,
  county text,
  town text,
  building text,
  online_presence text,
  about_us text,
  CONSTRAINT company_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT company_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.student_profiles (
  id uuid NOT NULL,
  reg_no text NOT NULL,
  university text NOT NULL,
  bio text,
  skills text,
  CONSTRAINT student_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT student_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.staff_profiles (
  id uuid NOT NULL,
  staff_number text NOT NULL,
  university text NOT NULL,
  department text,
  CONSTRAINT staff_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT staff_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);

-- Enable RLS on sub-tables
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public company profiles." ON public.company_profiles FOR SELECT USING (true);
CREATE POLICY "Own company profile." ON public.company_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public student profiles." ON public.student_profiles FOR SELECT USING (true);
CREATE POLICY "Own student profile." ON public.student_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public staff profiles." ON public.staff_profiles FOR SELECT USING (true);
CREATE POLICY "Own staff profile." ON public.staff_profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Create the Profiles View (Security Invoker allows RLS to flow from underlying tables)
CREATE VIEW public.profiles WITH (security_invoker = true) AS
SELECT 
  bp.id,
  bp.role,
  bp.name,
  bp.email,
  bp.phone_number,
  bp.approved,
  bp.created_at,
  bp.logo_url,
  cp.company_name,
  cp.kra_pin,
  cp.company_reg_number,
  cp.county,
  cp.town,
  cp.building,
  cp.online_presence,
  cp.about_us,
  sp.reg_no,
  COALESCE(sp.university, stp.university) AS university,
  sp.bio,
  sp.skills,
  stp.staff_number,
  stp.department
FROM public.base_profiles bp
LEFT JOIN public.company_profiles cp ON cp.id = bp.id
LEFT JOIN public.student_profiles sp ON sp.id = bp.id
LEFT JOIN public.staff_profiles stp ON stp.id = bp.id;

-- 5. Updatable View Trigger (Allows frontend code to still run 'supabase.from("profiles").update(..)')
CREATE OR REPLACE FUNCTION public.update_profiles_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Update Base Profile
  UPDATE public.base_profiles SET
    name = COALESCE(NEW.name, OLD.name),
    phone_number = COALESCE(NEW.phone_number, OLD.phone_number),
    approved = COALESCE(NEW.approved, OLD.approved),
    logo_url = COALESCE(NEW.logo_url, OLD.logo_url)
  WHERE id = OLD.id;

  -- Update Role Profile
  IF OLD.role = 'company' THEN
    UPDATE public.company_profiles SET
      company_name = COALESCE(NEW.company_name, OLD.company_name),
      kra_pin = COALESCE(NEW.kra_pin, OLD.kra_pin),
      company_reg_number = COALESCE(NEW.company_reg_number, OLD.company_reg_number),
      county = COALESCE(NEW.county, OLD.county),
      town = COALESCE(NEW.town, OLD.town),
      building = COALESCE(NEW.building, OLD.building),
      online_presence = COALESCE(NEW.online_presence, OLD.online_presence),
      about_us = COALESCE(NEW.about_us, OLD.about_us)
    WHERE id = OLD.id;
  ELSIF OLD.role = 'student' THEN
    UPDATE public.student_profiles SET
      reg_no = COALESCE(NEW.reg_no, OLD.reg_no),
      university = COALESCE(NEW.university, OLD.university),
      bio = COALESCE(NEW.bio, OLD.bio),
      skills = COALESCE(NEW.skills, OLD.skills)
    WHERE id = OLD.id;
  ELSIF OLD.role = 'supervisor' THEN
    UPDATE public.staff_profiles SET
      staff_number = COALESCE(NEW.staff_number, OLD.staff_number),
      university = COALESCE(NEW.university, OLD.university),
      department = COALESCE(NEW.department, OLD.department)
    WHERE id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_view_trigger
  INSTEAD OF UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_view();

-- 6. Trigger to Automatically insert into new tables on user creation
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

-- Ensure auth trigger is connected
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Restore Application and logbook tables pointing to new structure
CREATE TABLE public.opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  company_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  max_positions integer DEFAULT 1,
  start_date date DEFAULT CURRENT_DATE,
  is_paid boolean DEFAULT false,
  tags text[] DEFAULT '{}'::text[],
  CONSTRAINT opportunities_pkey PRIMARY KEY (id),
  CONSTRAINT opportunities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'shortlisted'::text])),
  applied_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  cv_url text,
  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE,
  CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.logbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  student_id uuid NOT NULL,
  week_number integer NOT NULL,
  content text NOT NULL,
  supervisor_feedback text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT logbooks_pkey PRIMARY KEY (id),
  CONSTRAINT logbooks_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE,
  CONSTRAINT logbooks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.base_profiles(id) ON DELETE CASCADE
);
