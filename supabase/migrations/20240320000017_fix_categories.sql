-- Ensure categories are properly populated
-- This migration will insert categories if they don't exist

INSERT INTO categories (name, slug) VALUES
  ('Productivity', 'productivity'),
  ('Development', 'development'),
  ('Design', 'design'),
  ('Utilities', 'utilities'),
  ('Entertainment', 'entertainment'),
  ('Education', 'education'),
  ('Business', 'business'),
  ('Graphics & Design', 'graphics-design'),
  ('Video & Audio', 'video-audio'),
  ('Social Networking', 'social-networking'),
  ('Games', 'games'),
  ('Health & Fitness', 'health-fitness'),
  ('Lifestyle', 'lifestyle'),
  ('Finance', 'finance'),
  ('Reference', 'reference')
ON CONFLICT (slug) DO NOTHING;

-- Verify categories exist
SELECT 'Categories in database:' as info;
SELECT name, slug FROM categories ORDER BY name; 