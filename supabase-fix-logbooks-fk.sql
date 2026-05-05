-- Fix foreign key constraint for logbooks to match applications
ALTER TABLE public.logbooks
  DROP CONSTRAINT IF EXISTS logbooks_student_id_fkey;

ALTER TABLE public.logbooks
  ADD CONSTRAINT logbooks_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;
