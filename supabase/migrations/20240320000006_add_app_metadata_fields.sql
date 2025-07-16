-- Add missing metadata fields to apps table (only if they don't exist)
DO $$ 
BEGIN
    -- Add version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'version') THEN
        ALTER TABLE apps ADD COLUMN version text;
    END IF;
    
    -- Add size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'size') THEN
        ALTER TABLE apps ADD COLUMN size bigint;
    END IF;
    
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'rating') THEN
        ALTER TABLE apps ADD COLUMN rating numeric(3,2);
    END IF;
    
    -- Add rating_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'rating_count') THEN
        ALTER TABLE apps ADD COLUMN rating_count integer;
    END IF;
    
    -- Add release_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'release_date') THEN
        ALTER TABLE apps ADD COLUMN release_date timestamp with time zone;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN apps.version IS 'App version number from Mac App Store';
COMMENT ON COLUMN apps.size IS 'App file size in bytes from Mac App Store';
COMMENT ON COLUMN apps.rating IS 'Average user rating from Mac App Store (1-5 scale)';
COMMENT ON COLUMN apps.rating_count IS 'Number of user ratings from Mac App Store';
COMMENT ON COLUMN apps.release_date IS 'App release date from Mac App Store'; 