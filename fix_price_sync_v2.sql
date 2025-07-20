-- =====================================================
-- Fix Price and Free Field Synchronization (Version 2)
-- =====================================================
-- This script fixes the discrepancy between price and is_free fields
-- and ensures they stay in sync automatically

-- Step 1: Create function to sync is_free with price
CREATE OR REPLACE FUNCTION sync_price_and_free()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_free based on price (handle text price field)
  NEW.is_free = (NEW.price = '0' OR NEW.price = '' OR NEW.price IS NULL);
  
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to automatically sync price and is_free
DROP TRIGGER IF EXISTS trigger_sync_price_and_free ON apps;
CREATE TRIGGER trigger_sync_price_and_free
  BEFORE INSERT OR UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION sync_price_and_free();

-- Step 3: Update existing apps to ensure consistency (handle text price field)
UPDATE apps 
SET is_free = true,
    updated_at = NOW()
WHERE price = '0' OR price = '' OR price IS NULL;

UPDATE apps 
SET is_free = false,
    updated_at = NOW()
WHERE price != '0' AND price != '' AND price IS NOT NULL;

-- Step 4: Add a comment to document the change
COMMENT ON FUNCTION sync_price_and_free() IS 'Automatically syncs is_free field with price field. When price is 0, empty, or NULL, is_free becomes true.';

-- Step 5: Verify the changes
SELECT 
    'Total apps' as metric,
    COUNT(*) as count
FROM apps
UNION ALL
SELECT 
    'Free apps',
    COUNT(*)
FROM apps
WHERE is_free = true
UNION ALL
SELECT 
    'Paid apps',
    COUNT(*)
FROM apps
WHERE is_free = false
UNION ALL
SELECT 
    'Apps with price = 0',
    COUNT(*)
FROM apps
WHERE price = '0' OR price = '';

-- Step 6: Show sample of apps with their price and is_free status
SELECT 
    name,
    price,
    is_free,
    CASE 
        WHEN price = '0' OR price = '' OR price IS NULL THEN 'Free'
        ELSE '$' || price
    END as display_price
FROM apps
ORDER BY name
LIMIT 10; 