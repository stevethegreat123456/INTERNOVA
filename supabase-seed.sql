-- Seed data for whitelists databases

-- 1. Clear existing seed data if necessary
TRUNCATE TABLE public.students_db CASCADE;
TRUNCATE TABLE public.staff_db CASCADE;

-- 2. Insert Student Check Records
INSERT INTO public.students_db (reg_no, university, full_name) VALUES 
('S11/00010/24', 'Egerton University', 'Alice Johnson'),
('S12/00011/24', 'Egerton University', 'Bob Williams'),
('E35/2091/2024', 'University of Nairobi', 'Charlie Brown'),
('F16/1234/2024', 'University of Nairobi', 'Diana Prince'),
('J30/1234/2024', 'Kenyatta University', 'Ethan Hunt'),
('H12/5678/2024', 'Kenyatta University', 'Fiona Gallagher'),
('SCT211-0123/2024', 'Jomo Kenyatta University of Agriculture and Technology', 'George Costanza'),
('COM/0123/24', 'Moi University', 'Hannah Abbott'),
('123456', 'Strathmore University', 'Ian Smith');

-- 3. Insert Staff/Supervisor/Admin Check Records
INSERT INTO public.staff_db (staff_number, email, university, role, full_name, department) VALUES 
('EMP-1001', 'admin@egerton.ac.ke', 'Egerton University', 'admin', 'Dr. System Admin', 'IT'),
('EMP-1002', 'supervisor1@egerton.ac.ke', 'Egerton University', 'supervisor', 'Dr. John Doe', 'Computer Science'),
('EMP-2001', 'admin@uonbi.ac.ke', 'University of Nairobi', 'admin', 'Prof. Mary Jane', 'Administration'),
('EMP-2002', 'supervisor@uonbi.ac.ke', 'University of Nairobi', 'supervisor', 'Dr. Peter Parker', 'Engineering'),
('EMP-3001', 'supervisor@ku.ac.ke', 'Kenyatta University', 'supervisor', 'Prof. Bruce Wayne', 'Math'),
('EMP-4001', 'supervisor@jkuat.ac.ke', 'Jomo Kenyatta University of Agriculture and Technology', 'supervisor', 'Dr. Clark Kent', 'IT'),
('EMP-5001', 'supervisor@must.ac.ke', 'Moi University', 'supervisor', 'Dr. Diana Prince', 'Physics'),
('EMP-6001', 'supervisor@strathmore.edu', 'Strathmore University', 'supervisor', 'Prof. Lex Luthor', 'Business');
