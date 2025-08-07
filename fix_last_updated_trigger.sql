-- =====================================================
-- FIX LAST_UPDATED TRIGGER FOR ITUNES MATCHING
-- =====================================================

-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_apps_last_updated ON apps;

-- Create a new function that only updates last_updated for non-MAS field changes
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update last_updated if fields other than MAS fields are being updated
  -- MAS fields: mas_id, mas_url, is_on_mas
  IF (OLD.mas_id IS DISTINCT FROM NEW.mas_id) OR 
     (OLD.mas_url IS DISTINCT FROM NEW.mas_url) OR 
     (OLD.is_on_mas IS DISTINCT FROM NEW.is_on_mas) THEN
    -- Only MAS fields changed, don't update last_updated
    RETURN NEW;
  ELSE
    -- Non-MAS fields changed, update last_updated
    NEW.last_updated = now();
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER update_apps_last_updated
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_column();

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION update_last_updated_column() IS 'Updates last_updated timestamp only when non-MAS fields are modified. MAS fields (mas_id, mas_url, is_on_mas) do not trigger last_updated updates.'; 