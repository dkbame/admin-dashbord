-- Add macupdate_url column to apps table for MacUpdate integration
ALTER TABLE apps ADD COLUMN IF NOT EXISTS macupdate_url TEXT;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_apps_macupdate_url ON apps(macupdate_url);

-- Update source check constraint to include MACUPDATE
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_source_check;
ALTER TABLE apps ADD CONSTRAINT apps_source_check CHECK (source IN ('MAS', 'CUSTOM', 'MACUPDATE'));

-- Add comment
COMMENT ON COLUMN apps.macupdate_url IS 'MacUpdate URL for apps imported from MacUpdate'; 