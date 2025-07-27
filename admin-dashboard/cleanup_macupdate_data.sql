-- Clean up MacUpdate-related data from the database
-- This script removes any apps that were imported from MacUpdate

-- Delete apps with source = 'MACUPDATE' or similar
DELETE FROM custom_metadata 
WHERE app_id IN (
  SELECT id FROM apps 
  WHERE source ILIKE '%macupdate%' 
     OR source ILIKE '%mac%update%'
     OR name ILIKE '%macupdate%'
);

DELETE FROM screenshots 
WHERE app_id IN (
  SELECT id FROM apps 
  WHERE source ILIKE '%macupdate%' 
     OR source ILIKE '%mac%update%'
     OR name ILIKE '%macupdate%'
);

DELETE FROM apps 
WHERE source ILIKE '%macupdate%' 
   OR source ILIKE '%mac%update%'
   OR name ILIKE '%macupdate%';

-- Show summary of remaining apps
SELECT 
  source,
  COUNT(*) as app_count
FROM apps 
GROUP BY source 
ORDER BY app_count DESC; 