-- Supabase Updates for Logbooks and Profiles

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT,
ADD COLUMN IF NOT EXISTS about_us TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create Logbooks Table
CREATE TABLE IF NOT EXISTS public.logbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  supervisor_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Setup RLS for Logbooks
ALTER TABLE public.logbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own logbooks" ON public.logbooks;
CREATE POLICY "Students can view their own logbooks" ON public.logbooks
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their own logbooks" ON public.logbooks;
CREATE POLICY "Students can insert their own logbooks" ON public.logbooks
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own logbooks" ON public.logbooks;
CREATE POLICY "Students can update their own logbooks" ON public.logbooks
  FOR UPDATE USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Supervisors can view logbooks of students in their university" ON public.logbooks;
CREATE POLICY "Supervisors can view logbooks of students in their university" ON public.logbooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles s_prof
      JOIN public.profiles sup_prof ON s_prof.university = sup_prof.university
      WHERE s_prof.id = logbooks.student_id
      AND sup_prof.id = auth.uid()
      AND sup_prof.role IN ('supervisor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Supervisors can update logbooks" ON public.logbooks;
CREATE POLICY "Supervisors can update logbooks" ON public.logbooks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles s_prof
      JOIN public.profiles sup_prof ON s_prof.university = sup_prof.university
      WHERE s_prof.id = logbooks.student_id
      AND sup_prof.id = auth.uid()
      AND sup_prof.role IN ('supervisor', 'admin')
    )
  );
  
DROP POLICY IF EXISTS "Companies can view logbooks of their accepted students" ON public.logbooks;
CREATE POLICY "Companies can view logbooks of their accepted students" ON public.logbooks
  FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.opportunities o ON a.opportunity_id = o.id
        WHERE logbooks.application_id = a.id
        AND o.company_id = auth.uid()
    )
  );
