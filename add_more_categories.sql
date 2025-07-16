-- Add more categories commonly found in Mac App Store
INSERT INTO categories (name, slug) VALUES
  ('Developer Tools', 'developer-tools'),
  ('Music', 'music'),
  ('Photo & Video', 'photo-video'),
  ('News', 'news'),
  ('Weather', 'weather'),
  ('Travel', 'travel'),
  ('Sports', 'sports'),
  ('Medical', 'medical'),
  ('Food & Drink', 'food-drink'),
  ('Shopping', 'shopping'),
  ('Navigation', 'navigation'),
  ('Book', 'book'),
  ('Magazine', 'magazine'),
  ('Catalogs', 'catalogs'),
  ('Newsstand', 'newsstand')
ON CONFLICT (slug) DO NOTHING; 