-- Create Supabase Storage bucket for media files
-- This allows video/audio recordings to be stored properly

-- Create the media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'audio/webm', 'audio/wav', 'image/jpeg', 'image/png', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media');

-- Create RLS policy to allow public read access
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media');

-- Create RLS policy to allow users to update their own media
CREATE POLICY "Users can update own media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policy to allow users to delete their own media
CREATE POLICY "Users can delete own media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);



