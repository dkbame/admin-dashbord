-- Add sample apps and screenshots with real, accessible URLs

-- Sample apps
INSERT INTO apps (name, description, developer, category_id, price, currency, icon_url, website_url, minimum_os_version, features, source, status, is_featured, is_free) VALUES
  (
    'Notion',
    'All-in-one workspace for notes, docs, projects, and collaboration.',
    'Notion Labs Inc',
    (SELECT id FROM categories WHERE slug = 'productivity'),
    0,
    'USD',
    'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/8b/4e/8b/8b4e8b8b-8b4e-8b4e-8b4e-8b4e8b4e8b4e/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512x512-85-220-0.png',
    'https://notion.so',
    'iOS 14.0',
    ARRAY['Notes', 'Documentation', 'Project Management', 'Collaboration'],
    'CUSTOM',
    'ACTIVE',
    true,
    true
  ),
  (
    'Figma',
    'Collaborative interface design tool for teams.',
    'Figma Inc',
    (SELECT id FROM categories WHERE slug = 'design'),
    0,
    'USD',
    'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/8b/4e/8b/8b4e8b8b-8b4e-8b4e-8b4e-8b4e8b4e8b4e/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512x512-85-220-0.png',
    'https://figma.com',
    'iOS 14.0',
    ARRAY['Design', 'Prototyping', 'Collaboration', 'UI/UX'],
    'CUSTOM',
    'ACTIVE',
    true,
    true
  ),
  (
    'Spotify',
    'Music streaming service with millions of songs and podcasts.',
    'Spotify AB',
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    0,
    'USD',
    'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/8b/4e/8b/8b4e8b8b-8b4e-8b4e-8b4e-8b4e8b4e8b4e/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512x512-85-220-0.png',
    'https://spotify.com',
    'iOS 14.0',
    ARRAY['Music Streaming', 'Podcasts', 'Playlists', 'Offline Mode'],
    'CUSTOM',
    'ACTIVE',
    true,
    true
  );

-- Sample screenshots with real, accessible image URLs
INSERT INTO screenshots (app_id, url, caption, display_order) VALUES
  -- Notion screenshots
  (
    (SELECT id FROM apps WHERE name = 'Notion'),
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    'Notion Dashboard',
    1
  ),
  (
    (SELECT id FROM apps WHERE name = 'Notion'),
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'Notion Editor',
    2
  ),
  (
    (SELECT id FROM apps WHERE name = 'Notion'),
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    'Notion Collaboration',
    3
  ),
  
  -- Figma screenshots
  (
    (SELECT id FROM apps WHERE name = 'Figma'),
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
    'Figma Design Canvas',
    1
  ),
  (
    (SELECT id FROM apps WHERE name = 'Figma'),
    'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=600&fit=crop',
    'Figma Prototyping',
    2
  ),
  (
    (SELECT id FROM apps WHERE name = 'Figma'),
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=600&fit=crop',
    'Figma Collaboration',
    3
  ),
  
  -- Spotify screenshots
  (
    (SELECT id FROM apps WHERE name = 'Spotify'),
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    'Spotify Home',
    1
  ),
  (
    (SELECT id FROM apps WHERE name = 'Spotify'),
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop',
    'Spotify Player',
    2
  ),
  (
    (SELECT id FROM apps WHERE name = 'Spotify'),
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
    'Spotify Playlists',
    3
  ); 