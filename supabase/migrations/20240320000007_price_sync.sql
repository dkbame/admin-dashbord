-- Function to sync is_free with price
CREATE OR REPLACE FUNCTION sync_price_and_free()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_free based on price
  NEW.is_free = (NEW.price = 0 OR NEW.price IS NULL);
  
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync price and is_free
DROP TRIGGER IF EXISTS trigger_sync_price_and_free ON apps;
CREATE TRIGGER trigger_sync_price_and_free
  BEFORE INSERT OR UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION sync_price_and_free();

-- Update existing apps to ensure consistency
UPDATE apps 
SET is_free = (price = 0 OR price IS NULL),
    updated_at = NOW()
WHERE is_free IS NULL OR is_free != (price = 0 OR price IS NULL);

-- Create a view for consistent price display
CREATE OR REPLACE VIEW apps_with_price_display AS
SELECT 
  *,
  CASE 
    WHEN price = 0 OR price IS NULL THEN 'Free'
    ELSE '$' || price::text
  END as display_price,
  (price = 0 OR price IS NULL) as is_free_calculated
FROM apps; 