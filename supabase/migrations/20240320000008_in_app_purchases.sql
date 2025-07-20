-- =====================================================
-- In-App Purchases Integration
-- =====================================================
-- This migration adds support for free apps with in-app purchases

-- Add new fields to apps table for in-app purchase support
ALTER TABLE apps ADD COLUMN IF NOT EXISTS has_in_app_purchases BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS in_app_purchase_summary TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS pricing_model TEXT CHECK (pricing_model IN ('FREE', 'PAID', 'FREE_WITH_IAP', 'FREEMIUM', 'SUBSCRIPTION'));

-- Create in_app_purchases table
CREATE TABLE IF NOT EXISTS in_app_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  purchase_type TEXT CHECK (purchase_type IN ('CONSUMABLE', 'NON_CONSUMABLE', 'AUTO_RENEWABLE', 'NON_RENEWING')),
  duration TEXT, -- For subscriptions: 'monthly', 'yearly', 'lifetime'
  mas_product_id TEXT, -- Mac App Store product identifier
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_in_app_purchases_app_id ON in_app_purchases(app_id);
CREATE INDEX IF NOT EXISTS idx_in_app_purchases_type ON in_app_purchases(purchase_type);
CREATE INDEX IF NOT EXISTS idx_apps_pricing_model ON apps(pricing_model);
CREATE INDEX IF NOT EXISTS idx_apps_has_iap ON apps(has_in_app_purchases);

-- Enable RLS on in_app_purchases table
ALTER TABLE in_app_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for in_app_purchases
CREATE POLICY "Allow public read access for in_app_purchases"
  ON in_app_purchases FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated insert access for in_app_purchases"
  ON in_app_purchases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access for in_app_purchases"
  ON in_app_purchases FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete access for in_app_purchases"
  ON in_app_purchases FOR DELETE
  TO authenticated
  USING (true);

-- Function to update app's has_in_app_purchases flag
CREATE OR REPLACE FUNCTION update_app_iap_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the app's has_in_app_purchases flag when IAPs are added/removed
  IF TG_OP = 'INSERT' THEN
    UPDATE apps 
    SET has_in_app_purchases = true,
        pricing_model = CASE 
          WHEN pricing_model = 'FREE' THEN 'FREE_WITH_IAP'
          WHEN pricing_model = 'PAID' THEN 'FREEMIUM'
          ELSE pricing_model
        END,
        updated_at = NOW()
    WHERE id = NEW.app_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if this was the last IAP for this app
    IF NOT EXISTS (SELECT 1 FROM in_app_purchases WHERE app_id = OLD.app_id) THEN
      UPDATE apps 
      SET has_in_app_purchases = false,
          pricing_model = CASE 
            WHEN price = '0' OR price = '' OR price IS NULL THEN 'FREE'
            ELSE 'PAID'
          END,
          updated_at = NOW()
      WHERE id = OLD.app_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for in_app_purchases
DROP TRIGGER IF EXISTS trigger_update_app_iap_status ON in_app_purchases;
CREATE TRIGGER trigger_update_app_iap_status
  AFTER INSERT OR DELETE ON in_app_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_app_iap_status();

-- Update existing apps to set pricing_model based on current data
UPDATE apps 
SET pricing_model = CASE 
    WHEN price = '0' OR price = '' OR price IS NULL THEN 'FREE'
    ELSE 'PAID'
  END
WHERE pricing_model IS NULL;

-- Create a view for apps with their IAP summary
CREATE OR REPLACE VIEW apps_with_iap_summary AS
SELECT 
  a.*,
  COUNT(iap.id) as iap_count,
  MIN(iap.price) as min_iap_price,
  MAX(iap.price) as max_iap_price,
  STRING_AGG(DISTINCT iap.purchase_type, ', ' ORDER BY iap.purchase_type) as iap_types
FROM apps a
LEFT JOIN in_app_purchases iap ON a.id = iap.app_id
GROUP BY a.id;

-- Add comment for documentation
COMMENT ON TABLE in_app_purchases IS 'Stores in-app purchase options for apps';
COMMENT ON COLUMN apps.has_in_app_purchases IS 'Indicates if the app offers in-app purchases';
COMMENT ON COLUMN apps.pricing_model IS 'The pricing model: FREE, PAID, FREE_WITH_IAP, FREEMIUM, SUBSCRIPTION';
COMMENT ON COLUMN apps.in_app_purchase_summary IS 'Human-readable summary of in-app purchase options'; 