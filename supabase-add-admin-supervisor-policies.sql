-- 1. Policies for Admins to view all applications and logbooks
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can view all logbooks" ON public.logbooks;
CREATE POLICY "Admins can view all logbooks" ON public.logbooks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Policy for Supervisors to view applications of students in their university
DROP POLICY IF EXISTS "Supervisors can view applications for their university" ON public.applications;
CREATE POLICY "Supervisors can view applications for their university" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles s_prof
      JOIN public.profiles sup_prof ON s_prof.university = sup_prof.university
      WHERE s_prof.id = applications.student_id
      AND sup_prof.id = auth.uid()
      AND sup_prof.role = 'supervisor'
    )
  );
