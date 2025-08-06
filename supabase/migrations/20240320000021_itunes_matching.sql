-- iTunes Matching System
-- Track matching attempts and results for MacUpdate apps to Mac App Store

-- Table to track iTunes matching attempts
CREATE TABLE itunes_match_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  developer_name TEXT,
  itunes_response JSONB,
  confidence_score DECIMAL(5,4),
  status TEXT CHECK (status IN ('pending', 'found', 'failed', 'confirmed', 'rejected')) DEFAULT 'pending',
  mas_id TEXT,
  mas_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_itunes_match_attempts_app_id ON itunes_match_attempts(app_id);
CREATE INDEX idx_itunes_match_attempts_status ON itunes_match_attempts(status);
CREATE INDEX idx_itunes_match_attempts_created_at ON itunes_match_attempts(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_itunes_match_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_itunes_match_attempts_updated_at
  BEFORE UPDATE ON itunes_match_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_itunes_match_attempts_updated_at();

-- View to see matching results
CREATE VIEW itunes_matching_results AS
SELECT 
  ima.id,
  ima.app_id,
  a.name as app_name,
  a.developer as app_developer,
  ima.search_term,
  ima.developer_name,
  ima.confidence_score,
  ima.status,
  ima.mas_id,
  ima.mas_url,
  ima.error_message,
  ima.created_at,
  ima.updated_at,
  CASE 
    WHEN ima.status = 'confirmed' THEN '✅ Matched'
    WHEN ima.status = 'found' THEN '🔍 Found (Pending)'
    WHEN ima.status = 'failed' THEN '❌ Failed'
    WHEN ima.status = 'rejected' THEN '❌ Rejected'
    ELSE '⏳ Pending'
  END as status_display
FROM itunes_match_attempts ima
JOIN apps a ON ima.app_id = a.id
ORDER BY ima.created_at DESC;

-- Function to get matching statistics
CREATE OR REPLACE FUNCTION get_itunes_matching_stats()
RETURNS TABLE(
  total_attempts BIGINT,
  found_matches BIGINT,
  confirmed_matches BIGINT,
  failed_attempts BIGINT,
  pending_attempts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE status = 'found') as found_matches,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_matches,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_attempts,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_attempts
  FROM itunes_match_attempts;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE itunes_match_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for testing)
CREATE POLICY "Allow public read access for itunes_match_attempts"
  ON itunes_match_attempts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access for itunes_match_attempts"
  ON itunes_match_attempts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access for itunes_match_attempts"
  ON itunes_match_attempts FOR UPDATE
  TO anon
  USING (true); 