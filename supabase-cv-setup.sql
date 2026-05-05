-- Run this in your Supabase SQL Editor to support CV uploads

-- Add cv_url column to applications table
ALTER TABLE applications ADD COLUMN cv_url TEXT;

-- Create storage bucket for CVs (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Allow authenticated users to upload and view)
CREATE POLICY "Authenticated users can upload CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view CVs"
ON storage.objects FOR SELECT
USING (bucket_id = 'cvs' AND auth.role() = 'authenticated');
