-- Create storage bucket for climbing media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'climbing-media', 
  'climbing-media', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- Storage policies for climbing-media bucket
CREATE POLICY "Users can view all climbing media"
ON storage.objects FOR SELECT
USING (bucket_id = 'climbing-media');

CREATE POLICY "Authenticated users can upload climbing media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'climbing-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own climbing media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'climbing-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own climbing media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'climbing-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);