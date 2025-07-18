-- Add missing fields for iOS app integration
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS size INTEGER; -- in bytes
ALTER TABLE apps ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS app_store_url TEXT;

-- Create index for better performance on iOS queries
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(is_featured);
CREATE INDEX IF NOT EXISTS idx_apps_free ON apps(is_free);
CREATE INDEX IF NOT EXISTS idx_apps_rating ON apps(rating);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_release_date ON apps(release_date);

-- Update existing apps to set is_free based on price
UPDATE apps SET is_free = (price = 0 OR price IS NULL) WHERE is_free IS NULL;

-- Create a view for iOS app optimized queries
CREATE OR REPLACE VIEW ios_apps_view AS
SELECT 
    a.id,
    a.name,
    a.description,
    a.developer,
    a.category_id,
    a.price,
    a.currency,
    a.icon_url,
    a.app_store_url,
    a.website_url,
    a.version,
    a.size,
    a.rating,
    a.rating_count,
    a.release_date,
    a.last_updated,
    a.is_free,
    a.is_featured,
    a.status,
    a.created_at,
    a.updated_at,
    c.name as category_name,
    c.slug as category_slug,
    COALESCE(ar.average_rating, 0) as calculated_rating,
    COALESCE(ar.rating_count, 0) as calculated_rating_count
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN app_ratings ar ON a.id = ar.app_id
WHERE a.status = 'ACTIVE';

-- Create function to update app ratings
CREATE OR REPLACE FUNCTION update_app_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the apps table with calculated ratings
    UPDATE apps 
    SET 
        rating = ar.average_rating,
        rating_count = ar.rating_count
    FROM app_ratings ar
    WHERE apps.id = ar.app_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update ratings
CREATE TRIGGER trigger_update_app_ratings
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_ratings();

-- Create function to mark apps as featured
CREATE OR REPLACE FUNCTION toggle_featured_app(app_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE apps 
    SET is_featured = NOT is_featured
    WHERE id = app_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get trending apps (based on rating count and recent activity)
CREATE OR REPLACE FUNCTION get_trending_apps(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    developer TEXT,
    icon_url TEXT,
    rating NUMERIC(3,2),
    rating_count INTEGER,
    is_free BOOLEAN,
    price NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.developer,
        a.icon_url,
        a.rating,
        a.rating_count,
        a.is_free,
        a.price
    FROM apps a
    WHERE a.status = 'ACTIVE' 
        AND a.rating_count > 10
    ORDER BY a.rating_count DESC, a.rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get new releases (apps added in last 30 days)
CREATE OR REPLACE FUNCTION get_new_releases(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    developer TEXT,
    icon_url TEXT,
    rating NUMERIC(3,2),
    is_free BOOLEAN,
    price NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.developer,
        a.icon_url,
        a.rating,
        a.is_free,
        a.price,
        a.created_at
    FROM apps a
    WHERE a.status = 'ACTIVE' 
        AND a.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY a.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 