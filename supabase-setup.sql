-- Run this in your Supabase SQL Editor to create the necessary tables

-- Drop existing tables if needed (careful!)
-- DROP TABLE IF EXISTS applications;
-- DROP TABLE IF EXISTS opportunities;

-- Create Opportunities Table
CREATE TABLE opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES auth.users(id) NOT NULL,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Opportunities Policies
CREATE POLICY "Anyone can view opportunities" 
ON opportunities FOR SELECT 
USING (true);

CREATE POLICY "Companies can insert their own opportunities" 
ON opportunities FOR INSERT 
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own opportunities" 
ON opportunities FOR UPDATE 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete their own opportunities" 
ON opportunities FOR DELETE 
USING (auth.uid() = company_id);


-- Create Applications Table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'shortlisted')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Applications Policies
CREATE POLICY "Students can view their own applications" 
ON applications FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Companies can view applications for their opportunities" 
ON applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM opportunities 
    WHERE opportunities.id = applications.opportunity_id 
    AND opportunities.company_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own applications" 
ON applications FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Companies can update application status" 
ON applications FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM opportunities 
    WHERE opportunities.id = applications.opportunity_id 
    AND opportunities.company_id = auth.uid()
  )
);
