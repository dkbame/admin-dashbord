-- Create storage buckets for app icons and screenshots
-- This script sets up the necessary storage buckets with proper policies

-- Create icons bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('icons', 'icons', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('screenshots', 'screenshots', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create policies for icons bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'icons');
CREATE POLICY "Authenticated users can upload icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'icons' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update icons" ON storage.objects FOR UPDATE USING (bucket_id = 'icons' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete icons" ON storage.objects FOR DELETE USING (bucket_id = 'icons' AND auth.role() = 'authenticated');

-- Create policies for screenshots bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');
CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update screenshots" ON storage.objects FOR UPDATE USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete screenshots" ON storage.objects FOR DELETE USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated'); 