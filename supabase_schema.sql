-- 1. Create students_db
CREATE TABLE IF NOT EXISTS public.students_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reg_no TEXT NOT NULL,
    university TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create companies_db
CREATE TABLE IF NOT EXISTS public.companies_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create staff_db (for admins/supervisors)
CREATE TABLE IF NOT EXISTS public.staff_db (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    university TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' or 'supervisor'
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (Optional but Recommended) Enable Row Level Security (RLS)
ALTER TABLE public.students_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_db ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone during signup so the verify query succeeds
CREATE POLICY "Allow public read access on students_db" ON public.students_db FOR SELECT USING (true);
CREATE POLICY "Allow public read access on companies_db" ON public.companies_db FOR SELECT USING (true);
CREATE POLICY "Allow public read access on staff_db" ON public.staff_db FOR SELECT USING (true);

-- ==========================================
-- Insert dummy data for your testing
-- ==========================================

INSERT INTO public.students_db (reg_no, university, full_name) VALUES 
('S01/00001/24', 'Egerton University', 'john doe'),
('S02/00002/24', 'Egerton University', 'jane smith');

INSERT INTO public.companies_db (company_name, contact_email) VALUES 
('Tech Corp', 'hr@techcorp.com'),
('Innovate Ltd', 'contact@innovate.com');

INSERT INTO public.staff_db (email, university, role, full_name) VALUES 
('admin@egerton.ac.ke', 'Egerton University', 'admin', 'Super Admin'),
('supervisor@egerton.ac.ke', 'Egerton University', 'supervisor', 'Dr. Smith');
